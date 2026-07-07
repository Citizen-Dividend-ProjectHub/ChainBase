from typing import Optional
from datetime import datetime
import asyncpg


async def create(
    pool: asyncpg.Pool,
    scheduled_date: datetime,
    amount_per_recipient: float,
    total_recipients: int,
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO disbursement_cycles (scheduled_date, amount_per_recipient, total_recipients)
        VALUES ($1, $2, $3)
        RETURNING cycle_id, scheduled_date, amount_per_recipient, total_recipients, status
        """,
        scheduled_date, amount_per_recipient, total_recipients,
    )
    return dict(row)


async def find(pool: asyncpg.Pool, cycle_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM disbursement_cycles WHERE cycle_id = $1",
        cycle_id,
    )
    return dict(row) if row else None


async def list_all(pool: asyncpg.Pool, status: Optional[str] = None) -> list:
    if status:
        rows = await pool.fetch(
            """
            SELECT cycle_id, scheduled_date, triggered_at, amount_per_recipient, total_recipients, status
            FROM disbursement_cycles WHERE status = $1 ORDER BY cycle_id ASC
            """,
            status,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT cycle_id, scheduled_date, triggered_at, amount_per_recipient, total_recipients, status
            FROM disbursement_cycles ORDER BY cycle_id ASC
            """
        )
    return [dict(r) for r in rows]


async def trigger(pool: asyncpg.Pool, cycle_id: int, administrator_id: int, total_recipients: int) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        UPDATE disbursement_cycles
        SET status = 'processing', triggered_at = NOW(), triggered_by = $2, total_recipients = $3
        WHERE cycle_id = $1
        RETURNING cycle_id, status, triggered_at
        """,
        cycle_id, administrator_id, total_recipients,
    )
    return dict(row) if row else None


async def update_status(pool: asyncpg.Pool, cycle_id: int, status: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "UPDATE disbursement_cycles SET status = $2 WHERE cycle_id = $1 RETURNING *",
        cycle_id, status,
    )
    return dict(row) if row else None
