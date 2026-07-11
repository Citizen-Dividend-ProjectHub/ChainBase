import asyncpg
from fastapi import APIRouter, Depends, HTTPException

import crud.funding_pool as funding_pool_crud
from db.pool import get_pool
from dependencies import get_current_admin
from schemas.funding_pool import UpdateBalanceRequest

router = APIRouter()


@router.get("")
async def get_pool_balance(
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    row = await funding_pool_crud.get(pool)
    if not row:
        raise HTTPException(status_code=404, detail="Funding pool not initialized.")
    return row


@router.patch("")
async def update_balance(
    body: UpdateBalanceRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    updated = await funding_pool_crud.update_balance(pool, body.balance)
    return updated


@router.post("/sync")
async def sync_pool(
    _: dict = Depends(get_current_admin),
):
    # TODO: call smart contract to read on-chain USDC balance, then update
    raise HTTPException(status_code=502, detail="Chain sync not yet implemented.")
