import hashlib
import hmac
import time

from core.config import settings

REPLAY_WINDOW_SECONDS = 300


def verify_signature(timestamp: str, session_id: str, status: str, webhook_type: str, provided_signature: str) -> bool:
    """Verifies Didit's X-Signature-Simple webhook header.

    Scheme: HMAC-SHA256(secret, "{timestamp}:{session_id}:{status}:{webhook_type}"),
    compared with a timing-safe comparison, plus a replay window on the timestamp.
    """
    if not provided_signature or not settings.didit_webhook_secret:
        return False
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    if abs(time.time() - ts) > REPLAY_WINDOW_SECONDS:
        return False

    message = f"{timestamp}:{session_id}:{status}:{webhook_type}".encode()
    expected = hmac.new(settings.didit_webhook_secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, provided_signature)
