function isDatabaseCredentialError(error) {
  return error && (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_BAD_DB_ERROR');
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || (isDatabaseCredentialError(error) ? 503 : 500);
  const message = error.message || 'Internal server error';

  if (isDatabaseCredentialError(error)) {
    return res.status(503).json({
      error: 'database_unavailable',
      message: 'Database connection is unavailable. Check MySQL credentials and server status.'
    });
  }

  return res.status(statusCode).json({
    error: statusCode === 500 ? 'internal_server_error' : 'request_error',
    message,
    details: error.details || null
  });
}

module.exports = errorHandler;