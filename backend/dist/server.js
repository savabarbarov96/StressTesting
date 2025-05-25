"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const gridfs_1 = require("./utils/gridfs");
const RunManager_1 = require("./services/RunManager");
const specs_1 = require("./routes/specs");
const runs_1 = require("./routes/runs");
const attachments_1 = require("./routes/attachments");
const fastify = (0, fastify_1.default)({
    logger: true
});
// Global run manager instance
let runManager;
let io;
// Register plugins
async function registerPlugins() {
    // CORS support
    await fastify.register(require('@fastify/cors'), {
        origin: true
    });
    // Multipart support for file uploads
    await fastify.register(require('@fastify/multipart'));
}
// Connect to MongoDB
async function connectDatabase() {
    try {
        await mongoose_1.default.connect(config_1.config.mongoUri);
        console.log('Connected to MongoDB');
        // Initialize GridFS
        (0, gridfs_1.initGridFS)(mongoose_1.default.connection);
        console.log('GridFS initialized');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}
// Register routes
async function registerRoutes() {
    // Initialize RunManager
    runManager = new RunManager_1.RunManager(config_1.config.maxWorkers);
    // Register API routes
    await fastify.register(specs_1.specsRoutes, { prefix: '/api/specs' });
    await fastify.register(async (fastify) => {
        await (0, runs_1.runsRoutes)(fastify, runManager);
    }, { prefix: '/api/runs' });
    await fastify.register(attachments_1.attachmentsRoutes, { prefix: '/api/attachments' });
    // Health check endpoint
    fastify.get('/api/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            activeRuns: runManager.listActive().length
        };
    });
}
// Setup WebSocket integration
function setupWebSocket() {
    // Create Socket.io server
    io = new socket_io_1.Server(fastify.server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    // Create runs namespace for real-time updates
    const runsNamespace = io.of('/runs');
    // Handle client connections
    runsNamespace.on('connection', (socket) => {
        console.log('Client connected to runs namespace:', socket.id);
        // Join room for specific run
        socket.on('join-run', (runId) => {
            socket.join(runId);
            console.log(`Client ${socket.id} joined run room: ${runId}`);
        });
        // Leave room for specific run
        socket.on('leave-run', (runId) => {
            socket.leave(runId);
            console.log(`Client ${socket.id} left run room: ${runId}`);
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    // Set up RunManager event listeners to emit to WebSocket clients
    runManager.on('progress', ({ runId, data }) => {
        runsNamespace.to(runId).emit('progress', data);
    });
    runManager.on('log', ({ runId, data }) => {
        runsNamespace.to(runId).emit('logLine', data);
    });
    runManager.on('runCompleted', ({ runId, summary }) => {
        runsNamespace.to(runId).emit('runCompleted', summary);
    });
    runManager.on('runFailed', ({ runId, error }) => {
        runsNamespace.to(runId).emit('runFailed', error);
    });
    runManager.on('runStopped', ({ runId }) => {
        runsNamespace.to(runId).emit('runStopped', {});
    });
}
// Graceful shutdown
async function gracefulShutdown() {
    console.log('Shutting down gracefully...');
    if (runManager) {
        await runManager.shutdown();
    }
    await mongoose_1.default.connection.close();
    await fastify.close();
    process.exit(0);
}
// Start server
async function start() {
    try {
        await registerPlugins();
        await connectDatabase();
        await registerRoutes();
        setupWebSocket();
        // Handle graceful shutdown
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        await fastify.listen({
            port: Number(config_1.config.port),
            host: '0.0.0.0'
        });
        console.log(`LoadForge server running on port ${config_1.config.port}`);
    }
    catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}
// Start the server
start();
//# sourceMappingURL=server.js.map