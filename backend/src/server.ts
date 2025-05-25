import Fastify from 'fastify';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { config } from './config';
import { initGridFS } from './utils/gridfs';
import { RunManager } from './services/RunManager';
import { specsRoutes } from './routes/specs';
import { runsRoutes } from './routes/runs';
import { attachmentsRoutes } from './routes/attachments';

const fastify = Fastify({
  logger: true
});

// Global run manager instance
let runManager: RunManager;
let io: Server;

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

  // Register API routes
  await fastify.register(specsRoutes, { prefix: '/api/specs' });
  await fastify.register(async (fastify) => {
    await runsRoutes(fastify, runManager);
  }, { prefix: '/api/runs' });
  await fastify.register(attachmentsRoutes, { prefix: '/api/attachments' });

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
  io = new Server(fastify.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Create runs namespace for real-time updates
  const runsNamespace = io.of('/runs');

  // Handle client connections
  runsNamespace.on('connection', (socket: any) => {
    console.log('Client connected to runs namespace:', socket.id);

    // Join room for specific run
    socket.on('join-run', (runId: string) => {
      socket.join(runId);
      console.log(`Client ${socket.id} joined run room: ${runId}`);
    });

    // Leave room for specific run
    socket.on('leave-run', (runId: string) => {
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
    setupWebSocket();

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