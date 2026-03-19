/**
 * Global error handler middleware.
 * Must be registered LAST in Express (4 params).
 */
function errorHandler(err, req, res, next) {
    // Log internally with full detail
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    const status = err.status || err.statusCode || 500;

    // Never expose internal error details to clients in production
    const message = process.env.NODE_ENV === 'production' && status === 500
        ? 'Internal server error'
        : err.message || 'Internal server error';

    res.status(status).json({ error: message });
}

module.exports = errorHandler;
