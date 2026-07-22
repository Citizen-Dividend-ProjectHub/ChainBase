import httpx

from core.config import settings


class DiditError(Exception):
    pass


async def create_verification_session(recipient_id: int) -> dict:
    """Creates a Didit hosted verification session for a recipient.

    Returns {"session_id": ..., "verification_url": ...}. Raises DiditError
    if verification isn't enabled or the API call fails.
    """
    if not settings.didit_enabled:
        raise DiditError("Didit verification is disabled.")

    async with httpx.AsyncClient(base_url=settings.didit_base_url, timeout=10.0) as client:
        try:
            resp = await client.post(
                "/v3/session/",
                headers={"x-api-key": settings.didit_api_key},
                json={"workflow_id": settings.didit_workflow_id, "vendor_data": str(recipient_id)},
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise DiditError(str(exc)) from exc

        data = resp.json()
        verification_url = data.get("verification_url") or data.get("url")
        if not data.get("session_id") or not verification_url:
            raise DiditError(f"Unexpected Didit session response shape: {data}")
        return {"session_id": data["session_id"], "verification_url": verification_url}
