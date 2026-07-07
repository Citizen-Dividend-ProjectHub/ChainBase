const pool = require('../db/pool');

// The funding pool is a singleton row (pool_id = 1).
module.exports.get = async () => {
  const query = 'SELECT * FROM funding_pool ORDER BY pool_id ASC LIMIT 1';
  const { rows } = await pool.query(query);
  return rows[0] || null;
};

module.exports.updateBalance = async (balance) => {
  const query = `
    UPDATE funding_pool SET balance = $1, last_synced_at = NOW()
    WHERE pool_id = (SELECT pool_id FROM funding_pool ORDER BY pool_id ASC LIMIT 1)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [balance]);
  return rows[0] || null;
};
