const pool = require('./pool');

function mapSubmission(row) {
  return {
    id: row.id,
    widgetId: row.widget_id,
    payload: row.payload,
    ip: row.ip,
    userAgent: row.user_agent,
    geo: row.geo,
    isSpam: row.is_spam,
    spamReason: row.spam_reason,
    createdAt: row.created_at,
  };
}

async function insertSubmission(data) {
  const { rows } = await pool.query(
    `INSERT INTO submissions (widget_id, owner_id, payload, ip, user_agent, geo, is_spam, spam_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at`,
    [
      data.widgetId,
      data.ownerId,
      JSON.stringify(data.payload),
      data.ip ?? null,
      data.userAgent ?? null,
      data.geo ? JSON.stringify(data.geo) : null,
      data.isSpam,
      data.spamReason ?? null,
    ],
  );
  return { id: rows[0].id, createdAt: rows[0].created_at };
}

function buildFilters(ownerId, { widgetId, from, to, includeSpam }) {
  const conditions = ['owner_id = $1'];
  const values = [ownerId];
  if (widgetId) {
    values.push(widgetId);
    conditions.push(`widget_id = $${values.length}`);
  }
  if (from) {
    values.push(from);
    conditions.push(`created_at >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`created_at < $${values.length}`);
  }
  if (!includeSpam) conditions.push('is_spam = false');
  return { where: conditions.join(' AND '), values };
}

async function listSubmissions(ownerId, options) {
  const { where, values } = buildFilters(ownerId, options);
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const countResult = await pool.query(
    `SELECT count(*)::int AS total FROM submissions WHERE ${where}`,
    values,
  );

  const rowsResult = await pool.query(
    `SELECT id, widget_id, payload, ip, user_agent, geo, is_spam, spam_reason, created_at
     FROM submissions
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, (page - 1) * limit],
  );

  return {
    data: rowsResult.rows.map(mapSubmission),
    meta: { page, limit, total: countResult.rows[0].total },
  };
}

async function statsOverview(ownerId, { from, to }) {
  const conditions = ['s.owner_id = $1', 's.is_spam = false'];
  const values = [ownerId];
  if (from) {
    values.push(from);
    conditions.push(`s.created_at >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`s.created_at < $${values.length}`);
  }
  const where = conditions.join(' AND ');

  const widgetConditions = ['w.owner_id = $1'];
  const widgetValues = [ownerId];
  const joinConditions = ['s.widget_id = w.id', 's.is_spam = false'];
  if (from) {
    widgetValues.push(from);
    joinConditions.push(`s.created_at >= $${widgetValues.length}`);
  }
  if (to) {
    widgetValues.push(to);
    joinConditions.push(`s.created_at < $${widgetValues.length}`);
  }

  const [totals, widgetCount, perWidget, overTime, geo] = await Promise.all([
    pool.query(`SELECT count(*)::int AS submissions FROM submissions s WHERE ${where}`, values),
    pool.query('SELECT count(*)::int AS widgets FROM widgets WHERE owner_id = $1', [ownerId]),
    pool.query(
      `SELECT w.id AS widget_id, w.title, count(s.id)::int AS count
       FROM widgets w
       LEFT JOIN submissions s ON ${joinConditions.join(' AND ')}
       WHERE ${widgetConditions.join(' AND ')}
       GROUP BY w.id, w.title
       ORDER BY count DESC, w.title ASC`,
      widgetValues,
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', s.created_at), 'YYYY-MM-DD') AS date, count(*)::int AS count
       FROM submissions s
       WHERE ${where}
       GROUP BY 1
       ORDER BY 1`,
      values,
    ),
    pool.query(
      `SELECT COALESCE(s.geo->>'country', 'Unknown') AS country, count(*)::int AS count
       FROM submissions s
       WHERE ${where} AND s.geo IS NOT NULL
       GROUP BY 1
       ORDER BY 2 DESC`,
      values,
    ),
  ]);

  return {
    totals: {
      submissions: totals.rows[0].submissions,
      widgets: widgetCount.rows[0].widgets,
    },
    perWidget: perWidget.rows.map((row) => ({
      widgetId: row.widget_id,
      title: row.title,
      count: row.count,
    })),
    overTime: overTime.rows,
    geo: geo.rows,
  };
}

module.exports = { insertSubmission, listSubmissions, statsOverview };
