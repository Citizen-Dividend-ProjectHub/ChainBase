from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from chain.client import ChainClient
from core.config import settings
from db.pool import get_pool
from scheduler.disbursement_job import run_disbursement_cycle

_scheduler: AsyncIOScheduler | None = None


def start_scheduler(chain: ChainClient) -> None:
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        run_disbursement_cycle,
        trigger=CronTrigger(day=settings.disbursement_cron_day, hour=settings.disbursement_cron_hour),
        args=[get_pool(), chain],
        id="monthly_disbursement_cycle",
    )
    _scheduler.start()


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
