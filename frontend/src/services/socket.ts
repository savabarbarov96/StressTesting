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

  connect() {
    // Get the backend URL from environment or default to localhost:3001
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
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
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from main socket:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
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
      });

      this.runsSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from runs namespace:', reason);
      });

      this.runsSocket.on('connect_error', (error) => {
        console.error('❌ Runs socket connection error:', error);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.runsSocket) {
      this.runsSocket.disconnect();
      this.runsSocket = null;
    }
  }

  // Join a specific run room for real-time updates
  joinRun(runId: string) {
    if (this.runsSocket) {
      this.runsSocket.emit('join-run', runId);
    }
  }

  // Leave a specific run room
  leaveRun(runId: string) {
    if (this.runsSocket) {
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
}

// Create singleton instance
const socketService = new SocketService();

export default socketService; 