const pool = require('../db/pool');

module.exports.createBatch = async (cycle_id, recipients, amount) => {
  if (!recipients.length) return [];
  const values = recipients.map((r, i) => `($1, $${i + 2}, $${recipients.length + i + 2})`).join(', ');
  const amountParams = recipients.map(() => amount);
  const query = `
    INSERT INTO disbursements (cycle_id, recipient_id, amount)
    VALUES ${values}
    RETURNING *
  `;
  const { rows } = await pool.query(query, [cycle_id, ...recipients.map((r) => r.recipient_id), ...amountParams]);
  return rows;
};

module.exports.find = async (disbursement_id) => {
  const query = 'SELECT * FROM disbursements WHERE disbursement_id = $1';
  const { rows } = await pool.query(query, [disbursement_id]);
  return rows[0] || null;
};

module.exports.listByCycle = async (cycle_id) => {
  const query = `
    SELECT disbursement_id, recipient_id, amount, tx_hash, status, disbursed_at
    FROM disbursements WHERE cycle_id = $1 ORDER BY disbursement_id ASC
  `;
  const { rows } = await pool.query(query, [cycle_id]);
  return rows;
};

module.exports.listByRecipient = async (recipient_id, limit = 20, offset = 0) => {
  const query = `
    SELECT disbursement_id, cycle_id, amount, tx_hash, status, disbursed_at
    FROM disbursements WHERE recipient_id = $1
    ORDER BY disbursement_id DESC
    LIMIT $2 OFFSET $3
  `;
  const { rows } = await pool.query(query, [recipient_id, limit, offset]);
  return rows;
};

module.exports.updateStatus = async (disbursement_id, status, tx_hash = null) => {
  const query = `
    UPDATE disbursements
    SET status = $2, tx_hash = $3, disbursed_at = CASE WHEN $2 = 'confirmed' THEN NOW() ELSE disbursed_at END
    WHERE disbursement_id = $1
    RETURNING *
  `;
  const { rows } = await pool.query(query, [disbursement_id, status, tx_hash]);
  return rows[0] || null;
};
