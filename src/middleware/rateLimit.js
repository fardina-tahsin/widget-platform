const { errors } = require('../lib/errors');

function createRateLimiter({ windowMs, max, keyFn }) {
  const buckets = new Map();
  let nextSweepAt = Date.now() + windowMs;

  return function rateLimit(req, res, next) {
    const key = keyFn(req);
    if (!key) return next();

    const now = Date.now();
    if (now >= nextSweepAt) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      nextSweepAt = now + windowMs;
    }

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return next(errors.rateLimited());
    }
    return next();
  };
}

module.exports = { createRateLimiter };
