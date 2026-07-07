import asyncpg
from typing import Optional
from core.config import settings

_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        host=settings.pghost,
        port=settings.pgport,
        database=settings.pgdatabase,
        user=settings.pguser or None,
        password=settings.pgpassword or None,
    )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized.")
    return _pool
