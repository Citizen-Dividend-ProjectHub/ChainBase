from typing import Optional
import asyncpg
from core.security import hash_password, verify_password


RECIPIENT_FIELDS = """
    recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at,
    is_verified, verification_status, didit_session_id
"""


async def create(
    pool: asyncpg.Pool,
    full_name: str,
    password: str,
    recipient_email: str,
    wallet_address: str,
    enrolled_by: Optional[int] = None,
    is_eligible: bool = True,
) -> dict:
    """Admin-enrolled recipients (enrolled_by set) are exempt from Didit
    verification — there's no ID document to check and an admin already
    vetted them, so they're created already approved. Self-registered
    recipients (enrolled_by=None) start pending/unverified/ineligible until
    the Didit webhook approves them.
    """
    password_hash = hash_password(password)
    is_verified = enrolled_by is not None
    verification_status = "approved" if is_verified else "pending"
    row = await pool.fetchrow(
        f"""
        INSERT INTO recipients (
            full_name, password_hash, recipient_email, wallet_address, enrolled_by,
            is_eligible, is_verified, verification_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING {RECIPIENT_FIELDS}
        """,
        full_name, password_hash, recipient_email, wallet_address, enrolled_by,
        is_eligible, is_verified, verification_status,
    )
    return dict(row)


async def find(pool: asyncpg.Pool, recipient_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        f"""
        SELECT {RECIPIENT_FIELDS}, revoked_at
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


async def find_by_didit_session(pool: asyncpg.Pool, session_id: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM recipients WHERE didit_session_id = $1",
        session_id,
    )
    return dict(row) if row else None


async def set_didit_session(pool: asyncpg.Pool, recipient_id: int, session_id: str) -> None:
    await pool.execute(
        "UPDATE recipients SET didit_session_id = $2 WHERE recipient_id = $1",
        recipient_id, session_id,
    )


async def set_verification_result(
    pool: asyncpg.Pool,
    recipient_id: int,
    *,
    verification_status: str,
    is_verified: bool,
    is_eligible: bool,
    identity_hash: Optional[str] = None,
    verification_details: Optional[str] = None,
) -> Optional[dict]:
    row = await pool.fetchrow(
        """
        UPDATE recipients
           SET verification_status = $2, is_verified = $3, is_eligible = $4,
               identity_hash = COALESCE($5, identity_hash),
               verification_details = COALESCE($6, verification_details),
               verified_at = CASE WHEN $3 THEN NOW() ELSE verified_at END
         WHERE recipient_id = $1
        RETURNING recipient_id, verification_status, is_verified, is_eligible
        """,
        recipient_id, verification_status, is_verified, is_eligible,
        identity_hash, verification_details,
    )
    return dict(row) if row else None


async def list_all(
    pool: asyncpg.Pool,
    is_eligible: Optional[bool] = None,
    verification_status: Optional[str] = None,
) -> list:
    conditions = []
    params = []
    if is_eligible is not None:
        params.append(is_eligible)
        conditions.append(f"is_eligible = ${len(params)}")
    if verification_status is not None:
        params.append(verification_status)
        conditions.append(f"verification_status = ${len(params)}")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = await pool.fetch(
        f"SELECT {RECIPIENT_FIELDS} FROM recipients {where} ORDER BY recipient_id ASC",
        *params,
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
    """Only reinstates recipients who are admin-enrolled or have passed Didit
    verification — prevents accidentally bypassing KYC for a self-registered
    recipient who never got approved.
    """
    row = await pool.fetchrow(
        """
        UPDATE recipients SET is_eligible = TRUE, revoked_at = NULL
        WHERE recipient_id = $1
          AND (enrolled_by IS NOT NULL OR verification_status = 'approved')
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
