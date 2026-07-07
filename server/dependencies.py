from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.security import decode_token

# Raises 403 automatically if Authorization header is missing
_required_bearer = HTTPBearer()
# Returns None instead of raising if Authorization header is missing
_optional_bearer = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_required_bearer),
) -> dict:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return {"admin_id": int(payload["sub"]), "role": "admin"}


def get_current_recipient(
    credentials: HTTPAuthorizationCredentials = Depends(_required_bearer),
) -> dict:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "recipient":
        raise HTTPException(status_code=401, detail="You must be logged in as a recipient.")
    return {"recipient_id": int(payload["sub"]), "role": "recipient"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_required_bearer),
) -> dict:
    """Accepts either an admin or recipient token. Sets role in the returned dict."""
    payload = decode_token(credentials.credentials)
    role = payload.get("role")
    if role == "admin":
        return {"admin_id": int(payload["sub"]), "role": "admin"}
    if role == "recipient":
        return {"recipient_id": int(payload["sub"]), "role": "recipient"}
    raise HTTPException(status_code=401, detail="Invalid token.")


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
) -> Optional[dict]:
    """Returns None if no token provided — used for /auth/me."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        role = payload.get("role")
        if role == "admin":
            return {"admin_id": int(payload["sub"]), "role": "admin"}
        if role == "recipient":
            return {"recipient_id": int(payload["sub"]), "role": "recipient"}
        return None
    except HTTPException:
        return None
