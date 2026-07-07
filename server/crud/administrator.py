from typing import Optional
import asyncpg
from core.security import verify_password


async def find(pool: asyncpg.Pool, administrator_id: int) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT administrator_id, administrator_name, administrator_email, created_at FROM administrators WHERE administrator_id = $1",
        administrator_id,
    )
    return dict(row) if row else None


async def validate_password(pool: asyncpg.Pool, administrator_name: str, password: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM administrators WHERE administrator_name = $1",
        administrator_name,
    )
    if not row:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return {"administrator_id": row["administrator_id"], "administrator_name": row["administrator_name"]}
