"""Manually run one disbursement cycle immediately, without waiting for the
monthly cron schedule. Useful for local testing and demos.

Usage (from server/): python -m scripts.run_disbursement_cycle
"""
import asyncio

from chain.client import init_chain_client
from db.pool import init_pool, close_pool, get_pool
from scheduler.disbursement_job import run_disbursement_cycle


async def main() -> None:
    await init_pool()
    chain = init_chain_client()
    try:
        await run_disbursement_cycle(get_pool(), chain)
        print("Disbursement cycle run complete.")
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
