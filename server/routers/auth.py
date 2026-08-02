from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncpg
from fastapi import APIRouter, Depends, HTTPException

import crud.administrator as admin_crud
import crud.recipient as recipient_crud
from core.config import settings
from core.security import create_token, verify_password
from db.pool import get_pool
from dependencies import get_current_admin, get_current_recipient, get_optional_user
from didit.client import DiditError, create_verification_session
from schemas.auth import (
    AdminLoginRequest, ChangePasswordRequest, RecipientLoginRequest, RecipientRegisterRequest,
    RequestCardRequest, SetCardLockRequest, SetWalletRequest, UpdateNotificationPrefsRequest,
    UpdateProfileRequest, WalletRotationRequest,
)
from utils import WALLET_RE
from wallet.jwt import mint_wallet_id_token

router = APIRouter()


@router.post("/recipient/register", status_code=201)
async def recipient_register(body: RecipientRegisterRequest, pool: asyncpg.Pool = Depends(get_pool)):
    existing = await recipient_crud.find_by_email(pool, body.recipient_email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists.")
    try:
        recipient = await recipient_crud.create(
            pool, body.full_name, body.password, body.recipient_email,
            is_eligible=False,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Email already exists.")

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
    if recipient["verification_status"] in ("approved", "name_change_review"):
        raise HTTPException(status_code=409, detail="Already verified or under review.")
    if not settings.didit_enabled:
        raise HTTPException(status_code=503, detail="Identity verification is not configured.")
    try:
        session = await create_verification_session(recipient["recipient_id"])
    except DiditError:
        raise HTTPException(status_code=502, detail="Could not start verification session. Try again shortly.")
    await recipient_crud.set_didit_session(pool, recipient["recipient_id"], session["session_id"])
    return {"verification_url": session["verification_url"]}


@router.delete("/recipient/account", status_code=204)
async def delete_own_account(
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["verification_status"] in ("approved", "name_change_review"):
        raise HTTPException(status_code=409, detail="Verified accounts can't be self-deleted. Contact support.")
    await recipient_crud.delete(pool, current["recipient_id"])


@router.post("/recipient/wallet-token")
async def get_wallet_token(
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["verification_status"] != "approved":
        raise HTTPException(status_code=409, detail="Only verified recipients can provision a wallet.")
    if recipient["wallet_address"] is not None:
        raise HTTPException(status_code=409, detail="Wallet already provisioned.")
    if not settings.wallet_provisioning_enabled:
        raise HTTPException(status_code=503, detail="Wallet provisioning is not configured.")
    return {"wallet_id_token": mint_wallet_id_token(recipient["recipient_email"])}


@router.post("/recipient/wallet")
async def set_wallet(
    body: SetWalletRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    if not WALLET_RE.match(body.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format.")
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["verification_status"] != "approved":
        raise HTTPException(status_code=409, detail="Only verified recipients can set a wallet.")
    if recipient["wallet_address"] is not None:
        raise HTTPException(status_code=409, detail="Wallet already provisioned.")
    try:
        updated = await recipient_crud.set_wallet(pool, current["recipient_id"], body.wallet_address, body.wallet_type)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Wallet address already in use.")
    if not updated:
        raise HTTPException(status_code=409, detail="Wallet already provisioned.")
    return updated


@router.post("/recipient/card")
async def request_card(
    body: RequestCardRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    if not body.mailing_address.strip():
        raise HTTPException(status_code=400, detail="Mailing address is required.")
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["wallet_address"] is None:
        raise HTTPException(status_code=409, detail="A wallet is required before requesting a card.")
    if recipient["card_requested_at"] is not None:
        raise HTTPException(status_code=409, detail="Card already requested.")
    updated = await recipient_crud.request_card(pool, current["recipient_id"], body.mailing_address.strip())
    if not updated:
        raise HTTPException(status_code=409, detail="Card already requested.")
    return updated


REISSUE_COOLDOWN_DAYS = 30


def _reissue_cooldown_active(recipient: dict) -> bool:
    requested_at = recipient.get("card_reissue_requested_at")
    if not requested_at:
        return False
    return datetime.now(timezone.utc) - requested_at < timedelta(days=REISSUE_COOLDOWN_DAYS)


@router.put("/recipient/card/lock")
async def set_card_lock(
    body: SetCardLockRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["card_requested_at"] is None:
        raise HTTPException(status_code=409, detail="You don't have a card yet.")
    if _reissue_cooldown_active(recipient) and not body.locked:
        raise HTTPException(
            status_code=409,
            detail="Your card is locked while a replacement is being processed and can't be unlocked manually.",
        )
    updated = await recipient_crud.set_card_locked(pool, current["recipient_id"], body.locked)
    if not updated:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    return updated


@router.post("/recipient/card/reissue")
async def reissue_card(
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["card_requested_at"] is None:
        raise HTTPException(status_code=409, detail="You don't have a card yet.")
    if _reissue_cooldown_active(recipient):
        next_eligible = recipient["card_reissue_requested_at"] + timedelta(days=REISSUE_COOLDOWN_DAYS)
        raise HTTPException(
            status_code=409,
            detail=f"A new card was already requested recently. You can request another after "
                   f"{next_eligible.date().isoformat()}.",
        )
    updated = await recipient_crud.reissue_card(pool, current["recipient_id"])
    if not updated:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    return updated


@router.patch("/recipient/profile")
async def update_profile(
    body: UpdateProfileRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    if not body.full_name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    updated = await recipient_crud.update_profile(pool, current["recipient_id"], body.full_name.strip())
    if not updated:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    return updated


@router.post("/recipient/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    current_hash = await recipient_crud.get_password_hash(pool, current["recipient_id"])
    if not current_hash or not verify_password(body.current_password, current_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    await recipient_crud.set_password(pool, current["recipient_id"], body.new_password)


@router.post("/admin/change-password", status_code=204)
async def admin_change_password(
    body: ChangePasswordRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_admin),
):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    current_hash = await admin_crud.get_password_hash(pool, current["admin_id"])
    if not current_hash or not verify_password(body.current_password, current_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    await admin_crud.set_password(pool, current["admin_id"], body.new_password)


@router.put("/recipient/notifications")
async def update_notifications(
    body: UpdateNotificationPrefsRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    updated = await recipient_crud.update_notification_prefs(
        pool, current["recipient_id"], body.notify_email_disbursements, body.notify_email_verification,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    return updated


@router.post("/recipient/wallet-rotation")
async def wallet_rotation(
    body: WalletRotationRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    if not WALLET_RE.match(body.new_wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format.")
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["verification_status"] != "approved":
        raise HTTPException(status_code=409, detail="Only verified recipients can rotate their wallet.")
    if await recipient_crud.wallet_address_in_use(pool, body.new_wallet_address, recipient["recipient_id"]):
        raise HTTPException(status_code=409, detail="Wallet address already in use.")
    if not settings.didit_enabled:
        raise HTTPException(status_code=503, detail="Identity verification is not configured.")

    workflow_id = settings.didit_wallet_rotation_workflow_id or settings.didit_workflow_id
    reference = recipient.get("original_didit_session_id") or recipient.get("didit_session_id")
    try:
        session = await create_verification_session(
            recipient["recipient_id"], workflow_id=workflow_id, reference_session_id=reference,
        )
    except DiditError:
        raise HTTPException(status_code=502, detail="Could not start verification session. Try again shortly.")

    await recipient_crud.set_pending_wallet_address(pool, recipient["recipient_id"], body.new_wallet_address)
    await recipient_crud.set_didit_session(
        pool, recipient["recipient_id"], session["session_id"], purpose="wallet_rotation",
    )
    return {"verification_url": session["verification_url"]}


@router.post("/recipient/reverify")
async def reverify_identity(
    pool: asyncpg.Pool = Depends(get_pool),
    current: dict = Depends(get_current_recipient),
):
    recipient = await recipient_crud.find(pool, current["recipient_id"])
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")
    if recipient["verification_status"] != "approved":
        raise HTTPException(status_code=409, detail="Only verified recipients can request reverification.")
    if not settings.didit_enabled:
        raise HTTPException(status_code=503, detail="Identity verification is not configured.")

    reference = recipient.get("original_didit_session_id") or recipient.get("didit_session_id")
    try:
        session = await create_verification_session(recipient["recipient_id"], reference_session_id=reference)
    except DiditError:
        raise HTTPException(status_code=502, detail="Could not start verification session. Try again shortly.")

    await recipient_crud.set_didit_session(
        pool, recipient["recipient_id"], session["session_id"], purpose="reverification",
    )
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
