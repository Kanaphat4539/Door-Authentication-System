import hmac
import socket
from io import StringIO

from pyrad.dictionary import Dictionary
from pyrad.packet import AccessAccept, AccessReject, AccessRequest, AuthPacket, PacketError

from app.config import Settings

_DICTIONARY = """ATTRIBUTE User-Name 1 string
ATTRIBUTE User-Password 2 octets
ATTRIBUTE Filter-Id 11 string
ATTRIBUTE Reply-Message 18 string
ATTRIBUTE Class 25 octets
ATTRIBUTE NAS-Identifier 32 string
ATTRIBUTE Message-Authenticator 80 octets
"""


class AuthenticationUnavailable(Exception):
    """The authentication backend cannot complete the request."""


class AuthResult:
    def __init__(self, accepted: bool, role: str | None = None, user_id: str | None = None):
        self.accepted = accepted
        self.role = role
        self.user_id = user_id

    def __bool__(self) -> bool:
        return self.accepted


ROLE_MAP = {
    "STUDENT": "student",
    "PROFESSOR": "teacher",
    "TEACHER": "teacher",
    "ADMIN": "admin",
    "STAFF": "staff",
}


def normalize_role(role: str | None) -> str:
    if not role:
        return "student"
    clean = role.strip()
    return ROLE_MAP.get(clean.upper(), clean.lower())


def _infer_role(username: str) -> str:
    clean = username.strip()
    if clean.isdigit():
        return "student"
    lower = clean.lower()
    if any(lower.startswith(prefix) for prefix in ("prof", "teacher", "dr", "aj")):
        return "teacher"
    if "admin" in lower:
        return "admin"
    if "staff" in lower:
        return "staff"
    return "student"


def _exchange(request: AuthPacket, settings: Settings) -> bytes:
    """Connected UDP limits replies to the configured peer; works on Windows."""
    raw_request = request.RequestPacket()
    addresses = socket.getaddrinfo(
        settings.radius_host, settings.radius_port, type=socket.SOCK_DGRAM,
    )
    family, socktype, protocol, _, address = addresses[0]
    with socket.socket(family, socktype, protocol) as connection:
        connection.settimeout(settings.radius_timeout)
        connection.connect(address)
        for attempt in range(settings.radius_attempts):
            connection.send(raw_request)
            try:
                return connection.recv(4096)
            except TimeoutError:
                if attempt == settings.radius_attempts - 1:
                    raise
    raise TimeoutError()


def authenticate(username: str, password: str, settings: Settings) -> AuthResult:
    if settings.auth_mode == "mock":
        expected_password = settings.mock_password.get_secret_value()
        if not settings.mock_username or not expected_password:
            raise AuthenticationUnavailable("Mock credentials are not configured")
        user_matches = hmac.compare_digest(username.encode(), settings.mock_username.encode())
        password_matches = hmac.compare_digest(password.encode(), expected_password.encode())
        if not (user_matches and password_matches):
            return AuthResult(accepted=False)
        return AuthResult(
            accepted=True,
            role=normalize_role(settings.mock_role or _infer_role(username)),
        )

    secret = settings.radius_secret.get_secret_value()
    if not settings.radius_host.strip() or not secret:
        raise AuthenticationUnavailable("RADIUS is not configured")

    request = AuthPacket(
        code=AccessRequest, secret=secret.encode("utf-8"),
        dict=Dictionary(StringIO(_DICTIONARY)),
    )
    request["User-Name"] = username
    request["User-Password"] = request.PwCrypt(password)
    request["NAS-Identifier"] = settings.radius_nas_identifier
    request.add_message_authenticator()
    try:
        raw_reply = _exchange(request, settings)
        reply = request.CreateReply(packet=raw_reply)
        if not request.VerifyReply(reply, raw_reply):
            raise AuthenticationUnavailable("Invalid RADIUS response")
        if not reply.message_authenticator or not reply.verify_message_authenticator(
            original_authenticator=request.authenticator,
        ):
            raise AuthenticationUnavailable("Invalid RADIUS Message-Authenticator")
    except (OSError, PacketError, ValueError, IndexError) as exc:
        raise AuthenticationUnavailable("RADIUS request failed") from exc

    if reply.code == AccessAccept:
        role = None
        if "Filter-Id" in reply:
            val = reply["Filter-Id"]
            role = val[0] if isinstance(val, list) else val
        elif "Class" in reply:
            val = reply["Class"]
            if isinstance(val, list):
                val = val[0]
            if isinstance(val, bytes):
                val = val.decode("utf-8", errors="ignore")
            role = val
        elif "Reply-Message" in reply:
            val = reply["Reply-Message"]
            val = val[0] if isinstance(val, list) else val
            if str(val).strip().lower() in ("student", "teacher", "professor", "admin", "staff"):
                role = str(val).strip()

        if not role:
            role = _infer_role(username)

        return AuthResult(accepted=True, role=normalize_role(role))
    if reply.code == AccessReject:
        return AuthResult(accepted=False)
    raise AuthenticationUnavailable("Unsupported RADIUS response (challenge/MFA is not implemented)")
