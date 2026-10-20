const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function num(name, fallback) {
  const raw = process.env[name] ?? String(fallback);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num('PORT', 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: num('BCRYPT_ROUNDS', 12),
  corsPublicOrigin: process.env.CORS_PUBLIC_ORIGIN || '*',
  widgetScriptVersion: process.env.WIDGET_SCRIPT_VERSION || 'v1',
  bodyLimitKb: num('BODY_LIMIT_KB', 16),
  rateLimit: {
    ipMax: num('RATE_LIMIT_IP_MAX', 30),
    widgetMax: num('RATE_LIMIT_WIDGET_MAX', 20),
    windowMs: num('RATE_LIMIT_WINDOW_SEC', 60) * 1000,
  },
  geo: {
    mode: process.env.GEO_MODE === 'mock' ? 'mock' : 'real',
    providerAUrl: process.env.GEO_PROVIDER_A_URL || 'http://ip-api.com/json',
    providerBUrl: process.env.GEO_PROVIDER_B_URL || 'https://ipapi.co',
    timeoutMs: num('GEO_TIMEOUT_MS', 1500),
    mockA: process.env.MOCK_GEO_A === 'down' ? 'down' : 'up',
    mockB: process.env.MOCK_GEO_B === 'down' ? 'down' : 'up',
  },
  email: {
    enabled: (process.env.EMAIL_ENABLED || 'true') !== 'false',
    host: process.env.SMTP_HOST || '127.0.0.1',
    port: num('SMTP_PORT', 1025),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'no-reply@widget.local',
  },
};

module.exports = env;
