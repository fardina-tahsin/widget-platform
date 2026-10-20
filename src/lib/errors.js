class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errors = {
  badRequest: (details, message = 'Request validation failed') =>
    new HttpError(400, 'VALIDATION_ERROR', message, details),
  unauthorized: (message = 'Authentication required') =>
    new HttpError(401, 'UNAUTHORIZED', message),
  invalidCredentials: () =>
    new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  emailTaken: () =>
    new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists'),
  notFound: (message = 'Resource not found') =>
    new HttpError(404, 'NOT_FOUND', message),
  rateLimited: () =>
    new HttpError(429, 'RATE_LIMITED', 'Too many requests, retry later'),
  payloadTooLarge: () =>
    new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the allowed size'),
};

module.exports = { HttpError, errors };
