const pool = require('./pool');

async function createUser(email, passwordHash) {
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') return null;
    throw err;
  }
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

module.exports = { createUser, findUserByEmail, findUserById };
