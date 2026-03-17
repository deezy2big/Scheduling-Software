const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3001);

const authRoutes = require('./routes/auth');
const resourceRoutes = require('./routes/resources');
const projectRoutes = require('./routes/projects');
const resourceGroupRoutes = require('./routes/resource-groups');
const userRoutes = require('./routes/users');
const activityLogRoutes = require('./routes/activity-logs');
const positionRoutes = require('./routes/positions');
const workorderRoutes = require('./routes/workorders');
const laborlawRoutes = require('./routes/laborlaws');
const serviceRoutes = require('./routes/services');
const groupRoutes = require('./routes/groups');
const categoryRoutes = require('./routes/categories');
const typeRoutes = require('./routes/types');

console.log('Routes loaded successfully');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bookings', projectRoutes); // Alias for backwards compatibility
app.use('/api/resource-groups', resourceGroupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/workorders', workorderRoutes);
app.use('/api/laborlaws', laborlawRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/search', require('./routes/search'));

// Serve static files (uploads and frontend build)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../client/dist')));

// For any other request, send back the index.html from the frontend build
app.get('/{*path}', (req, res, next) => {
    // Skip if the request is to the API
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server successfully started on port ${PORT}`);
    console.log(`✓ Health check available at http://0.0.0.0:${PORT}/health`);
    console.log(`✓ Ready to accept connections`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
