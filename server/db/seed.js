const bcrypt = require('bcrypt');
const pool = require('./pool');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SALT_ROUNDS = 7;

const seed = async () => {
  // Seed one default admin
  const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  await pool.query(`
    INSERT INTO administrators (administrator_name, password_hash, administrator_email)
    VALUES ('admin', $1, 'admin@chainbase.io')
    ON CONFLICT DO NOTHING
  `, [adminHash]);

  // Seed the singleton funding pool row
  await pool.query(`
    INSERT INTO funding_pool (balance)
    VALUES (0)
    ON CONFLICT DO NOTHING
  `);

  // Seed two sample recipients
  const r1Hash = await bcrypt.hash('password1', SALT_ROUNDS);
  const r2Hash = await bcrypt.hash('password2', SALT_ROUNDS);

  const { rows: [admin] } = await pool.query(
    `SELECT administrator_id FROM administrators WHERE administrator_name = 'admin'`
  );

  await pool.query(`
    INSERT INTO recipients (full_name, password_hash, recipient_email, wallet_address, enrolled_by)
    VALUES
      ('Alice Doe', $1, 'alice@example.com', '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', $3),
      ('Bob Smith', $2, 'bob@example.com',   '0x1234567890ABCDEF1234567890ABCDEF12345678', $3)
    ON CONFLICT DO NOTHING
  `, [r1Hash, r2Hash, admin.administrator_id]);

  console.log('Seed complete.');
};

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
