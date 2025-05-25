import Fastify from 'fastify';
import mongoose from 'mongoose';
import { config } from './config';
import { initGridFS } from './utils/gridfs';
import { RunManager } from './services/RunManager';
import { WebSocketServer } from './websocket-server';
import { specsRoutes } from './routes/specs';
import { runsRoutes } from './routes/runs';
import { attachmentsRoutes } from './routes/attachments';
import { testRoutes } from './routes/test';

const fastify = Fastify({
  logger: true
});

// Global run manager instance
let runManager: RunManager;
let websocketServer: WebSocketServer;

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
    console.log(`Attempting to connect to MongoDB at: ${config.mongoUri}`);
    
    // MongoDB connection options for better reliability
    const mongoOptions = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(config.mongoUri, mongoOptions);
    console.log('✅ Connected to MongoDB successfully');
    
    // Initialize GridFS
    initGridFS(mongoose.connection);
    console.log('✅ GridFS initialized');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    console.error('💡 Make sure MongoDB is running and accessible at:', config.mongoUri);
    console.error('💡 To start MongoDB locally, run: mongod');
    console.error('💡 Or update MONGO_URI in your .env file for a different MongoDB instance');
    process.exit(1);
  }
}

// Register routes
async function registerRoutes() {
  // Initialize RunManager
  runManager = new RunManager(config.maxWorkers);
  console.log('✅ RunManager initialized');

  // Register API routes
  await fastify.register(specsRoutes, { prefix: '/api/specs' });
  await fastify.register(async (fastify) => {
    await runsRoutes(fastify, runManager);
  }, { prefix: '/api/runs' });
  await fastify.register(attachmentsRoutes, { prefix: '/api/attachments' });
  await fastify.register(testRoutes, { prefix: '/api' });

  // Health check endpoint
  fastify.get('/api/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      activeRuns: runManager.listActive().length,
      websocketPort: config.websocketPort
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
  websocketServer = new WebSocketServer(runManager);
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
  
  await mongoose.connection.close();
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
      port: Number(config.port), 
      host: '0.0.0.0' 
    });
    
    console.log(`LoadForge server running on port ${config.port}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
start(); 