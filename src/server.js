const env = require('./config/env');
const initSchema = require('./db/init');
const pool = require('./db/pool');
const createApp = require('./app');

async function main() {
  await initSchema();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`API listening on ${env.publicBaseUrl} (geo mode: ${env.geo.mode})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
