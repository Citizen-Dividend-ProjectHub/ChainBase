from typing import Optional
import asyncpg


async def get(pool: asyncpg.Pool) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM funding_pool ORDER BY pool_id ASC LIMIT 1"
    )
    return dict(row) if row else None


async def update_balance(pool: asyncpg.Pool, balance: float) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        UPDATE funding_pool
        SET balance = $1, last_synced_at = NOW()
        WHERE pool_id = (SELECT pool_id FROM funding_pool ORDER BY pool_id ASC LIMIT 1)
        RETURNING *
        """,
        balance,
    )
    return dict(row) if row else None
