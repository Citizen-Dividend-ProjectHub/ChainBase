from typing import Optional
import httpx

from core.config import settings


class DiditError(Exception):
    pass


async def create_verification_session(
    recipient_id: int,
    *,
    workflow_id: Optional[str] = None,
    reference_session_id: Optional[str] = None,
) -> dict:
    """Creates a Didit hosted verification session for a recipient.

    workflow_id overrides settings.didit_workflow_id (used for the lightweight
    wallet-rotation reverification workflow). reference_session_id points Face
    Match 1:1 at a prior approved session's trusted face, used by both the
    wallet-rotation and legal-name-change reverification flows.

    Returns {"session_id": ..., "verification_url": ...}. Raises DiditError
    if verification isn't enabled or the API call fails.
    """
    if not settings.didit_enabled:
        raise DiditError("Didit verification is disabled.")

    payload = {
        "workflow_id": workflow_id or settings.didit_workflow_id,
        "vendor_data": str(recipient_id),
    }
    if reference_session_id:
        # TODO: confirm this wire field against live docs.didit.me / a sandbox
        # call before relying on it — Didit's docs describe referencing "a
        # previous verification" for Face Match 1:1 but the exact session-
        # creation parameter name isn't confirmed from available docs.
        payload["reference_session_id"] = reference_session_id

    async with httpx.AsyncClient(base_url=settings.didit_base_url, timeout=10.0) as client:
        try:
            resp = await client.post(
                "/v3/session/",
                headers={"x-api-key": settings.didit_api_key},
                json=payload,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise DiditError(str(exc)) from exc

        data = resp.json()
        verification_url = data.get("verification_url") or data.get("url")
        if not data.get("session_id") or not verification_url:
            raise DiditError(f"Unexpected Didit session response shape: {data}")
        return {"session_id": data["session_id"], "verification_url": verification_url}
