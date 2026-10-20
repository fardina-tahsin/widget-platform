const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { errors } = require('../lib/errors');

function signToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(errors.unauthorized('Missing bearer token'));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub };
    next();
  } catch {
    next(errors.unauthorized('Invalid or expired token'));
  }
}

module.exports = { signToken, requireAuth };
