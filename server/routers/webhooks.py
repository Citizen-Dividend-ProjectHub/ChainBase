import json

import asyncpg
from fastapi import APIRouter, Depends, Header, HTTPException

import crud.audit_log as audit_log_crud
import crud.identity as identity_crud
import crud.recipient as recipient_crud
from db.pool import get_pool
from didit.identity import compute_identity_hash
from didit.signature import verify_signature
from schemas.didit import DiditWebhookPayload

router = APIRouter()

STATUS_MAP = {
    "Approved": "approved",
    "Declined": "declined",
    "In Review": "in_review",
    "Kyc Expired": "declined",
}


@router.post("/didit", status_code=200)
async def didit_webhook(
    body: DiditWebhookPayload,
    pool: asyncpg.Pool = Depends(get_pool),
    x_signature_simple: str = Header(...),
    x_timestamp: str = Header(...),
):
    if not verify_signature(x_timestamp, body.session_id, body.status, body.webhook_type, x_signature_simple):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    try:
        await pool.execute(
            "INSERT INTO didit_webhook_events (event_id, session_id, status) VALUES ($1, $2, $3)",
            body.event_id, body.session_id, body.status,
        )
    except asyncpg.UniqueViolationError:
        return {"status": "already_processed"}

    recipient = await recipient_crud.find_by_didit_session(pool, body.session_id)
    if not recipient:
        return {"status": "unknown_session"}

    internal_status = STATUS_MAP.get(body.status, "declined")

    if internal_status == "approved" and body.decision and body.decision.id_verifications:
        idv = body.decision.id_verifications[0]
        identity_hash = compute_identity_hash(idv.first_name, idv.last_name, idv.date_of_birth)
        duplicate = await identity_crud.find_duplicate(pool, identity_hash, recipient["recipient_id"])
        details = json.dumps(idv.model_dump())

        if duplicate:
            await recipient_crud.set_verification_result(
                pool, recipient["recipient_id"],
                verification_status="flagged_duplicate", is_verified=False, is_eligible=False,
                identity_hash=identity_hash, verification_details=details,
            )
            await audit_log_crud.create(
                pool, None, "duplicate_identity_flagged", recipient["recipient_id"],
                f"identity_hash collides with recipient #{duplicate['recipient_id']} ({duplicate['full_name']})",
            )
        else:
            await recipient_crud.set_verification_result(
                pool, recipient["recipient_id"],
                verification_status="approved", is_verified=True, is_eligible=True,
                identity_hash=identity_hash, verification_details=details,
            )
    else:
        await recipient_crud.set_verification_result(
            pool, recipient["recipient_id"],
            verification_status=internal_status, is_verified=False, is_eligible=False,
        )

    return {"status": "ok"}
