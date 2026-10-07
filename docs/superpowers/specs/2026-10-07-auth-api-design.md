# Auth API design

Build the user's `auth-api/` layout with FastAPI. Accept JSON credentials at
`POST /auth/login`, authenticate via RADIUS PAP, and issue a 15-minute HS256 JWT.
`GET /auth/me` returns the authenticated username from a verified token. No
database, roles, door permissions, refresh token, or logout is included yet.

RADIUS host and shared secret remain empty in `.env.example`. The application
starts without them; login returns 503 until configured. JWT signing secret is
also supplied locally, never committed. A missing secret prevents token issuance.
Development mock mode requires explicit opt-in and explicitly configured mock
credentials; it is never a fallback after a RADIUS error.

The RADIUS adapter uses pyrad packets and Python connected UDP sockets (the pyrad
client uses select.poll, unavailable on Windows), UDP auth port 1812, bounded
socket timeout/retries, a minimal dictionary, and Message-Authenticator. It supports PAP only; the RADIUS
team must confirm PAP, register this API host as a client, and provide the host,
port, shared secret and test account. Challenge/MFA is unsupported and fails
closed. A rejection is 401; unavailable/unconfigured backend is 503. HTTP error
responses never reflect credential values.

JWT validation fixes HS256 and requires subject, issued-at, expiration, issuer
and audience. Bearer errors are 401. Secrets use Pydantic SecretStr. Validation
errors omit submitted credential values. No CORS origins are enabled by default.
`GET /health` indicates API liveness only, not RADIUS readiness.

Tests exercise JSON login, the real mock adapter, token rejection, missing config,
and the real RADIUS adapter with only network transport replaced. Live RADIUS
integration remains unverified until the team's server is available.
