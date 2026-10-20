const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const ORIGIN = process.env.SMOKE_ORIGIN || 'http://localhost:5500';
const EXPECT_GEO = process.env.SMOKE_GEO === 'none' ? 'none' : 'mock-b';

let passed = 0;
let failed = 0;

function check(name, condition, note = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}${note ? ` (${note})` : ''}`);
  } else {
    failed += 1;
    console.log(`FAIL ${name}${note ? ` (${note})` : ''}`);
  }
}

async function request(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

async function main() {
  const stamp = Date.now();
  const emailA = `owner-a-${stamp}@example.com`;
  const emailB = `owner-b-${stamp}@example.com`;
  const password = 'correct-horse-battery';

  const noAuth = await request('POST', '/api/widgets', {
    body: { type: 'signup', title: 'Nope' },
  });
  check('unauthenticated widget create rejected', noAuth.status === 401, `status ${noAuth.status}`);

  const regA = await request('POST', '/api/auth/register', { body: { email: emailA, password } });
  check('register tenant A', regA.status === 201 && Boolean(regA.data.token), `status ${regA.status}`);
  const regB = await request('POST', '/api/auth/register', { body: { email: emailB, password } });
  check('register tenant B', regB.status === 201 && Boolean(regB.data.token), `status ${regB.status}`);

  const duplicate = await request('POST', '/api/auth/register', { body: { email: emailA, password } });
  check('duplicate email rejected', duplicate.status === 409, `status ${duplicate.status}`);

  const tokenA = regA.data.token;
  const tokenB = regB.data.token;

  const me = await request('GET', '/api/auth/me', { token: tokenA });
  check('GET /me with token', me.status === 200 && me.data.user.email === emailA, `status ${me.status}`);

  const created = await request('POST', '/api/widgets', {
    token: tokenA,
    body: {
      type: 'signup',
      title: 'Newsletter',
      description: 'Get the weekly digest',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: false, maxLength: 80 },
        { name: 'email', label: 'Email', type: 'email', required: true, maxLength: 254 },
      ],
      buttonText: 'Join',
      display: { position: 'bottom-right', trigger: 'delay', delaySeconds: 3 },
    },
  });
  check('create widget', created.status === 201 && Boolean(created.data.widget.id), `status ${created.status}`);

  const widget = created.data.widget;
  const snippet = created.data.snippet;
  check(
    'snippet generated',
    typeof snippet === 'string' && snippet.includes(`id=${widget.id}`) && snippet.includes('widget.js'),
    snippet,
  );

  const crossRead = await request('GET', `/api/widgets/${widget.id}`, { token: tokenB });
  check('tenant B cannot read A widget', crossRead.status === 404, `status ${crossRead.status}`);

  const crossPatch = await request('PATCH', `/api/widgets/${widget.id}`, {
    token: tokenB,
    body: { title: 'Hijacked' },
  });
  check('tenant B cannot patch A widget', crossPatch.status === 404, `status ${crossPatch.status}`);

  const crossDelete = await request('DELETE', `/api/widgets/${widget.id}`, { token: tokenB });
  check('tenant B cannot delete A widget', crossDelete.status === 404, `status ${crossDelete.status}`);

  const ownList = await request('GET', '/api/widgets', { token: tokenA });
  check(
    'tenant A sees own widget',
    ownList.status === 200 && ownList.data.widgets.some((item) => item.id === widget.id),
    `count ${ownList.data.widgets?.length}`,
  );

  const patched = await request('PATCH', `/api/widgets/${widget.id}`, {
    token: tokenA,
    body: { title: 'Newsletter 2' },
  });
  check(
    'owner can update widget',
    patched.status === 200 && patched.data.widget.title === 'Newsletter 2',
    `status ${patched.status}`,
  );

  const disposable = await request('POST', '/api/widgets', {
    token: tokenA,
    body: { type: 'cta', title: 'Disposable' },
  });
  const deleted = await request('DELETE', `/api/widgets/${disposable.data.widget.id}`, {
    token: tokenA,
  });
  check('owner can delete widget', deleted.status === 204, `status ${deleted.status}`);

  const preflight = await fetch(`${BASE}/submissions`, {
    method: 'OPTIONS',
    headers: {
      origin: ORIGIN,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  check('CORS preflight 204', preflight.status === 204, `status ${preflight.status}`);
  check(
    'CORS allow-origin header',
    preflight.headers.get('access-control-allow-origin') === '*',
    String(preflight.headers.get('access-control-allow-origin')),
  );
  check(
    'CORS allow-methods include POST',
    (preflight.headers.get('access-control-allow-methods') || '').includes('POST'),
    String(preflight.headers.get('access-control-allow-methods')),
  );

  const valid = await request('POST', '/submissions', {
    headers: { origin: ORIGIN },
    body: { widgetId: widget.id, fields: { name: 'Ada', email: 'ada@example.com' }, hp: '' },
  });
  check(
    'cross-origin submission created',
    valid.status === 201 && Boolean(valid.data.submissionId),
    `status ${valid.status}`,
  );
  check(
    'CORS header on submission response',
    valid.headers.get('access-control-allow-origin') === '*',
    String(valid.headers.get('access-control-allow-origin')),
  );

  const invalid = await request('POST', '/submissions', {
    headers: { origin: ORIGIN },
    body: { widgetId: widget.id, fields: { name: 'Ada' }, hp: '' },
  });
  check(
    'missing required field rejected',
    invalid.status === 400 && invalid.data.error.code === 'VALIDATION_ERROR',
    `status ${invalid.status}`,
  );

  const unknownField = await request('POST', '/submissions', {
    headers: { origin: ORIGIN },
    body: { widgetId: widget.id, fields: { name: 'Ada', email: 'ada@example.com', role: 'admin' }, hp: '' },
  });
  check('unknown field rejected', unknownField.status === 400, `status ${unknownField.status}`);

  const oversized = await request('POST', '/submissions', {
    headers: { origin: ORIGIN },
    body: { widgetId: widget.id, fields: { name: 'x'.repeat(20000), email: 'ada@example.com' }, hp: '' },
  });
  check(
    'oversized payload rejected with 413',
    oversized.status === 413 && oversized.data.error.code === 'PAYLOAD_TOO_LARGE',
    `status ${oversized.status}`,
  );

  const spam = await request('POST', '/submissions', {
    headers: { origin: ORIGIN },
    body: { widgetId: widget.id, fields: { name: 'Bot', email: 'bot@example.com' }, hp: 'gotcha' },
  });
  check('honeypot submission answered 201', spam.status === 201 && spam.data.ok === true, `status ${spam.status}`);

  const list = await request('GET', `/api/submissions?widgetId=${widget.id}&includeSpam=true`, {
    token: tokenA,
  });
  const rows = list.data.data || [];
  check('submissions listed for owner', list.status === 200 && rows.length >= 2, `rows ${rows.length}`);

  const stored = rows.find((row) => row.id === valid.data.submissionId);
  check('submission stored and linked to widget', Boolean(stored) && stored.widgetId === widget.id, stored ? `widget ${stored.widgetId}` : 'missing');

  if (EXPECT_GEO === 'none') {
    check('all geo providers down leaves geo empty', Boolean(stored) && stored.geo === null, JSON.stringify(stored?.geo));
  } else {
    check('geo fallback provider B enriched submission', stored?.geo?.provider === EXPECT_GEO, JSON.stringify(stored?.geo));
  }

  const spamRow = rows.find((row) => row.isSpam);
  check('honeypot row flagged as spam', Boolean(spamRow) && spamRow.spamReason === 'honeypot', spamRow?.spamReason || 'missing');

  const crossList = await request('GET', `/api/submissions?widgetId=${widget.id}`, { token: tokenB });
  check(
    'tenant B cannot list A submissions',
    crossList.status === 200 && (crossList.data.data || []).length === 0,
    `rows ${(crossList.data.data || []).length}`,
  );

  const stats = await request('GET', '/api/stats/overview', { token: tokenA });
  check(
    'stats overview totals',
    stats.status === 200 && stats.data.totals.submissions >= 1,
    JSON.stringify(stats.data.totals),
  );
  check(
    'stats per-widget counts',
    Array.isArray(stats.data.perWidget) && stats.data.perWidget.some((item) => item.widgetId === widget.id && item.count >= 1),
    JSON.stringify(stats.data.perWidget),
  );
  if (EXPECT_GEO === 'none') {
    check('stats geo breakdown empty when geo is down', Array.isArray(stats.data.geo) && stats.data.geo.length === 0, JSON.stringify(stats.data.geo));
  } else {
    check(
      'stats geo breakdown',
      Array.isArray(stats.data.geo) && stats.data.geo.some((item) => item.country === 'Testland'),
      JSON.stringify(stats.data.geo),
    );
  }

  const burstWidget = await request('POST', '/api/widgets', {
    token: tokenA,
    body: {
      type: 'cta',
      title: 'Burst target',
      fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
    },
  });
  const burstId = burstWidget.data.widget.id;

  let limited = false;
  let lastStatus = 0;
  for (let i = 0; i < 21; i += 1) {
    const response = await request('POST', '/submissions', {
      headers: { origin: ORIGIN },
      body: { widgetId: burstId, fields: { email: `burst${i}@example.com` }, hp: '' },
    });
    lastStatus = response.status;
    if (response.status === 429) {
      limited = true;
      break;
    }
  }
  check('per-widget rate limit returns 429', limited, `last ${lastStatus}`);

  const stillServing = await request('POST', '/submissions', {
    headers: { origin: ORIGIN },
    body: { widgetId: widget.id, fields: { name: 'Grace', email: 'grace@example.com' }, hp: '' },
  });
  check('legitimate traffic still served', stillServing.status === 201, `status ${stillServing.status}`);

  console.log(`WIDGET_ID ${widget.id}`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
