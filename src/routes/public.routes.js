const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
const env = require('../config/env');
const widgets = require('../db/widgets');
const submissions = require('../db/submissions');
const users = require('../db/users');
const publicCors = require('../middleware/cors');
const { validateBody } = require('../middleware/validate');
const { createRateLimiter } = require('../middleware/rateLimit');
const { errors } = require('../lib/errors');
const { normalizeIp } = require('../lib/ip');
const { UUID_RE } = require('../lib/uuid');
const geoService = require('../services/geoService');
const mailService = require('../services/mailService');
const { validateSubmissionFields } = require('../lib/submissionValidation');

const router = express.Router();
const jsonBody = express.json({ limit: `${env.bodyLimitKb}kb` });
const widgetScript = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'widget.js'), 'utf8');

const ipLimiter = createRateLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.ipMax,
  keyFn: (req) => `ip:${normalizeIp(req.ip)}`,
});

const widgetLimiter = createRateLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.widgetMax,
  keyFn: (req) => (req.widget ? `w:${req.widget.id}` : ''),
});

const submissionSchema = z
  .object({
    widgetId: z.string().uuid(),
    fields: z.record(z.unknown()).default({}),
    hp: z.string().max(200).optional(),
  })
  .strict();

router.options('/widget.js', publicCors);
router.get('/widget.js', publicCors, (req, res) => {
  const immutable = req.query.v === env.widgetScriptVersion;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  res.send(widgetScript);
});

router.options('/widgets/:id/config', publicCors);
router.get('/widgets/:id/config', publicCors, async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) return next(errors.notFound('Widget not found'));
    const widget = await widgets.getActiveWidget(req.params.id);
    if (!widget) return next(errors.notFound('Widget not found'));
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      widget: {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        description: widget.description,
        fields: widget.fields,
        buttonText: widget.buttonText,
        display: widget.display,
      },
      scriptVersion: env.widgetScriptVersion,
    });
  } catch (err) {
    next(err);
  }
});

async function loadWidget(req, res, next) {
  try {
    const widget = await widgets.getActiveWidget(req.body.widgetId);
    if (!widget) return next(errors.notFound('Widget not found'));
    req.widget = widget;
    next();
  } catch (err) {
    next(err);
  }
}

router.options('/submissions', publicCors);

router.post(
  '/submissions',
  publicCors,
  jsonBody,
  ipLimiter,
  validateBody(submissionSchema),
  loadWidget,
  widgetLimiter,
  async (req, res, next) => {
    try {
      const widget = req.widget;
      const validation = validateSubmissionFields(widget.fields, req.body.fields);
      if (!validation.ok) return next(errors.badRequest(validation.details));

      const isSpam = typeof req.body.hp === 'string' && req.body.hp.trim() !== '';
      const ip = normalizeIp(req.ip);
      const geo = isSpam ? null : await geoService.lookup(ip);

      const stored = await submissions.insertSubmission({
        widgetId: widget.id,
        ownerId: widget.ownerId,
        payload: validation.payload,
        ip,
        userAgent: (req.get('user-agent') || '').slice(0, 500),
        geo,
        isSpam,
        spamReason: isSpam ? 'honeypot' : null,
      });

      if (!isSpam) {
        users
          .findUserById(widget.ownerId)
          .then((owner) => {
            if (!owner) return;
            mailService.notify({
              widget,
              submission: { ...stored, payload: validation.payload, geo },
              ownerEmail: owner.email,
            });
          })
          .catch((err) => console.error(`email recipient lookup failed: ${err.message}`));
      }

      if (isSpam) return res.status(201).json({ ok: true });
      res.status(201).json({ ok: true, submissionId: stored.id });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
