const pool = require('../db/pool');

module.exports.create = async (administrator_id, action_type, target_recipient_id = null, details = null) => {
  const query = `
    INSERT INTO audit_log (administrator_id, action_type, target_recipient_id, details)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [administrator_id, action_type, target_recipient_id, details]);
  return rows[0];
};

module.exports.listAll = async (action_type = null, limit = 50, offset = 0) => {
  if (action_type) {
    const query = `
      SELECT log_id, administrator_id, action_type, target_recipient_id, details, created_at
      FROM audit_log WHERE action_type = $1
      ORDER BY log_id DESC LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(query, [action_type, limit, offset]);
    return rows;
  }
  const query = `
    SELECT log_id, administrator_id, action_type, target_recipient_id, details, created_at
    FROM audit_log ORDER BY log_id DESC LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};
