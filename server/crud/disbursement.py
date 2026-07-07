from typing import Optional
import asyncpg


async def create_batch(pool: asyncpg.Pool, cycle_id: int, recipients: list, amount: float) -> list:
    rows = []
    async with pool.acquire() as conn:
        async with conn.transaction():
            for recipient in recipients:
                row = await conn.fetchrow(
                    """
                    INSERT INTO disbursements (cycle_id, recipient_id, amount)
                    VALUES ($1, $2, $3)
                    RETURNING *
                    """,
                    cycle_id, recipient["recipient_id"], amount,
                )
                rows.append(dict(row))
    return rows


async def find(pool: asyncpg.Pool, disbursement_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM disbursements WHERE disbursement_id = $1",
        disbursement_id,
    )
    return dict(row) if row else None


async def list_by_cycle(pool: asyncpg.Pool, cycle_id: int) -> list:
    rows = await pool.fetch(
        """
        SELECT disbursement_id, recipient_id, amount, tx_hash, status, disbursed_at
        FROM disbursements WHERE cycle_id = $1 ORDER BY disbursement_id ASC
        """,
        cycle_id,
    )
    return [dict(r) for r in rows]


async def list_by_recipient(pool: asyncpg.Pool, recipient_id: int, limit: int = 20, offset: int = 0) -> list:
    rows = await pool.fetch(
        """
        SELECT disbursement_id, cycle_id, amount, tx_hash, status, disbursed_at
        FROM disbursements WHERE recipient_id = $1
        ORDER BY disbursement_id DESC
        LIMIT $2 OFFSET $3
        """,
        recipient_id, limit, offset,
    )
    return [dict(r) for r in rows]


async def update_status(
    pool: asyncpg.Pool,
    disbursement_id: int,
    status: str,
    tx_hash: Optional[str] = None,
) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        UPDATE disbursements
        SET status = $2,
            tx_hash = $3,
            disbursed_at = CASE WHEN $2 = 'confirmed' THEN NOW() ELSE disbursed_at END
        WHERE disbursement_id = $1
        RETURNING *
        """,
        disbursement_id, status, tx_hash,
    )
    return dict(row) if row else None
