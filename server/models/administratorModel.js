const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const SALT_ROUNDS = 7;

module.exports.create = async (administrator_name, password, administrator_email) => {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const query = `
    INSERT INTO administrators (administrator_name, password_hash, administrator_email)
    VALUES ($1, $2, $3)
    RETURNING administrator_id, administrator_name, administrator_email, created_at
  `;
  const { rows } = await pool.query(query, [administrator_name, password_hash, administrator_email]);
  return rows[0];
};

module.exports.find = async (administrator_id) => {
  const query = `
    SELECT administrator_id, administrator_name, administrator_email, created_at
    FROM administrators WHERE administrator_id = $1
  `;
  const { rows } = await pool.query(query, [administrator_id]);
  return rows[0] || null;
};

module.exports.findByName = async (administrator_name) => {
  const query = 'SELECT * FROM administrators WHERE administrator_name = $1';
  const { rows } = await pool.query(query, [administrator_name]);
  return rows[0] || null;
};

module.exports.validatePassword = async (administrator_name, password) => {
  const admin = await module.exports.findByName(administrator_name);
  if (!admin) return null;
  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) return null;
  return {
    administrator_id: admin.administrator_id,
    administrator_name: admin.administrator_name,
  };
};
