import asyncio
import json

import asyncpg
from fastapi import APIRouter, Depends, Header, HTTPException

import crud.audit_log as audit_log_crud
import crud.identity as identity_crud
import crud.recipient as recipient_crud
from chain.client import get_chain_client
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


async def _handle_registration(pool: asyncpg.Pool, recipient: dict, body: DiditWebhookPayload) -> None:
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


async def _handle_wallet_rotation(pool: asyncpg.Pool, recipient: dict, body: DiditWebhookPayload) -> None:
    internal_status = STATUS_MAP.get(body.status, "declined")

    if internal_status != "approved":
        await recipient_crud.clear_pending_wallet_address(pool, recipient["recipient_id"])
        await audit_log_crud.create(
            pool, None, "wallet_rotation_failed", recipient["recipient_id"],
            f"Wallet rotation reverification ended with status '{body.status}'; pending address discarded.",
        )
        return

    old_address = recipient["wallet_address"]
    new_address = recipient["pending_wallet_address"]
    if not new_address:
        return  # defensive: nothing pending, no-op

    try:
        await recipient_crud.apply_wallet_rotation(pool, recipient["recipient_id"])
    except asyncpg.UniqueViolationError:
        await recipient_crud.clear_pending_wallet_address(pool, recipient["recipient_id"])
        await audit_log_crud.create(
            pool, None, "wallet_rotation_failed", recipient["recipient_id"],
            f"Rotation to {new_address} rejected: address claimed by another recipient before this resolved.",
        )
        return

    chain_note = "scheduler disabled (no chain client) — DB updated only"
    try:
        chain = get_chain_client()
        await asyncio.to_thread(chain.revoke, old_address)
        await asyncio.to_thread(chain.enroll, new_address)
        chain_note = "on-chain revoke/enroll succeeded"
    except RuntimeError:
        pass  # get_chain_client() raises this when scheduler_enabled=False — DB is still source of truth
    except Exception as exc:
        chain_note = f"on-chain update failed, will need manual reconciliation: {exc}"

    await audit_log_crud.create(
        pool, None, "wallet_rotation_approved", recipient["recipient_id"],
        f"Wallet updated {old_address} -> {new_address} ({chain_note})",
    )


async def _handle_reverification(pool: asyncpg.Pool, recipient: dict, body: DiditWebhookPayload) -> None:
    internal_status = STATUS_MAP.get(body.status, "declined")
    if internal_status != "approved":
        return  # already-approved recipient; a declined/expired reverification just leaves them as-is
    if not (body.decision and body.decision.id_verifications):
        return  # defensive: nothing to compare

    idv = body.decision.id_verifications[0]
    new_hash = compute_identity_hash(idv.first_name, idv.last_name, idv.date_of_birth)
    new_details = json.dumps(idv.model_dump())

    if new_hash == recipient["identity_hash"]:
        # Same person, same legal data (e.g. a renewed but unchanged ID). Refresh the
        # stored details and stay approved — no incident, no admin involvement.
        await recipient_crud.set_verification_result(
            pool, recipient["recipient_id"], verification_status="approved",
            is_verified=True, is_eligible=True, identity_hash=new_hash, verification_details=new_details,
        )
        return

    await recipient_crud.set_pending_name_change(pool, recipient["recipient_id"], new_hash, new_details)
    await audit_log_crud.create(
        pool, None, "name_change_review_flagged", recipient["recipient_id"],
        "Reverification data no longer matches stored identity_hash; routed to admin review.",
    )


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

    purpose = recipient.get("didit_session_purpose") or "registration"
    if purpose == "wallet_rotation":
        await _handle_wallet_rotation(pool, recipient, body)
    elif purpose == "reverification":
        await _handle_reverification(pool, recipient, body)
    else:
        await _handle_registration(pool, recipient, body)

    return {"status": "ok"}
