const { HttpError } = require('../lib/errors');

function notFoundHandler(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Route not found'));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size' },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
}

module.exports = { notFoundHandler, errorHandler };
