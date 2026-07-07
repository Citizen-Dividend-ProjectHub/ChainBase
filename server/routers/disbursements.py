import asyncpg
from fastapi import APIRouter, Depends, HTTPException

import crud.disbursement as disbursement_crud
from db.pool import get_pool
from dependencies import get_current_user

router = APIRouter()


@router.get("/{id}")
async def get_disbursement(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    current_user: dict = Depends(get_current_user),
):
    disbursement = await disbursement_crud.find(pool, id)
    if not disbursement:
        raise HTTPException(status_code=404, detail="Disbursement not found.")
    if current_user["role"] == "recipient" and current_user["recipient_id"] != disbursement["recipient_id"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return disbursement
