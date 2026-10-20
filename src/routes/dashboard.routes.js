const express = require('express');
const { z } = require('zod');
const submissions = require('../db/submissions');
const { requireAuth } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validate');
const { parseFrom, parseTo } = require('../lib/dates');

const router = express.Router();

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'invalid date');

const listQuerySchema = z
  .object({
    widgetId: z.string().uuid().optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    includeSpam: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const statsQuerySchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .strict();

router.use(requireAuth);

router.get('/submissions', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { widgetId, from, to, includeSpam } = req.query;
    const result = await submissions.listSubmissions(req.user.id, {
      widgetId,
      from: parseFrom(from),
      to: parseTo(to),
      includeSpam: includeSpam === 'true',
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/stats/overview', validateQuery(statsQuerySchema), async (req, res, next) => {
  try {
    const stats = await submissions.statsOverview(req.user.id, {
      from: parseFrom(req.query.from),
      to: parseTo(req.query.to),
    });
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
