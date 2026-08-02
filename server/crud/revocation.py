from typing import Optional
import asyncpg

import crud.recipient as recipient_crud


async def create(pool: asyncpg.Pool, recipient_id: int, requested_by: int, reason: str) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO revocation_requests (recipient_id, requested_by, reason)
        VALUES ($1, $2, $3)
        RETURNING request_id, recipient_id, requested_by, reason, status, created_at
        """,
        recipient_id, requested_by, reason,
    )
    return dict(row)


async def find_pending_for_recipient(pool: asyncpg.Pool, recipient_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT request_id FROM revocation_requests WHERE recipient_id = $1 AND status = 'pending'",
        recipient_id,
    )
    return dict(row) if row else None


async def find(pool: asyncpg.Pool, request_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM revocation_requests WHERE request_id = $1",
        request_id,
    )
    return dict(row) if row else None


async def list_pending(pool: asyncpg.Pool) -> list:
    rows = await pool.fetch("""
        SELECT rr.request_id, rr.recipient_id, r.full_name AS recipient_name,
               rr.requested_by, req.administrator_name AS requested_by_name,
               rr.reason, rr.status, rr.created_at
        FROM revocation_requests rr
        JOIN recipients r ON r.recipient_id = rr.recipient_id
        LEFT JOIN administrators req ON req.administrator_id = rr.requested_by
        WHERE rr.status = 'pending'
        ORDER BY rr.created_at ASC
    """)
    return [dict(r) for r in rows]


async def approve(pool: asyncpg.Pool, request_id: int, reviewed_by: int) -> Optional[dict]:
    request = await find(pool, request_id)
    if not request or request["status"] != "pending":
        return None
    await pool.execute(
        "UPDATE revocation_requests SET status = 'approved', reviewed_by = $2, reviewed_at = NOW() WHERE request_id = $1",
        request_id, reviewed_by,
    )
    await recipient_crud.revoke(pool, request["recipient_id"])
    return request


async def deny(pool: asyncpg.Pool, request_id: int, reviewed_by: int) -> Optional[dict]:
    request = await find(pool, request_id)
    if not request or request["status"] != "pending":
        return None
    await pool.execute(
        "UPDATE revocation_requests SET status = 'denied', reviewed_by = $2, reviewed_at = NOW() WHERE request_id = $1",
        request_id, reviewed_by,
    )
    return request
