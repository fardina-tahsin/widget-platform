const pool = require('./pool');

const COLUMNS = 'id, owner_id, type, title, description, fields, button_text, display, status, created_at, updated_at';

function mapWidget(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    type: row.type,
    title: row.title,
    description: row.description,
    fields: row.fields,
    buttonText: row.button_text,
    display: row.display,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createWidget(ownerId, data) {
  const { rows } = await pool.query(
    `INSERT INTO widgets (owner_id, type, title, description, fields, button_text, display)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [
      ownerId,
      data.type,
      data.title,
      data.description ?? null,
      JSON.stringify(data.fields ?? []),
      data.buttonText ?? 'Submit',
      JSON.stringify(data.display ?? {}),
    ],
  );
  return mapWidget(rows[0]);
}

async function listWidgets(ownerId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM widgets WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId],
  );
  return rows.map(mapWidget);
}

async function getWidget(ownerId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM widgets WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  );
  return mapWidget(rows[0]);
}

async function getActiveWidget(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM widgets WHERE id = $1 AND status = 'active'`,
    [id],
  );
  return mapWidget(rows[0]);
}

async function updateWidget(ownerId, id, patch) {
  const columns = {
    title: 'title',
    description: 'description',
    fields: 'fields',
    buttonText: 'button_text',
    display: 'display',
    status: 'status',
  };
  const setters = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;
    const value = key === 'fields' || key === 'display' ? JSON.stringify(patch[key]) : patch[key];
    values.push(value);
    setters.push(`${column} = $${values.length}`);
  }
  if (!setters.length) return getWidget(ownerId, id);
  values.push(id, ownerId);
  const { rows } = await pool.query(
    `UPDATE widgets SET ${setters.join(', ')}, updated_at = now()
     WHERE id = $${values.length - 1} AND owner_id = $${values.length}
     RETURNING ${COLUMNS}`,
    values,
  );
  return mapWidget(rows[0]);
}

async function deleteWidget(ownerId, id) {
  const result = await pool.query(
    'DELETE FROM widgets WHERE id = $1 AND owner_id = $2',
    [id, ownerId],
  );
  return result.rowCount > 0;
}

module.exports = {
  createWidget,
  listWidgets,
  getWidget,
  getActiveWidget,
  updateWidget,
  deleteWidget,
};
