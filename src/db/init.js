const fs = require('node:fs');
const path = require('node:path');
const pool = require('./pool');

async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = initSchema;
