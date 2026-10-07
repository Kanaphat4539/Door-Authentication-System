import hmac
import socket
from io import StringIO

from pyrad.dictionary import Dictionary
from pyrad.packet import AccessAccept, AccessReject, AccessRequest, AuthPacket, PacketError

from app.config import Settings

_DICTIONARY = """ATTRIBUTE User-Name 1 string
ATTRIBUTE User-Password 2 octets
ATTRIBUTE NAS-Identifier 32 string
ATTRIBUTE Message-Authenticator 80 octets
"""


class AuthenticationUnavailable(Exception):
    """The authentication backend cannot complete the request."""


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


def authenticate(username: str, password: str, settings: Settings) -> bool:
    if settings.auth_mode == "mock":
        expected_password = settings.mock_password.get_secret_value()
        if not settings.mock_username or not expected_password:
            raise AuthenticationUnavailable("Mock credentials are not configured")
        user_matches = hmac.compare_digest(username.encode(), settings.mock_username.encode())
        password_matches = hmac.compare_digest(password.encode(), expected_password.encode())
        return user_matches and password_matches

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
        return True
    if reply.code == AccessReject:
        return False
    raise AuthenticationUnavailable("Unsupported RADIUS response (challenge/MFA is not implemented)")
