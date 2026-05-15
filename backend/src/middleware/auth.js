const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication token required'));
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    // Log role for debugging; can be removed or changed to debug level in production
    console.debug('Authenticated user role:', req.user?.role, 'user id:', req.user?.id);
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    // Normalize role comparison: case-insensitive and allow common synonyms
    const normalize = (r) => (String(r || '').trim().toLowerCase());
    const userRole = normalize(req.user.role);

    // Map canonical roles to accepted synonyms
    const synonyms = {
      ogc: ['ogc', 'ogc_facilitator', 'ogc facilitator', 'facilitator', 'ogc_fac']
    };

    const allowed = new Set();
    for (const expected of roles) {
      const n = normalize(expected);
      allowed.add(n);
      const extra = synonyms[n] || [];
      for (const s of extra) allowed.add(normalize(s));
    }

    if (!allowed.has(userRole)) {
      return next(new ApiError(403, 'Insufficient access rights'));
    }

    return next();
  };
}

module.exports = { authenticate, requireRole };