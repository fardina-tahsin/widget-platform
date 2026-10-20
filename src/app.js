const path = require('node:path');
const express = require('express');
const authRoutes = require('./routes/auth.routes');
const widgetRoutes = require('./routes/widgets.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const publicRoutes = require('./routes/public.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
    next();
  });

  app.use(publicRoutes);
  app.use('/api/auth', express.json({ limit: '100kb' }), authRoutes);
  app.use('/api/widgets', express.json({ limit: '100kb' }), widgetRoutes);
  app.use('/api', express.json({ limit: '100kb' }), dashboardRoutes);

  app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
