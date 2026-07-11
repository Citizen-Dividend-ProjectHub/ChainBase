import asyncio
import asyncpg
import os
from datetime import datetime
from dotenv import load_dotenv
import bcrypt

load_dotenv()


async def seed() -> None:
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
        # Clear existing data so the seed is always reproducible
        await conn.execute("TRUNCATE audit_log, disbursements, disbursement_cycles, funding_pool, recipients, administrators RESTART IDENTITY CASCADE")

        # ── Admin ──────────────────────────────────────────────────────────────
        admin_hash = bcrypt.hashpw(b"Admin@ChainBase2024!", bcrypt.gensalt()).decode()
        await conn.execute("""
            INSERT INTO administrators (administrator_name, password_hash, administrator_email)
            VALUES ('chainbase_admin', $1, 'admin@chainbase.io')
        """, admin_hash)

        # ── Funding pool ───────────────────────────────────────────────────────
        await conn.execute("INSERT INTO funding_pool (balance) VALUES (73000)")

        admin = await conn.fetchrow(
            "SELECT administrator_id FROM administrators WHERE administrator_name = 'chainbase_admin'"
        )
        admin_id = admin["administrator_id"]

        # ── Recipients ─────────────────────────────────────────────────────────
        recipients_data = [
            ("Jordan Williams",  "jordan.williams@cbtest.com",  b"Jordan_Cb@2024",  "0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2", True),
            ("Maria Santos",     "maria.santos@cbtest.com",     b"Maria_Cb@2024",   "0xB2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3", True),
            ("David Chen",       "david.chen@cbtest.com",       b"David_Cb@2024",   "0xC3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4", True),
            ("Aisha Johnson",    "aisha.johnson@cbtest.com",    b"Aisha_Cb@2024",   "0xD4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5", True),
            ("Marcus Thompson",  "marcus.thompson@cbtest.com",  b"Marcus_Cb@2024",  "0xE5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6", False),
            ("Sofia Rodriguez",  "sofia.rodriguez@cbtest.com",  b"Sofia_Cb@2024",   "0xF6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1", True),
        ]

        recipient_ids = []
        for full_name, email, raw_pw, wallet, eligible in recipients_data:
            pw_hash = bcrypt.hashpw(raw_pw, bcrypt.gensalt()).decode()
            row = await conn.fetchrow("""
                INSERT INTO recipients (full_name, password_hash, recipient_email, wallet_address, is_eligible, enrolled_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING recipient_id, is_eligible
            """, full_name, pw_hash, email, wallet, eligible, admin_id)
            recipient_ids.append((row["recipient_id"], eligible))

        eligible_ids = [rid for rid, elig in recipient_ids if elig]

        # ── Cycle 1 — completed Jan 2024, $1,000/recipient ────────────────────
        c1 = await conn.fetchrow("""
            INSERT INTO disbursement_cycles
                (scheduled_date, amount_per_recipient, total_recipients, status, triggered_by, triggered_at)
            VALUES ('2024-01-15', 1000.00, $1, 'completed', $2, $3)
            RETURNING cycle_id
        """, len(eligible_ids), admin_id, datetime(2024, 1, 15, 9, 0, 0))

        tx_hashes_c1 = [
            "0xabc111def222abc111def222abc111def222abc111def222abc111def222abc1",
            "0xabc222def333abc222def333abc222def333abc222def333abc222def333abc2",
            "0xabc333def444abc333def444abc333def444abc333def444abc333def444abc3",
            "0xabc444def555abc444def555abc444def555abc444def555abc444def555abc4",
            "0xabc555def666abc555def666abc555def666abc555def666abc555def666abc5",
        ]
        for i, rid in enumerate(eligible_ids):
            await conn.execute("""
                INSERT INTO disbursements (cycle_id, recipient_id, amount, status, tx_hash, disbursed_at)
                VALUES ($1, $2, 1000.00, 'confirmed', $3, $4)
            """, c1["cycle_id"], rid, tx_hashes_c1[i] if i < len(tx_hashes_c1) else None, datetime(2024, 1, 15, 10, 0, 0))

        # ── Cycle 2 — completed Apr 2024, $1,200/recipient ────────────────────
        c2 = await conn.fetchrow("""
            INSERT INTO disbursement_cycles
                (scheduled_date, amount_per_recipient, total_recipients, status, triggered_by, triggered_at)
            VALUES ('2024-04-01', 1200.00, $1, 'completed', $2, $3)
            RETURNING cycle_id
        """, len(eligible_ids), admin_id, datetime(2024, 4, 1, 9, 0, 0))

        statuses_c2  = ["confirmed", "confirmed", "confirmed", "pending", "pending"]
        tx_hashes_c2 = [
            "0xdef111abc222def111abc222def111abc222def111abc222def111abc222def1",
            "0xdef222abc333def222abc333def222abc333def222abc333def222abc333def2",
            "0xdef333abc444def333abc444def333abc444def333abc444def333abc444def3",
            None, None,
        ]
        for i, rid in enumerate(eligible_ids):
            status    = statuses_c2[i] if i < len(statuses_c2) else "pending"
            tx        = tx_hashes_c2[i] if i < len(tx_hashes_c2) else None
            disbursed = datetime(2024, 4, 1, 10, 30, 0) if status == "confirmed" else None
            await conn.execute("""
                INSERT INTO disbursements (cycle_id, recipient_id, amount, status, tx_hash, disbursed_at)
                VALUES ($1, $2, 1200.00, $3, $4, $5)
            """, c2["cycle_id"], rid, status, tx, disbursed)

        # ── Cycle 3 — pending Aug 2024, $1,000/recipient ─────────────────────
        await conn.execute("""
            INSERT INTO disbursement_cycles
                (scheduled_date, amount_per_recipient, total_recipients, status)
            VALUES ('2024-08-01', 1000.00, $1, 'pending')
        """, len(eligible_ids))

        print("Seed complete.")
        print()
        print("Admin login:")
        print("  Name:     chainbase_admin")
        print("  Password: Admin@ChainBase2024!")
        print()
        print("Recipient logins:")
        for full_name, email, raw_pw, _, _ in recipients_data:
            print(f"  {full_name:<20} {email:<35} {raw_pw.decode()}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
