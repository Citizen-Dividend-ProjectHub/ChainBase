import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()


async def migrate() -> None:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        conn = await asyncpg.connect(database_url)
    else:
        conn = await asyncpg.connect(
            host=os.getenv("PGHOST", "127.0.0.1"),
            port=int(os.getenv("PGPORT", "5432")),
            database=os.getenv("PGDATABASE", "chainbase"),
            user=os.getenv("PGUSER") or None,
            password=os.getenv("PGPASSWORD") or None,
        )
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS administrators (
                administrator_id    SERIAL PRIMARY KEY,
                administrator_name  TEXT UNIQUE NOT NULL,
                password_hash       TEXT NOT NULL,
                administrator_email TEXT UNIQUE NOT NULL,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS recipients (
                recipient_id    SERIAL PRIMARY KEY,
                full_name       TEXT NOT NULL,
                password_hash   TEXT NOT NULL,
                recipient_email TEXT UNIQUE NOT NULL,
                is_eligible     BOOLEAN NOT NULL DEFAULT TRUE,
                wallet_address  VARCHAR(42) UNIQUE NOT NULL,
                balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
                enrolled_by     INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL,
                enrolled_at     TIMESTAMP NOT NULL DEFAULT NOW(),
                revoked_at      TIMESTAMP DEFAULT NULL
            )
        """)
        # Add balance to existing tables that were created without it
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) NOT NULL DEFAULT 0
        """)

        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS didit_session_id    TEXT
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS is_verified          BOOLEAN NOT NULL DEFAULT FALSE
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS identity_hash        TEXT
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS verification_details TEXT
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMP
        """)

        await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_didit_session
                ON recipients (didit_session_id) WHERE didit_session_id IS NOT NULL
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_recipients_identity_hash
                ON recipients (identity_hash) WHERE identity_hash IS NOT NULL
        """)

        await conn.execute("""
            UPDATE recipients
               SET is_verified = TRUE, verification_status = 'approved'
             WHERE enrolled_by IS NOT NULL AND verification_status = 'pending'
        """)

        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS didit_session_purpose TEXT NOT NULL DEFAULT 'registration'
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS original_didit_session_id TEXT
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS pending_wallet_address VARCHAR(42)
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS pending_identity_hash TEXT
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS pending_verification_details TEXT
        """)

        await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_pending_wallet_address
                ON recipients (pending_wallet_address) WHERE pending_wallet_address IS NOT NULL
        """)

        await conn.execute("""
            UPDATE recipients
               SET original_didit_session_id = didit_session_id
             WHERE original_didit_session_id IS NULL AND didit_session_id IS NOT NULL
        """)

        await conn.execute("""
            ALTER TABLE recipients ALTER COLUMN wallet_address DROP NOT NULL
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'embedded'
        """)
        try:
            await conn.execute("""
                ALTER TABLE recipients ADD CONSTRAINT recipients_wallet_type_check
                    CHECK (wallet_type IN ('embedded', 'external'))
            """)
        except asyncpg.DuplicateObjectError:
            pass
        await conn.execute("""
            UPDATE recipients SET wallet_type = 'external' WHERE wallet_address IS NOT NULL
        """)

        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS card_requested_at TIMESTAMPTZ
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS card_mailing_address TEXT
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS notify_email_disbursements BOOLEAN NOT NULL DEFAULT true
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS notify_email_verification BOOLEAN NOT NULL DEFAULT true
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS card_locked BOOLEAN NOT NULL DEFAULT false
        """)
        await conn.execute("""
            ALTER TABLE recipients ADD COLUMN IF NOT EXISTS card_reissue_requested_at TIMESTAMPTZ
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS didit_webhook_events (
                event_id    TEXT PRIMARY KEY,
                session_id  TEXT,
                status      TEXT,
                received_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS disbursement_cycles (
                cycle_id             SERIAL PRIMARY KEY,
                triggered_by         TEXT NOT NULL DEFAULT 'scheduler',
                scheduled_date       TIMESTAMP NOT NULL,
                triggered_at         TIMESTAMP DEFAULT NULL,
                amount_per_recipient NUMERIC(12,2) NOT NULL,
                total_recipients     INTEGER NOT NULL DEFAULT 0,
                status               TEXT NOT NULL DEFAULT 'pending'
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS disbursements (
                disbursement_id SERIAL PRIMARY KEY,
                cycle_id        INTEGER REFERENCES disbursement_cycles(cycle_id) ON DELETE CASCADE,
                recipient_id    INTEGER REFERENCES recipients(recipient_id) ON DELETE CASCADE,
                status          TEXT NOT NULL DEFAULT 'pending',
                amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
                tx_hash         VARCHAR(66),
                disbursed_at    TIMESTAMP,
                UNIQUE (tx_hash, recipient_id)
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS funding_pool (
                pool_id        SERIAL PRIMARY KEY,
                balance        NUMERIC(14,2) NOT NULL DEFAULT 0,
                last_synced_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                log_id              SERIAL PRIMARY KEY,
                administrator_id    INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL,
                action_type         TEXT NOT NULL,
                target_recipient_id INTEGER REFERENCES recipients(recipient_id) ON DELETE SET NULL,
                details             TEXT,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS spending_behavior (
                behavior_id               SERIAL PRIMARY KEY,
                recipient_id              INTEGER REFERENCES recipients(recipient_id) ON DELETE CASCADE,
                period                    TEXT NOT NULL,
                restricted_purchase_count INTEGER NOT NULL DEFAULT 0,
                total_transaction_count   INTEGER NOT NULL DEFAULT 0,
                updated_at                TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE (recipient_id, period)
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS bonus_awards (
                bonus_id     SERIAL PRIMARY KEY,
                recipient_id INTEGER REFERENCES recipients(recipient_id) ON DELETE CASCADE,
                cycle_id     INTEGER REFERENCES disbursement_cycles(cycle_id) ON DELETE CASCADE,
                period       TEXT NOT NULL,
                amount       NUMERIC(12,2) NOT NULL,
                status       TEXT NOT NULL DEFAULT 'pending',
                reviewed_by  INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL,
                reviewed_at  TIMESTAMP,
                created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE (recipient_id, cycle_id)
            )
        """)

        print("Migration complete: all tables ready.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
