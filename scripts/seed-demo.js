const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const initSchema = require('../src/db/init');
const pool = require('../src/db/pool');

const WIDGET_ID = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'demo@example.com';
const PASSWORD = 'demo-password-123';

async function main() {
  await initSchema();

  const passwordHash = await bcrypt.hash(PASSWORD, env.bcryptRounds);
  const owner = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, email`,
    [EMAIL, passwordHash],
  );

  await pool.query(
    `INSERT INTO widgets (id, owner_id, type, title, description, fields, button_text, display, status)
     VALUES ($1, $2, 'signup', $3, $4, $5, $6, $7, 'active')
     ON CONFLICT (id) DO UPDATE SET
       owner_id = EXCLUDED.owner_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       fields = EXCLUDED.fields,
       button_text = EXCLUDED.button_text,
       display = EXCLUDED.display,
       status = 'active',
       updated_at = now()`,
    [
      WIDGET_ID,
      owner.rows[0].id,
      'Weekly newsletter',
      'One email, every Friday. No noise.',
      JSON.stringify([
        { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 80 },
        { name: 'email', label: 'Email', type: 'email', required: true, maxLength: 120 },
      ]),
      'Subscribe',
      JSON.stringify({ position: 'bottom-right', trigger: 'delay', delaySeconds: 2 }),
    ],
  );

  console.log(`demo widget: ${WIDGET_ID}`);
  console.log(`snippet: <script src="${env.publicBaseUrl}/widget.js?id=${WIDGET_ID}&v=${env.widgetScriptVersion}" async></script>`);
  console.log(`login: ${EMAIL} / ${PASSWORD}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
