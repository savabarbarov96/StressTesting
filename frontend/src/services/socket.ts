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
  private socket: Socket | null = null;
  private runsSocket: Socket | null = null;
  private isConnected: boolean = false;
  private isRunsConnected: boolean = false;
  private connectionListeners: Array<(connected: boolean) => void> = [];

  connect() {
    // Get the backend URL from environment or default to localhost:3001
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    console.log(`🔌 Attempting to connect to backend: ${backendUrl}`);
    
    if (!this.socket) {
      this.socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to main socket');
        this.isConnected = true;
        this.notifyConnectionListeners();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from main socket:', reason);
        this.isConnected = false;
        this.notifyConnectionListeners();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
        this.notifyConnectionListeners();
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected to main socket after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.notifyConnectionListeners();
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
      });
    }

    if (!this.runsSocket) {
      this.runsSocket = io(`${backendUrl}/runs`, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      this.runsSocket.on('connect', () => {
        console.log('✅ Connected to runs namespace');
        this.isRunsConnected = true;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from runs namespace:', reason);
        this.isRunsConnected = false;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('connect_error', (error) => {
        console.error('❌ Runs socket connection error:', error);
        this.isRunsConnected = false;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected to runs namespace after ${attemptNumber} attempts`);
        this.isRunsConnected = true;
        this.notifyConnectionListeners();
      });

      this.runsSocket.on('reconnect_error', (error) => {
        console.error('❌ Runs namespace reconnection error:', error);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }

    if (this.runsSocket) {
      this.runsSocket.disconnect();
      this.runsSocket = null;
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
    const isConnected = this.isConnected && this.isRunsConnected;
    this.connectionListeners.forEach(listener => listener(isConnected));
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.push(callback);
    // Immediately call with current status
    callback(this.isConnected && this.isRunsConnected);
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