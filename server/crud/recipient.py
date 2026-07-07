from typing import Optional
import asyncpg
from core.security import hash_password, verify_password


async def create(
    pool: asyncpg.Pool,
    full_name: str,
    password: str,
    recipient_email: str,
    wallet_address: str,
    enrolled_by: Optional[int] = None,
) -> dict:
    password_hash = hash_password(password)
    row = await pool.fetchrow(
        """
        INSERT INTO recipients (full_name, password_hash, recipient_email, wallet_address, enrolled_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at
        """,
        full_name, password_hash, recipient_email, wallet_address, enrolled_by,
    )
    return dict(row)


async def find(pool: asyncpg.Pool, recipient_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        SELECT recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at, revoked_at
        FROM recipients WHERE recipient_id = $1
        """,
        recipient_id,
    )
    return dict(row) if row else None


async def find_by_email(pool: asyncpg.Pool, recipient_email: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM recipients WHERE recipient_email = $1",
        recipient_email,
    )
    return dict(row) if row else None


async def list_all(pool: asyncpg.Pool, is_eligible: Optional[bool] = None) -> list:
    if is_eligible is not None:
        rows = await pool.fetch(
            """
            SELECT recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at
            FROM recipients WHERE is_eligible = $1 ORDER BY recipient_id ASC
            """,
            is_eligible,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at
            FROM recipients ORDER BY recipient_id ASC
            """
        )
    return [dict(r) for r in rows]


async def list_eligible(pool: asyncpg.Pool) -> list:
    rows = await pool.fetch(
        "SELECT recipient_id, full_name, wallet_address FROM recipients WHERE is_eligible = TRUE"
    )
    return [dict(r) for r in rows]


async def revoke(pool: asyncpg.Pool, recipient_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        UPDATE recipients SET is_eligible = FALSE, revoked_at = NOW()
        WHERE recipient_id = $1
        RETURNING recipient_id, is_eligible, revoked_at
        """,
        recipient_id,
    )
    return dict(row) if row else None


async def reinstate(pool: asyncpg.Pool, recipient_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        UPDATE recipients SET is_eligible = TRUE, revoked_at = NULL
        WHERE recipient_id = $1
        RETURNING recipient_id, is_eligible, revoked_at
        """,
        recipient_id,
    )
    return dict(row) if row else None


async def validate_password(pool: asyncpg.Pool, recipient_email: str, password: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM recipients WHERE recipient_email = $1",
        recipient_email,
    )
    if not row:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return {"recipient_id": row["recipient_id"], "full_name": row["full_name"]}
