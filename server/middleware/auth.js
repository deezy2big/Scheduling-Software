const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set. Set it in your .env file.');
}
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// Middleware to require authentication
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

// Middleware to require specific role(s)
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

/**
 * Middleware to require specific permission(s)
 * Admins bypass all permission checks
 */
function requirePermission(...permissionNames) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admins bypass permission checks
        if (req.user.role === 'ADMIN') {
            return next();
        }

        try {
            // Check if user has at least one of the required permissions
            const { rows } = await db.query(
                `SELECT permission_name FROM permissions 
         WHERE user_id = $1 AND permission_name = ANY($2::text[])`,
                [req.user.id, permissionNames]
            );

            if (rows.length === 0) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: permissionNames
                });
            }

            next();
        } catch (err) {
            console.error('Permission check error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}

/**
 * Helper to check if user has a specific permission
 * Returns boolean
 */
async function hasPermission(userId, permissionName) {
    try {
        // Check role first
        const { rows: userRows } = await db.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );

        if (userRows[0]?.role === 'ADMIN') {
            return true;
        }

        const { rows } = await db.query(
            'SELECT id FROM permissions WHERE user_id = $1 AND permission_name = $2',
            [userId, permissionName]
        );

        return rows.length > 0;
    } catch (err) {
        console.error('Error checking permission:', err);
        return false;
    }
}

module.exports = {
    generateToken,
    verifyToken,
    requireAuth,
    requireRole,
    requirePermission,
    hasPermission,
};
