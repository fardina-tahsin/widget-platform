const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const env = require('../config/env');
const users = require('../db/users');
const { signToken, requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { errors } = require('../lib/errors');

const router = express.Router();

const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.string().email().max(254),
);

const credentialsSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(8).max(72),
  })
  .strict();

router.post('/register', validateBody(credentialsSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
    const user = await users.createUser(email, passwordHash);
    if (!user) return next(errors.emailTaken());
    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateBody(credentialsSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await users.findUserByEmail(email);
    if (!user) return next(errors.invalidCredentials());
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) return next(errors.invalidCredentials());
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await users.findUserById(req.user.id);
    if (!user) return next(errors.unauthorized('Account no longer exists'));
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
