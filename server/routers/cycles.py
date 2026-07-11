from typing import Optional
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

import crud.cycle as cycle_crud
import crud.disbursement as disbursement_crud
import crud.recipient as recipient_crud
import crud.funding_pool as funding_pool_crud
import crud.audit_log as audit_log_crud
from db.pool import get_pool
from dependencies import get_current_admin
from schemas.cycle import CreateCycleRequest

router = APIRouter()

VALID_STATUSES = {"pending", "processing", "completed", "failed"}


@router.get("")
async def list_cycles(
    status: Optional[str] = Query(default=None),
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    if status and status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status filter.")
    return await cycle_crud.list_all(pool, status)


@router.get("/{id}")
async def get_cycle(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    cycle = await cycle_crud.find(pool, id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")
    disbursements = await disbursement_crud.list_by_cycle(pool, id)
    return {**cycle, "disbursements": disbursements}


@router.get("/{id}/disbursements")
async def list_cycle_disbursements(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    cycle = await cycle_crud.find(pool, id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")
    return await disbursement_crud.list_by_cycle(pool, id)


@router.post("", status_code=201)
async def create_cycle(
    body: CreateCycleRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    eligible = await recipient_crud.list_eligible(pool)
    return await cycle_crud.create(pool, body.scheduled_date, body.amount_per_recipient, len(eligible))


@router.post("/{id}/trigger", status_code=202)
async def trigger_cycle(
    id: int,
    pool: asyncpg.Pool = Depends(get_pool),
    admin: dict = Depends(get_current_admin),
):
    cycle = await cycle_crud.find(pool, id)
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")
    if cycle["status"] != "pending":
        raise HTTPException(status_code=409, detail="Cycle is not in pending status.")

    eligible = await recipient_crud.list_eligible(pool)
    total_cost = len(eligible) * float(cycle["amount_per_recipient"])

    pool_row = await funding_pool_crud.get(pool)
    if not pool_row or float(pool_row["balance"]) < total_cost:
        raise HTTPException(status_code=409, detail="Insufficient funds in the funding pool.")

    triggered = await cycle_crud.trigger(pool, id, admin["admin_id"], len(eligible))
    await disbursement_crud.create_batch(pool, id, eligible, cycle["amount_per_recipient"])
    await audit_log_crud.create(
        pool,
        admin["admin_id"],
        "trigger_disbursement",
        None,
        f"Triggered cycle {id} for {len(eligible)} recipients at {cycle['amount_per_recipient']} each",
    )

    # 202 Accepted — on-chain execution is async; poll GET /api/cycles/:id for status
    return triggered
