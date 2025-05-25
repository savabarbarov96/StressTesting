import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { RunManager } from './services/RunManager';

export class WebSocketServer {
  private httpServer: any;
  private io: Server;
  private runManager: RunManager;

  constructor(runManager: RunManager) {
    this.runManager = runManager;
    this.httpServer = createServer((req, res) => {
      // Simple HTTP endpoint for testing
      if (req.url === '/health') {
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        });
        res.end(JSON.stringify({ 
          status: 'ok', 
          message: 'WebSocket server is running',
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
    
    // Create Socket.io server on separate HTTP server
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: false
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    console.log('🔌 WebSocket server created, setting up handlers...');
    this.setupSocketHandlers();
    console.log('🔌 WebSocket handlers configured');
  }

  private setupSocketHandlers() {
    // Add debugging for main namespace
    this.io.on('connection', (socket: any) => {
      console.log('🔌 Client connected to main namespace:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected from main namespace:', socket.id);
      });
    });

    // Create runs namespace for real-time updates
    const runsNamespace = this.io.of('/runs');

    // Handle client connections
    runsNamespace.on('connection', (socket: any) => {
      console.log('🔌 Client connected to runs namespace:', socket.id);

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
        console.log('🔌 Client disconnected from runs namespace:', socket.id);
      });
    });

    // Set up RunManager event listeners to emit to WebSocket clients
    this.runManager.on('progress', ({ runId, data }) => {
      console.log(`📊 [WebSocket] Broadcasting progress for run ${runId}:`, data);
      runsNamespace.to(runId).emit('progress', data);
    });

    this.runManager.on('log', ({ runId, data }) => {
      console.log(`📝 [WebSocket] Broadcasting log for run ${runId}:`, data.message);
      runsNamespace.to(runId).emit('logLine', data);
    });

    this.runManager.on('runCompleted', ({ runId, summary }) => {
      console.log(`✅ [WebSocket] Broadcasting completion for run ${runId}`);
      runsNamespace.to(runId).emit('runCompleted', summary);
    });

    this.runManager.on('runFailed', ({ runId, error }) => {
      console.log(`❌ [WebSocket] Broadcasting failure for run ${runId}:`, error.message);
      runsNamespace.to(runId).emit('runFailed', error);
    });

    this.runManager.on('runStopped', ({ runId }) => {
      console.log(`🛑 [WebSocket] Broadcasting stop for run ${runId}`);
      runsNamespace.to(runId).emit('runStopped', {});
    });

    console.log('🔌 RunManager event listeners configured');
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.on('error', (error: any) => {
          console.error('❌ WebSocket server error:', error);
          reject(error);
        });

        this.httpServer.listen(Number(config.websocketPort), '0.0.0.0', (err: any) => {
          if (err) {
            console.error('❌ Failed to start WebSocket server:', err);
            reject(err);
          } else {
            console.log(`🔌 WebSocket server running on port ${config.websocketPort}`);
            console.log(`🔌 Socket.io endpoint: http://localhost:${config.websocketPort}/socket.io/`);
            console.log(`🔌 Runs namespace: http://localhost:${config.websocketPort}/runs`);
            
            // Test if Socket.io is properly attached
            console.log('🔌 Socket.io engine attached:', this.io.engine !== undefined);
            resolve();
          }
        });
      } catch (error) {
        console.error('❌ Error starting WebSocket server:', error);
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          console.log('🔌 WebSocket server stopped');
          resolve();
        });
      });
    });
  }
} 