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


async def record_cycle_results(pool: asyncpg.Pool, cycle_id: int, results: list) -> list:
    """Insert one disbursement row per recipient with the on-chain outcome already known.

    Unlike create_batch (which leaves rows 'pending' for a since-superseded
    admin-triggered flow), this is used by the scheduler job once disburseBatch
    has already executed on-chain — every row gets its final status and tx_hash
    (shared across the whole cycle, since disburseBatch is one transaction).
    """
    rows = []
    async with pool.acquire() as conn:
        async with conn.transaction():
            for result in results:
                row = await conn.fetchrow(
                    """
                    INSERT INTO disbursements (cycle_id, recipient_id, amount, status, tx_hash, disbursed_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    RETURNING *
                    """,
                    cycle_id,
                    result["recipient_id"],
                    result["amount"],
                    result["status"],
                    result["tx_hash"],
                )
                rows.append(dict(row))
    return rows


async def find(pool: asyncpg.Pool, disbursement_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM disbursements WHERE disbursement_id = $1",
        disbursement_id,
    )
    return dict(row) if row else None


async def list_all(pool: asyncpg.Pool) -> list:
    rows = await pool.fetch(
        """
        SELECT d.disbursement_id, d.cycle_id, d.recipient_id,
               r.full_name AS recipient_name,
               d.amount, d.tx_hash, d.status, d.disbursed_at
        FROM disbursements d
        JOIN recipients r USING (recipient_id)
        ORDER BY d.disbursement_id DESC
        """,
    )
    return [dict(r) for r in rows]


async def list_by_cycle(pool: asyncpg.Pool, cycle_id: int) -> list:
    rows = await pool.fetch(
        """
        SELECT d.disbursement_id, d.recipient_id,
               r.full_name AS recipient_name,
               d.amount, d.tx_hash, d.status, d.disbursed_at
        FROM disbursements d
        JOIN recipients r USING (recipient_id)
        WHERE d.cycle_id = $1
        ORDER BY d.disbursement_id ASC
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
