import { io, Socket } from 'socket.io-client';
import type { ProgressMetrics, RunSummary } from './api';

export interface LogMessage {
  message: string;
  timestamp: string;
}

export interface SocketEvents {
  progress: (data: ProgressMetrics) => void;
  logLine: (data: LogMessage) => void;
  runCompleted: (summary: RunSummary) => void;
  runFailed: (error: unknown) => void;
  runStopped: () => void;
}

class SocketService {
  private runsSocket: Socket | null = null;
  private isConnected: boolean = false;
  private isRunsConnected: boolean = false;
  private connectionListeners: Array<(connected: boolean) => void> = [];

  connect() {
    // Get the WebSocket URL from environment or default to localhost:3002
    const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3002';
    
    console.log(`🔌 Attempting to connect to WebSocket: ${websocketUrl}`);
    console.log(`🔌 Environment variables:`, {
      VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE
    });

    if (!this.runsSocket) {
      this.runsSocket = io(`${websocketUrl}/runs`, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      this.runsSocket.on('connect', () => {
        console.log('✅ Connected to WebSocket server (runs namespace)');
        this.isConnected = true;
        this.isRunsConnected = true;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from WebSocket server:', reason);
        this.isConnected = false;
        this.isRunsConnected = false;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        this.isConnected = false;
        this.isRunsConnected = false;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected to WebSocket server after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.isRunsConnected = true;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('reconnect_error', (error) => {
        console.error('❌ WebSocket reconnection error:', error);
      });
    }
  }

  disconnect() {
    if (this.runsSocket) {
      this.runsSocket.disconnect();
      this.runsSocket = null;
      this.isConnected = false;
      this.isRunsConnected = false;
    }
  }

  // Connection status getters
  get connected(): boolean {
    return this.isConnected;
  }

  get runsConnected(): boolean {
    return this.isRunsConnected;
  }

  // Join a specific run room for real-time updates
  joinRun(runId: string) {
    if (this.runsSocket && this.isRunsConnected) {
      console.log(`🏠 Joining run room: ${runId}`);
      this.runsSocket.emit('join-run', runId);
    } else {
      console.warn('⚠️ Cannot join run room - runs socket not connected');
    }
  }

  // Leave a specific run room
  leaveRun(runId: string) {
    if (this.runsSocket && this.isRunsConnected) {
      console.log(`🚪 Leaving run room: ${runId}`);
      this.runsSocket.emit('leave-run', runId);
    }
  }

  // Subscribe to run events
  onProgress(callback: (data: ProgressMetrics) => void) {
    if (this.runsSocket) {
      this.runsSocket.on('progress', callback);
    }
  }

  onLogLine(callback: (data: LogMessage) => void) {
    if (this.runsSocket) {
      this.runsSocket.on('logLine', callback);
    }
  }

  onRunCompleted(callback: (summary: RunSummary) => void) {
    if (this.runsSocket) {
      this.runsSocket.on('runCompleted', callback);
    }
  }

  onRunFailed(callback: (error: unknown) => void) {
    if (this.runsSocket) {
      this.runsSocket.on('runFailed', callback);
    }
  }

  onRunStopped(callback: () => void) {
    if (this.runsSocket) {
      this.runsSocket.on('runStopped', callback);
    }
  }

  // Unsubscribe from events
  offProgress(callback?: (data: ProgressMetrics) => void) {
    if (this.runsSocket) {
      this.runsSocket.off('progress', callback);
    }
  }

  offLogLine(callback?: (data: LogMessage) => void) {
    if (this.runsSocket) {
      this.runsSocket.off('logLine', callback);
    }
  }

  offRunCompleted(callback?: (summary: RunSummary) => void) {
    if (this.runsSocket) {
      this.runsSocket.off('runCompleted', callback);
    }
  }

  offRunFailed(callback?: (error: unknown) => void) {
    if (this.runsSocket) {
      this.runsSocket.off('runFailed', callback);
    }
  }

  offRunStopped(callback?: () => void) {
    if (this.runsSocket) {
      this.runsSocket.off('runStopped', callback);
    }
  }

  // Connection status management
  private notifyConnectionListeners() {
    const isConnected = this.isRunsConnected;
    this.connectionListeners.forEach(listener => listener(isConnected));
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.push(callback);
    // Immediately call with current status
    callback(this.isRunsConnected);
  }

  offConnectionChange(callback: (connected: boolean) => void) {
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService; 