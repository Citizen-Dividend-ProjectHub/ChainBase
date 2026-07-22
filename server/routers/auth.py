from typing import Optional
import asyncpg
from fastapi import APIRouter, Depends, HTTPException

import crud.administrator as admin_crud
import crud.recipient as recipient_crud
from core.config import settings
from core.security import create_token
from db.pool import get_pool
from dependencies import get_current_recipient, get_optional_user
from didit.client import DiditError, create_verification_session
from schemas.auth import AdminLoginRequest, RecipientLoginRequest, RecipientRegisterRequest
from utils import WALLET_RE

router = APIRouter()


@router.post("/recipient/register", status_code=201)
async def recipient_register(body: RecipientRegisterRequest, pool: asyncpg.Pool = Depends(get_pool)):
    if not WALLET_RE.match(body.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format.")
    existing = await recipient_crud.find_by_email(pool, body.recipient_email)
    if existing:
        raise HTTPException(status_code=409, detail="Email or wallet address already exists.")
    try:
        recipient = await recipient_crud.create(
            pool, body.full_name, body.password, body.recipient_email, body.wallet_address,
            is_eligible=False,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Email or wallet address already exists.")

    verification_url = None
    if settings.didit_enabled:
        try:
            session = await create_verification_session(recipient["recipient_id"])
            await recipient_crud.set_didit_session(pool, recipient["recipient_id"], session["session_id"])
            verification_url = session["verification_url"]
        except DiditError:
            # Recipient row still exists; they can retry via POST /recipient/verification.
            pass

    token = create_token(recipient["recipient_id"], "recipient")
    return {
        "token": token,
        "recipient_id": recipient["recipient_id"],
        "full_name": recipient["full_name"],
        "verification_url": verification_url,
    }


@router.post("/recipient/verification")
async def start_or_resume_verification(
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["verification_status"] == "approved":
        raise HTTPException(status_code=409, detail="Already verified.")
    if not settings.didit_enabled:
        raise HTTPException(status_code=503, detail="Identity verification is not configured.")
    try:
        session = await create_verification_session(recipient["recipient_id"])
    except DiditError:
        raise HTTPException(status_code=502, detail="Could not start verification session. Try again shortly.")
    await recipient_crud.set_didit_session(pool, recipient["recipient_id"], session["session_id"])
    return {"verification_url": session["verification_url"]}


@router.post("/recipient/login")
async def recipient_login(body: RecipientLoginRequest, pool: asyncpg.Pool = Depends(get_pool)):
    recipient = await recipient_crud.validate_password(pool, body.recipient_email, body.password)
    if not recipient:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = create_token(recipient["recipient_id"], "recipient")
    return {"token": token, "recipient_id": recipient["recipient_id"], "full_name": recipient["full_name"]}


@router.post("/admin/login")
async def admin_login(body: AdminLoginRequest, pool: asyncpg.Pool = Depends(get_pool)):
    admin = await admin_crud.validate_password(pool, body.administrator_name, body.password)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = create_token(admin["administrator_id"], "admin")
    return {"token": token, "administrator_id": admin["administrator_id"], "administrator_name": admin["administrator_name"]}


@router.get("/me")
async def get_me(
    pool: asyncpg.Pool = Depends(get_pool),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    if not current_user:
        return None
    if current_user["role"] == "admin":
        admin = await admin_crud.find(pool, current_user["admin_id"])
        return {"role": "admin", **admin}
    recipient = await recipient_crud.find(pool, current_user["recipient_id"])
    return {"role": "recipient", **recipient}
