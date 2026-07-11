from typing import Optional
import asyncpg


async def create(
    pool: asyncpg.Pool,
    administrator_id: int,
    action_type: str,
    target_recipient_id: Optional[int] = None,
    details: Optional[str] = None,
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO audit_log (administrator_id, action_type, target_recipient_id, details)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        administrator_id, action_type, target_recipient_id, details,
    )
    return dict(row)


async def list_all(
    pool: asyncpg.Pool,
    action_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list:
    if action_type:
        rows = await pool.fetch(
            """
            SELECT log_id, administrator_id, action_type, target_recipient_id, details, created_at
            FROM audit_log WHERE action_type = $1
            ORDER BY log_id DESC LIMIT $2 OFFSET $3
            """,
            action_type, limit, offset,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT log_id, administrator_id, action_type, target_recipient_id, details, created_at
            FROM audit_log ORDER BY log_id DESC LIMIT $1 OFFSET $2
            """,
            limit, offset,
        )
    return [dict(r) for r in rows]
