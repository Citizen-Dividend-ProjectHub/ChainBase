from datetime import datetime
import asyncpg


def current_period() -> str:
    now = datetime.utcnow()
    return f"{now.year}-{now.month:02d}"


def period_from_date(d) -> str:
    if isinstance(d, str):
        d = datetime.fromisoformat(d[:10])
    return f"{d.year}-{d.month:02d}"


# ── Spending behavior ─────────────────────────────────────────────────────────

async def record_transaction(pool: asyncpg.Pool, recipient_id: int, period: str, restricted: bool):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO spending_behavior (recipient_id, period, restricted_purchase_count, total_transaction_count)
            VALUES ($1, $2, $3, 1)
            ON CONFLICT (recipient_id, period) DO UPDATE SET
                restricted_purchase_count = spending_behavior.restricted_purchase_count + $3,
                total_transaction_count   = spending_behavior.total_transaction_count + 1,
                updated_at                = NOW()
        """, recipient_id, period, 1 if restricted else 0)


async def list_spending(pool: asyncpg.Pool, period: str) -> list:
    rows = await pool.fetch("""
        SELECT s.behavior_id, s.recipient_id, r.full_name, r.is_eligible,
               s.period, s.restricted_purchase_count, s.total_transaction_count, s.updated_at
        FROM spending_behavior s
        JOIN recipients r USING (recipient_id)
        WHERE s.period = $1
        ORDER BY s.restricted_purchase_count ASC, r.full_name ASC
    """, period)
    return [dict(r) for r in rows]


async def get_spending_for_recipient(pool: asyncpg.Pool, recipient_id: int, period: str):
    row = await pool.fetchrow(
        "SELECT * FROM spending_behavior WHERE recipient_id = $1 AND period = $2",
        recipient_id, period,
    )
    return dict(row) if row else None


async def get_balance(pool: asyncpg.Pool, recipient_id: int) -> float:
    row = await pool.fetchrow(
        "SELECT balance FROM recipients WHERE recipient_id = $1", recipient_id
    )
    return float(row["balance"]) if row else 0.0


async def record_purchase(
    pool: asyncpg.Pool, recipient_id: int, period: str, restricted: bool, amount: float
) -> dict | None:
    """Atomically deduct balance and record spending. Returns new balance or None if insufficient."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT balance FROM recipients WHERE recipient_id = $1 FOR UPDATE",
                recipient_id,
            )
            if not row or float(row["balance"]) < amount:
                return None

            new_balance = float(row["balance"]) - amount
            await conn.execute(
                "UPDATE recipients SET balance = $1 WHERE recipient_id = $2",
                new_balance, recipient_id,
            )
            await conn.execute("""
                INSERT INTO spending_behavior (recipient_id, period, restricted_purchase_count, total_transaction_count)
                VALUES ($1, $2, $3, 1)
                ON CONFLICT (recipient_id, period) DO UPDATE SET
                    restricted_purchase_count = spending_behavior.restricted_purchase_count + $3,
                    total_transaction_count   = spending_behavior.total_transaction_count + 1,
                    updated_at                = NOW()
            """, recipient_id, period, 1 if restricted else 0)

            return {"new_balance": new_balance}


async def get_recipient_by_cardholder(pool: asyncpg.Pool, cardholder_id: str):
    row = await pool.fetchrow(
        "SELECT recipient_id FROM recipients WHERE stripe_cardholder_id = $1",
        cardholder_id,
    )
    return dict(row) if row else None


# ── Bonus awards ──────────────────────────────────────────────────────────────

async def calculate_bonuses(pool: asyncpg.Pool, cycle_id: int) -> list:
    cycle = await pool.fetchrow(
        "SELECT cycle_id, scheduled_date, amount_per_recipient FROM disbursement_cycles WHERE cycle_id = $1",
        cycle_id,
    )
    if not cycle:
        return []

    period = period_from_date(cycle["scheduled_date"])
    bonus_amount = float(cycle["amount_per_recipient"]) * 0.10

    eligible = await pool.fetch(
        "SELECT recipient_id FROM recipients WHERE is_eligible = TRUE"
    )

    created = []
    async with pool.acquire() as conn:
        for row in eligible:
            rid = row["recipient_id"]
            behavior = await conn.fetchrow(
                "SELECT restricted_purchase_count FROM spending_behavior WHERE recipient_id = $1 AND period = $2",
                rid, period,
            )
            if behavior and behavior["restricted_purchase_count"] > 0:
                continue

            try:
                result = await conn.fetchrow("""
                    INSERT INTO bonus_awards (recipient_id, cycle_id, period, amount)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (recipient_id, cycle_id) DO NOTHING
                    RETURNING bonus_id
                """, rid, cycle_id, period, bonus_amount)
                if result:
                    created.append(rid)
            except Exception:
                pass

    return created


async def list_bonuses(pool: asyncpg.Pool, status: str = None) -> list:
    query = """
        SELECT b.bonus_id, b.recipient_id, r.full_name, b.cycle_id,
               b.period, b.amount, b.status, b.reviewed_at,
               a.administrator_name AS reviewed_by_name,
               b.created_at,
               s.restricted_purchase_count, s.total_transaction_count
        FROM bonus_awards b
        JOIN recipients r USING (recipient_id)
        LEFT JOIN administrators a ON a.administrator_id = b.reviewed_by
        LEFT JOIN spending_behavior s ON s.recipient_id = b.recipient_id AND s.period = b.period
    """
    if status:
        rows = await pool.fetch(query + " WHERE b.status = $1 ORDER BY b.created_at DESC", status)
    else:
        rows = await pool.fetch(query + " ORDER BY b.created_at DESC")
    return [dict(r) for r in rows]


async def update_bonus_status(
    pool: asyncpg.Pool, bonus_id: int, status: str, admin_id: int
) -> dict | None:
    row = await pool.fetchrow("""
        UPDATE bonus_awards
        SET status = $2, reviewed_by = $3, reviewed_at = NOW()
        WHERE bonus_id = $1
        RETURNING *
    """, bonus_id, status, admin_id)
    return dict(row) if row else None
