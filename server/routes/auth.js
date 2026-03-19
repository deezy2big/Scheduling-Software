const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, requireAuth } = require('../middleware/auth');
const { logActivity, ACTIONS } = require('../utils/logger');
const { loginLimiter } = require('../middleware/rateLimiter');

// POST /auth/register - Admin creates user accounts
router.post('/register', async (req, res) => {
    const { email, password, full_name, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Create user
        const { rows } = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at`,
            [email, password_hash, full_name || null, role || 'USER']
        );

        res.status(201).json({
            message: 'User created successfully',
            user: rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/login
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email/username and password are required' });
    }

    try {
        // Find user by email or username (if input contains @, search by email; otherwise try both)
        const isEmail = email.includes('@');
        const { rows } = isEmail
            ? await db.query(
                'SELECT id, email, username, password_hash, full_name, role FROM users WHERE email = $1',
                [email]
            )
            : await db.query(
                'SELECT id, email, username, password_hash, full_name, role FROM users WHERE username = $1 OR email = $1',
                [email]
            );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];

        // Verify password
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        // Update last login time
        await db.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Log login activity
        await logActivity(user.id, ACTIONS.USER_LOGIN, null, null, { email: user.email }, req);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /auth/me - Get current user info
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, email, username, full_name, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
