const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const SALT_ROUNDS = 7;

module.exports.create = async (full_name, password, recipient_email, wallet_address, enrolled_by = null) => {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const query = `
    INSERT INTO recipients (full_name, password_hash, recipient_email, wallet_address, enrolled_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at
  `;
  const { rows } = await pool.query(query, [full_name, password_hash, recipient_email, wallet_address, enrolled_by]);
  return rows[0];
};

module.exports.find = async (recipient_id) => {
  const query = `
    SELECT recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at, revoked_at
    FROM recipients WHERE recipient_id = $1
  `;
  const { rows } = await pool.query(query, [recipient_id]);
  return rows[0] || null;
};

module.exports.findByEmail = async (recipient_email) => {
  const query = 'SELECT * FROM recipients WHERE recipient_email = $1';
  const { rows } = await pool.query(query, [recipient_email]);
  return rows[0] || null;
};

module.exports.listAll = async (is_eligible = null) => {
  if (is_eligible !== null) {
    const query = `
      SELECT recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at
      FROM recipients WHERE is_eligible = $1 ORDER BY recipient_id ASC
    `;
    const { rows } = await pool.query(query, [is_eligible]);
    return rows;
  }
  const query = `
    SELECT recipient_id, full_name, recipient_email, wallet_address, is_eligible, enrolled_at
    FROM recipients ORDER BY recipient_id ASC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

module.exports.listEligible = async () => {
  const query = 'SELECT * FROM recipients WHERE is_eligible = TRUE';
  const { rows } = await pool.query(query);
  return rows;
};

module.exports.revoke = async (recipient_id) => {
  const query = `
    UPDATE recipients SET is_eligible = FALSE, revoked_at = NOW()
    WHERE recipient_id = $1
    RETURNING recipient_id, is_eligible, revoked_at
  `;
  const { rows } = await pool.query(query, [recipient_id]);
  return rows[0] || null;
};

module.exports.reinstate = async (recipient_id) => {
  const query = `
    UPDATE recipients SET is_eligible = TRUE, revoked_at = NULL
    WHERE recipient_id = $1
    RETURNING recipient_id, is_eligible, revoked_at
  `;
  const { rows } = await pool.query(query, [recipient_id]);
  return rows[0] || null;
};

module.exports.validatePassword = async (recipient_email, password) => {
  const recipient = await module.exports.findByEmail(recipient_email);
  if (!recipient) return null;
  const isValid = await bcrypt.compare(password, recipient.password_hash);
  if (!isValid) return null;
  return {
    recipient_id: recipient.recipient_id,
    full_name: recipient.full_name,
  };
};
