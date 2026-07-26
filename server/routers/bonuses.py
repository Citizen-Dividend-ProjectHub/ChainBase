from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from crud import spending as spending_crud
from db.pool import get_pool
from dependencies import get_current_admin

router = APIRouter()


# ── List bonuses ──────────────────────────────────────────────────────────────
@router.get("")
async def list_bonuses(
    status: str = None,
    pool=Depends(get_pool),
    user=Depends(get_current_admin),
):
    return await spending_crud.list_bonuses(pool, status)


# ── Calculate bonuses for a cycle ─────────────────────────────────────────────
class CalculateRequest(BaseModel):
    cycle_id: int


@router.post("/calculate")
async def calculate_bonuses(
    body: CalculateRequest,
    pool=Depends(get_pool),
    user=Depends(get_current_admin),
):
    created = await spending_crud.calculate_bonuses(pool, body.cycle_id)
    bonuses = await spending_crud.list_bonuses(pool)
    cycle_bonuses = [b for b in bonuses if b["cycle_id"] == body.cycle_id]
    return {
        "message": f"{len(created)} new bonus award(s) created for cycle {body.cycle_id}",
        "bonuses": cycle_bonuses,
    }


# ── Approve a bonus ───────────────────────────────────────────────────────────
@router.patch("/{bonus_id}/approve")
async def approve_bonus(
    bonus_id: int,
    pool=Depends(get_pool),
    user=Depends(get_current_admin),
):
    updated = await spending_crud.update_bonus_status(pool, bonus_id, "approved", user["admin_id"])
    if not updated:
        raise HTTPException(404, "Bonus not found")
    return updated


# ── Deny a bonus ──────────────────────────────────────────────────────────────
@router.patch("/{bonus_id}/deny")
async def deny_bonus(
    bonus_id: int,
    pool=Depends(get_pool),
    user=Depends(get_current_admin),
):
    updated = await spending_crud.update_bonus_status(pool, bonus_id, "denied", user["admin_id"])
    if not updated:
        raise HTTPException(404, "Bonus not found")
    return updated
