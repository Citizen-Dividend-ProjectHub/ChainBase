import secrets
from typing import Optional
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

import crud.recipient as recipient_crud
import crud.disbursement as disbursement_crud
import crud.audit_log as audit_log_crud
from db.pool import get_pool
from dependencies import get_current_admin, get_current_user
from schemas.recipient import EnrollRecipientRequest
from utils import WALLET_RE

router = APIRouter()


@router.get("")
async def list_recipients(
    is_eligible: Optional[bool] = Query(default=None),
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    return await recipient_crud.list_all(pool, is_eligible)


@router.get("/{id}")
async def get_recipient(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    current_user: dict = Depends(get_current_user),
):
    recipient = await recipient_crud.find(pool, id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if current_user["role"] == "recipient" and current_user["recipient_id"] != recipient["recipient_id"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return recipient


@router.post("", status_code=201)
async def enroll_recipient(
    body: EnrollRecipientRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    admin: dict = Depends(get_current_admin),
):
    if not WALLET_RE.match(body.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format.")
    try:
        temp_password = secrets.token_urlsafe(12)
        recipient = await recipient_crud.create(
            pool, body.full_name, temp_password, body.recipient_email, body.wallet_address, admin["admin_id"]
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Email or wallet address already exists.")
    await audit_log_crud.create(pool, admin["admin_id"], "enroll_recipient", recipient["recipient_id"], f"Enrolled {body.full_name}")
    return recipient


@router.patch("/{id}/revoke")
async def revoke_recipient(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    admin: dict = Depends(get_current_admin),
):
    recipient = await recipient_crud.find(pool, id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    updated = await recipient_crud.revoke(pool, id)
    await audit_log_crud.create(pool, admin["admin_id"], "revoke_recipient", id, f"Revoked {recipient['full_name']}")
    return updated


@router.patch("/{id}/reinstate")
async def reinstate_recipient(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    admin: dict = Depends(get_current_admin),
):
    recipient = await recipient_crud.find(pool, id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    updated = await recipient_crud.reinstate(pool, id)
    await audit_log_crud.create(pool, admin["admin_id"], "reinstate_recipient", id, f"Reinstated {recipient['full_name']}")
    return updated


@router.get("/{id}/disbursements")
async def list_disbursements_by_recipient(
    id: int,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    pool: asyncpg.Pool = Depends(get_pool),
    current_user: dict = Depends(get_current_user),
):
    recipient = await recipient_crud.find(pool, id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if current_user["role"] == "recipient" and current_user["recipient_id"] != recipient["recipient_id"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return await disbursement_crud.list_by_recipient(pool, id, limit, offset)
