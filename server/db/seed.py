import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()


async def seed() -> None:
    conn = await asyncpg.connect(
        host=os.getenv("PGHOST", "127.0.0.1"),
        port=int(os.getenv("PGPORT", "5432")),
        database=os.getenv("PGDATABASE", "chainbase"),
        user=os.getenv("PGUSER") or None,
        password=os.getenv("PGPASSWORD") or None,
    )
    try:
        admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
        await conn.execute("""
            INSERT INTO administrators (administrator_name, password_hash, administrator_email)
            VALUES ('admin', $1, 'admin@chainbase.io')
            ON CONFLICT DO NOTHING
        """, admin_hash)

        await conn.execute("""
            INSERT INTO funding_pool (balance)
            VALUES (0)
            ON CONFLICT DO NOTHING
        """)

        admin = await conn.fetchrow("SELECT administrator_id FROM administrators WHERE administrator_name = 'admin'")

        r1_hash = bcrypt.hashpw(b"password1", bcrypt.gensalt()).decode()
        r2_hash = bcrypt.hashpw(b"password2", bcrypt.gensalt()).decode()

        await conn.execute("""
            INSERT INTO recipients (full_name, password_hash, recipient_email, wallet_address, enrolled_by)
            VALUES ('Alice Doe', $1, 'alice@example.com', '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', $2)
            ON CONFLICT DO NOTHING
        """, r1_hash, admin["administrator_id"])

        await conn.execute("""
            INSERT INTO recipients (full_name, password_hash, recipient_email, wallet_address, enrolled_by)
            VALUES ('Bob Smith', $1, 'bob@example.com', '0x1234567890ABCDEF1234567890ABCDEF12345678', $2)
            ON CONFLICT DO NOTHING
        """, r2_hash, admin["administrator_id"])

        print("Seed complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
