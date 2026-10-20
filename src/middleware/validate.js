const { errors } = require('../lib/errors');

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return next(errors.badRequest(formatIssues(result.error)));
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) return next(errors.badRequest(formatIssues(result.error)));
    req.query = result.data;
    next();
  };
}

module.exports = { validateBody, validateQuery };
