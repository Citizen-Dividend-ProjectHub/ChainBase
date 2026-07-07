const pool = require('./pool');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const migrate = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS administrators (
      administrator_id    SERIAL PRIMARY KEY,
      administrator_name  TEXT UNIQUE NOT NULL,
      password_hash       TEXT NOT NULL,
      administrator_email TEXT UNIQUE NOT NULL,
      created_at          TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipients (
      recipient_id    SERIAL PRIMARY KEY,
      full_name       TEXT NOT NULL,
      password_hash   TEXT NOT NULL,
      recipient_email TEXT UNIQUE NOT NULL,
      is_eligible     BOOLEAN NOT NULL DEFAULT TRUE,
      wallet_address  VARCHAR(42) UNIQUE NOT NULL,
      enrolled_by     INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL,
      enrolled_at     TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at      TIMESTAMP DEFAULT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS disbursement_cycles (
      cycle_id             SERIAL PRIMARY KEY,
      triggered_by         INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL,
      scheduled_date       TIMESTAMP NOT NULL,
      triggered_at         TIMESTAMP DEFAULT NULL,
      amount_per_recipient NUMERIC(12,2) NOT NULL,
      total_recipients     INTEGER NOT NULL DEFAULT 0,
      status               TEXT NOT NULL DEFAULT 'pending'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS disbursements (
      disbursement_id SERIAL PRIMARY KEY,
      cycle_id        INTEGER REFERENCES disbursement_cycles(cycle_id) ON DELETE CASCADE,
      recipient_id    INTEGER REFERENCES recipients(recipient_id) ON DELETE CASCADE,
      status          TEXT NOT NULL DEFAULT 'pending',
      amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
      tx_hash         VARCHAR(66) UNIQUE,
      disbursed_at    TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS funding_pool (
      pool_id        SERIAL PRIMARY KEY,
      balance        NUMERIC(14,2) NOT NULL DEFAULT 0,
      last_synced_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id              SERIAL PRIMARY KEY,
      administrator_id    INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL,
      action_type         TEXT NOT NULL,
      target_recipient_id INTEGER REFERENCES recipients(recipient_id) ON DELETE SET NULL,
      details             TEXT,
      created_at          TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log('Migration complete: all tables ready.');
};

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
