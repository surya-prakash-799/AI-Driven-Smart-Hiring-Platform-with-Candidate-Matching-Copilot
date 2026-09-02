import base64
import hashlib
import hmac
import json
import secrets
import time

from app.core.config import get_settings

_PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Hash a plaintext password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS
    )
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Verify a plaintext password against a stored `salt$hash` value."""
    try:
        if not password or not stored:
            return False
        salt, expected_hex = stored.split("$", 1)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS
        )
        return hmac.compare_digest(digest.hex(), expected_hex)
    except Exception:
        return False


def _sign(body: bytes) -> str:
    settings = get_settings()
    digest = hmac.new(settings.SECRET_KEY.encode("utf-8"), body, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def create_access_token(user_id: int) -> str:
    """Create an HMAC-signed, expiring access token containing the user id."""
    settings = get_settings()
    payload = {"uid": user_id, "exp": int(time.time()) + settings.TOKEN_TTL_HOURS * 3600}
    body = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).rstrip(b"=")
    signature = _sign(body)
    return f"{body.decode('ascii')}.{signature}"


def decode_access_token(token: str) -> int | None:
    """Validate a token and return its user id, or None if invalid/expired."""
    try:
        body_b64, signature = token.split(".", 1)
        body = body_b64.encode("ascii")
        if not hmac.compare_digest(_sign(body), signature):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body + b"=" * (-len(body) % 4)))
        if int(payload["exp"]) < int(time.time()):
            return None
        return int(payload["uid"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None
