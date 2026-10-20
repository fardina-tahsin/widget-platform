const env = require('../config/env');

function publicCors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', env.corsPublicOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Retry-After');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

module.exports = publicCors;
