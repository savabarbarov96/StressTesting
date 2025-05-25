"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const gridfs_1 = require("./utils/gridfs");
const RunManager_1 = require("./services/RunManager");
const websocket_server_1 = require("./websocket-server");
const specs_1 = require("./routes/specs");
const runs_1 = require("./routes/runs");
const attachments_1 = require("./routes/attachments");
const fastify = (0, fastify_1.default)({
    logger: true
});
// Global run manager instance
let runManager;
let websocketServer;
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
        console.log(`Attempting to connect to MongoDB at: ${config_1.config.mongoUri}`);
        // MongoDB connection options for better reliability
        const mongoOptions = {
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
            socketTimeoutMS: 45000, // 45 seconds socket timeout
            bufferCommands: false, // Disable mongoose buffering
        };
        await mongoose_1.default.connect(config_1.config.mongoUri, mongoOptions);
        console.log('✅ Connected to MongoDB successfully');
        // Initialize GridFS
        (0, gridfs_1.initGridFS)(mongoose_1.default.connection);
        console.log('✅ GridFS initialized');
        // Handle connection events
        mongoose_1.default.connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        console.error('💡 Make sure MongoDB is running and accessible at:', config_1.config.mongoUri);
        console.error('💡 To start MongoDB locally, run: mongod');
        console.error('💡 Or update MONGO_URI in your .env file for a different MongoDB instance');
        process.exit(1);
    }
}
// Register routes
async function registerRoutes() {
    // Initialize RunManager
    runManager = new RunManager_1.RunManager(config_1.config.maxWorkers);
    console.log('✅ RunManager initialized');
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
            activeRuns: runManager.listActive().length,
            websocketPort: config_1.config.websocketPort
        };
    });
    // Test WebSocket connectivity
    fastify.post('/api/test-websocket', async () => {
        if (!runManager) {
            return { error: 'RunManager not initialized' };
        }
        // Emit a test event to verify WebSocket connectivity
        const testRunId = 'test-' + Date.now();
        runManager.emit('log', {
            runId: testRunId,
            data: {
                message: 'WebSocket connectivity test',
                timestamp: new Date()
            }
        });
        return {
            message: 'Test event emitted',
            testRunId,
            timestamp: new Date().toISOString()
        };
    });
}
// Setup WebSocket integration
async function setupWebSocket() {
    if (!runManager) {
        throw new Error('RunManager must be initialized before WebSocket server');
    }
    // Create separate WebSocket server
    websocketServer = new websocket_server_1.WebSocketServer(runManager);
    await websocketServer.start();
    console.log('✅ WebSocket server initialized and connected to RunManager');
}
// Graceful shutdown
async function gracefulShutdown() {
    console.log('Shutting down gracefully...');
    if (runManager) {
        await runManager.shutdown();
    }
    if (websocketServer) {
        await websocketServer.stop();
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
        await setupWebSocket();
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