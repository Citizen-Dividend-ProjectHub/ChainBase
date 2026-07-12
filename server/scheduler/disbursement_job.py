import asyncio
from datetime import datetime, timezone

import asyncpg

import crud.audit_log as audit_log_crud
import crud.cycle as cycle_crud
import crud.disbursement as disbursement_crud
import crud.recipient as recipient_crud
import crud.funding_pool as funding_pool_crud
from chain.client import ChainClient, to_token_units, from_token_units
from core.config import settings


async def sync_eligibility(chain: ChainClient, recipients: list) -> None:
    """Reconcile the on-chain eligibility registry against the DB before every
    cycle. Each check is a free view call; a transaction is only sent for
    addresses whose on-chain state actually disagrees with the DB.
    """
    for recipient in recipients:
        address = recipient["wallet_address"]
        onchain_eligible = await asyncio.to_thread(chain.is_eligible, address)
        if recipient["is_eligible"] and not onchain_eligible:
            await asyncio.to_thread(chain.enroll, address)
        elif not recipient["is_eligible"] and onchain_eligible:
            await asyncio.to_thread(chain.revoke, address)


async def run_disbursement_cycle(pool: asyncpg.Pool, chain: ChainClient) -> None:
    recipients = await recipient_crud.list_all(pool)
    await sync_eligibility(chain, recipients)

    eligible = [r for r in recipients if r["is_eligible"]]
    if not eligible:
        return

    cycle = await cycle_crud.create(
        pool,
        datetime.now(timezone.utc),
        settings.cycle_amount_per_recipient,
        len(eligible),
    )
    cycle_id = cycle["cycle_id"]

    amount_units = to_token_units(settings.cycle_amount_per_recipient)
    required_units = amount_units * len(eligible)

    pool_balance_units = await asyncio.to_thread(chain.pool_balance)
    if pool_balance_units < required_units:
        await cycle_crud.update_status(pool, cycle_id, "failed")
        await audit_log_crud.create(
            pool, None, "disbursement_cycle_completed", None,
            f"Cycle {cycle_id} failed: insufficient pool balance "
            f"(have {from_token_units(pool_balance_units)}, need {from_token_units(required_units)})",
        )
        return

    await cycle_crud.update_status(pool, cycle_id, "processing")

    addresses = [r["wallet_address"] for r in eligible]
    try:
        receipt, outcomes = await asyncio.to_thread(chain.disburse_batch, cycle_id, addresses, amount_units)
    except Exception as exc:
        await cycle_crud.update_status(pool, cycle_id, "failed")
        await audit_log_crud.create(
            pool, None, "disbursement_cycle_completed", None,
            f"Cycle {cycle_id} failed: {exc}",
        )
        return

    tx_hash = receipt["transactionHash"].hex()
    results = [
        {
            "recipient_id": r["recipient_id"],
            "amount": settings.cycle_amount_per_recipient,
            "status": "confirmed" if outcomes[r["wallet_address"]] else "failed",
            "tx_hash": tx_hash,
        }
        for r in eligible
    ]
    await disbursement_crud.record_cycle_results(pool, cycle_id, results)
    await cycle_crud.update_status(pool, cycle_id, "completed")

    new_balance = await asyncio.to_thread(chain.pool_balance)
    await funding_pool_crud.update_balance(pool, from_token_units(new_balance))

    paid = sum(1 for confirmed in outcomes.values() if confirmed)
    await audit_log_crud.create(
        pool, None, "disbursement_cycle_completed", None,
        f"Cycle {cycle_id}: paid {paid}/{len(eligible)} recipients, tx {tx_hash}",
    )
