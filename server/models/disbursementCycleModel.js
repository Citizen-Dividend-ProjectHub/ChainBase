const pool = require('../db/pool');

module.exports.create = async (scheduled_date, amount_per_recipient, total_recipients) => {
  const query = `
    INSERT INTO disbursement_cycles (scheduled_date, amount_per_recipient, total_recipients)
    VALUES ($1, $2, $3)
    RETURNING cycle_id, scheduled_date, amount_per_recipient, total_recipients, status
  `;
  const { rows } = await pool.query(query, [scheduled_date, amount_per_recipient, total_recipients]);
  return rows[0];
};

module.exports.find = async (cycle_id) => {
  const query = 'SELECT * FROM disbursement_cycles WHERE cycle_id = $1';
  const { rows } = await pool.query(query, [cycle_id]);
  return rows[0] || null;
};

module.exports.listAll = async (status = null) => {
  if (status) {
    const query = `
      SELECT cycle_id, scheduled_date, triggered_at, amount_per_recipient, total_recipients, status
      FROM disbursement_cycles WHERE status = $1 ORDER BY cycle_id ASC
    `;
    const { rows } = await pool.query(query, [status]);
    return rows;
  }
  const query = `
    SELECT cycle_id, scheduled_date, triggered_at, amount_per_recipient, total_recipients, status
    FROM disbursement_cycles ORDER BY cycle_id ASC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

module.exports.trigger = async (cycle_id, administrator_id, total_recipients) => {
  const query = `
    UPDATE disbursement_cycles
    SET status = 'processing', triggered_at = NOW(), triggered_by = $2, total_recipients = $3
    WHERE cycle_id = $1
    RETURNING cycle_id, status, triggered_at
  `;
  const { rows } = await pool.query(query, [cycle_id, administrator_id, total_recipients]);
  return rows[0] || null;
};

module.exports.updateStatus = async (cycle_id, status) => {
  const query = `
    UPDATE disbursement_cycles SET status = $2 WHERE cycle_id = $1
    RETURNING *
  `;
  const { rows } = await pool.query(query, [cycle_id, status]);
  return rows[0] || null;
};
