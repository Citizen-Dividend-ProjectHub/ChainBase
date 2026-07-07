from typing import Optional
import asyncpg
from fastapi import APIRouter, Depends, Query

import crud.audit_log as audit_log_crud
from db.pool import get_pool
from dependencies import get_current_admin

router = APIRouter()


@router.get("")
async def list_audit_log(
    action_type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    pool: asyncpg.Pool = Depends(get_pool),
    _: dict = Depends(get_current_admin),
):
    return await audit_log_crud.list_all(pool, action_type, limit, offset)
