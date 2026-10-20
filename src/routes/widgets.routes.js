const express = require('express');
const { z } = require('zod');
const widgets = require('../db/widgets');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { errors } = require('../lib/errors');
const { UUID_RE } = require('../lib/uuid');
const { buildSnippet, withSnippet } = require('../services/snippetService');

const router = express.Router();

const fieldSchema = z
  .object({
    name: z
      .string()
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/,
        'must start with a letter and contain only letters, digits, underscores',
      ),
    label: z.string().trim().min(1).max(80),
    type: z.enum(['text', 'email', 'tel', 'number', 'textarea']),
    required: z.boolean().optional(),
    maxLength: z.number().int().min(1).max(2000).optional(),
  })
  .strict()
  .refine((field) => field.name !== 'hp', {
    message: 'field name "hp" is reserved',
    path: ['name'],
  });

const fieldsSchema = z.array(fieldSchema).max(20).superRefine((fields, ctx) => {
  const seen = new Set();
  fields.forEach((field, index) => {
    if (seen.has(field.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate field name: ${field.name}`,
        path: [index, 'name'],
      });
    }
    seen.add(field.name);
  });
});

const displaySchema = z
  .object({
    position: z.enum(['center', 'bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
    trigger: z.enum(['immediate', 'delay', 'exit-intent']).optional(),
    delaySeconds: z.number().int().min(0).max(120).optional(),
  })
  .strict();

const createSchema = z
  .object({
    type: z.enum(['signup', 'cta', 'popover']),
    title: z.string().trim().min(1).max(120),
    description: z.string().max(2000).nullable().optional(),
    fields: fieldsSchema.optional(),
    buttonText: z.string().trim().min(1).max(40).optional(),
    display: displaySchema.optional(),
  })
  .strict();

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
    fields: fieldsSchema.optional(),
    buttonText: z.string().trim().min(1).max(40).optional(),
    display: displaySchema.optional(),
    status: z.enum(['active', 'paused']).optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'at least one field must be provided',
  });

function requireUuidParam(req, res, next) {
  if (!UUID_RE.test(req.params.id)) return next(errors.notFound('Widget not found'));
  next();
}

router.use(requireAuth);

router.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const widget = await widgets.createWidget(req.user.id, req.body);
    res.status(201).json({ widget, snippet: buildSnippet(widget.id) });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const list = await widgets.listWidgets(req.user.id);
    res.json({ widgets: list.map(withSnippet) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireUuidParam, async (req, res, next) => {
  try {
    const widget = await widgets.getWidget(req.user.id, req.params.id);
    if (!widget) return next(errors.notFound('Widget not found'));
    res.json({ widget, snippet: buildSnippet(widget.id) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireUuidParam, validateBody(updateSchema), async (req, res, next) => {
  try {
    const widget = await widgets.updateWidget(req.user.id, req.params.id, req.body);
    if (!widget) return next(errors.notFound('Widget not found'));
    res.json({ widget, snippet: buildSnippet(widget.id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireUuidParam, async (req, res, next) => {
  try {
    const deleted = await widgets.deleteWidget(req.user.id, req.params.id);
    if (!deleted) return next(errors.notFound('Widget not found'));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
