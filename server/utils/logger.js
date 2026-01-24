const db = require('../db');

/**
 * Log user activity to the activity_logs table
 * @param {number} userId - User ID performing the action
 * @param {string} action - Action type (e.g., 'USER_LOGIN', 'WORK_ORDER_CREATE')
 * @param {string} entityType - Type of entity (e.g., 'work_order', 'resource')
 * @param {number} entityId - ID of the entity
 * @param {object} details - Additional details as JSON
 * @param {object} req - Express request object (for IP and user agent)
 */
async function logActivity(userId, action, entityType = null, entityId = null, details = {}, req = null) {
    try {
        const ipAddress = req ? (req.ip || req.connection?.remoteAddress) : null;
        const userAgent = req ? req.get('user-agent') : null;

        await db.query(
            `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]
        );
    } catch (err) {
        // Don't throw - logging failures shouldn't break the app
        console.error('Failed to log activity:', err);
    }
}

/**
 * Action type constants for consistency
 */
const ACTIONS = {
    // Auth
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',

    // Work Orders
    WORK_ORDER_CREATE: 'WORK_ORDER_CREATE',
    WORK_ORDER_UPDATE: 'WORK_ORDER_UPDATE',
    WORK_ORDER_DELETE: 'WORK_ORDER_DELETE',
    WORK_ORDER_VIEW: 'WORK_ORDER_VIEW',

    // Resources
    RESOURCE_CREATE: 'RESOURCE_CREATE',
    RESOURCE_UPDATE: 'RESOURCE_UPDATE',
    RESOURCE_DELETE: 'RESOURCE_DELETE',
    RESOURCE_VIEW: 'RESOURCE_VIEW',

    // Users & Permissions
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DEACTIVATE: 'USER_DEACTIVATE',
    PERMISSION_GRANT: 'PERMISSION_GRANT',
    PERMISSION_REVOKE: 'PERMISSION_REVOKE',
};

module.exports = {
    logActivity,
    ACTIONS,
};
