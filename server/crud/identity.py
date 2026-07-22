from typing import Optional
import asyncpg


async def find_duplicate(pool: asyncpg.Pool, identity_hash: str, exclude_recipient_id: int) -> Optional[dict]:
    """Finds another already-approved recipient sharing this identity_hash —
    signals the same person registered under a second account (Sybil attempt).
    """
    row = await pool.fetchrow(
        """
        SELECT recipient_id, full_name, recipient_email
        FROM recipients
        WHERE identity_hash = $1
          AND recipient_id != $2
          AND verification_status = 'approved'
        LIMIT 1
        """,
        identity_hash, exclude_recipient_id,
    )
    return dict(row) if row else None
