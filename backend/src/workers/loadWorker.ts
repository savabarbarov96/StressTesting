import { parentPort, workerData } from 'worker_threads';
import autocannon from 'autocannon';
import { ISpec, ILoadProfile } from '../models/Spec';
import { downloadFile } from '../utils/gridfs';

interface WorkerMessage {
  type: 'start';
  spec: ISpec;
}

interface ProgressUpdate {
  type: 'progress';
  data: {
    currentRps: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    elapsedTime: number;
  };
}

interface LogUpdate {
  type: 'log';
  data: {
    message: string;
    timestamp: Date;
  };
}

interface CompletionUpdate {
  type: 'complete';
  data: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageRps: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    duration: number;
  };
}

interface ErrorUpdate {
  type: 'error';
  data: {
    message: string;
    error: any;
    timestamp: string;
  };
}

type WorkerUpdate = ProgressUpdate | LogUpdate | CompletionUpdate | ErrorUpdate;

const runId = workerData?.runId || 'unknown';

const sendUpdate = (update: WorkerUpdate) => {
  if (parentPort) {
    try {
      parentPort.postMessage(update);
    } catch (error) {
      console.error(`❌ [${runId}] Failed to send update:`, error);
    }
  }
};

const sendLog = (message: string) => {
  sendUpdate({
    type: 'log',
    data: {
      message,
      timestamp: new Date()
    }
  });
};

const sendError = (message: string, error?: any) => {
  sendUpdate({
    type: 'error',
    data: {
      message,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    }
  });
};

const translateLoadProfile = (loadProfile: ILoadProfile) => {
  const { rampUp, users, steady, rampDown } = loadProfile;
  
  // Validate load profile
  if (!users || users <= 0) {
    throw new Error('Invalid number of users');
  }
  
  if (!steady || steady <= 0) {
    throw new Error('Invalid steady duration');
  }
  
  const totalDuration = (rampUp || 0) + steady + (rampDown || 0);
  
  return {
    connections: Math.min(users, 1000), // Cap connections to prevent system overload
    duration: totalDuration,
    // Use a more reasonable request calculation
    amount: undefined // Let autocannon determine based on duration and connections
  };
};

const runLoadTest = async (spec: ISpec) => {
  let autocannonInstance: any = null;
  let progressInterval: NodeJS.Timeout | null = null;
  
  try {
    sendLog(`🚀 Starting load test for spec: ${spec.name}`);
    sendLog(`🎯 Target: ${spec.request.method} ${spec.request.url}`);
    sendLog(`👥 Load profile: ${spec.loadProfile.users} users for ${spec.loadProfile.steady}s`);

    const autocannonConfig = translateLoadProfile(spec.loadProfile);
    
    // Prepare request configuration with validation
    const requestConfig: any = {
      url: spec.request.url,
      method: spec.request.method.toUpperCase(),
      connections: autocannonConfig.connections,
      duration: autocannonConfig.duration,
      headers: spec.request.headers || {},
      // Enable better progress tracking
      renderProgressBar: false,
      renderLatencyTable: false,
      renderResultsTable: false,
    };

    // Validate URL
    try {
      new URL(spec.request.url);
    } catch {
      throw new Error(`Invalid URL: ${spec.request.url}`);
    }

    // Add query parameters to URL if present
    if (spec.request.queryParams && Object.keys(spec.request.queryParams).length > 0) {
      const url = new URL(spec.request.url);
      Object.entries(spec.request.queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
      requestConfig.url = url.toString();
      sendLog(`🔗 URL with query params: ${requestConfig.url}`);
    }

    // Add body if present
    if (spec.request.body) {
      requestConfig.body = spec.request.body;
      if (!requestConfig.headers['content-type'] && !requestConfig.headers['Content-Type']) {
        requestConfig.headers['Content-Type'] = 'application/json';
      }
      sendLog(`📦 Request body size: ${spec.request.body.length} characters`);
    }

    // Handle file attachment if present
    if (spec.request.attachmentId) {
      try {
        sendLog(`📎 Loading attachment: ${spec.request.attachmentId}`);
        const fileData = await downloadFile(spec.request.attachmentId);
        
        // Convert stream to buffer properly
        const chunks: Buffer[] = [];
        
        await new Promise<void>((resolve, reject) => {
          fileData.stream.on('data', (chunk) => chunks.push(chunk));
          fileData.stream.on('end', () => resolve());
          fileData.stream.on('error', (error) => reject(error));
        });
        
        const buffer = Buffer.concat(chunks);
        requestConfig.body = buffer;
        requestConfig.headers['Content-Type'] = 'application/octet-stream';
        sendLog(`📎 Attachment loaded: ${buffer.length} bytes`);
      } catch (error) {
        sendLog(`⚠️ Warning: Could not load attachment ${spec.request.attachmentId}: ${error}`);
      }
    }

    sendLog(`🔥 Starting autocannon with ${requestConfig.connections} connections for ${requestConfig.duration}s`);

    const startTime = Date.now();
    let lastProgressUpdate = 0;
    
    // Track real-time statistics
    let currentStats = {
      requests: { total: 0, average: 0, sent: 0 },
      errors: 0,
      latency: { average: 0, p50: 0, p95: 0, p99: 0 },
      duration: 0
    };

    // Set up progress reporting with more frequent updates
    progressInterval = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const now = Date.now();
      
      // Only send updates if we have new data or it's been more than 2 seconds
      if (now - lastProgressUpdate > 2000 || currentStats.requests.total > 0) {
        sendUpdate({
          type: 'progress',
          data: {
            currentRps: currentStats.requests.average || 0,
            totalRequests: currentStats.requests.total || 0,
            successfulRequests: Math.max(0, currentStats.requests.total - currentStats.errors),
            failedRequests: currentStats.errors || 0,
            averageLatency: currentStats.latency.average || 0,
            elapsedTime: Math.round(elapsedTime)
          }
        });
        lastProgressUpdate = now;
      }
    }, 1000);

    // Create autocannon instance with promise wrapper
    const result = await new Promise<any>((resolve, reject) => {
      autocannonInstance = autocannon(requestConfig, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });

      // Set up event listeners for real-time updates
      autocannonInstance.on('tick', () => {
        // The tick event doesn't provide reliable stats during execution
        // We'll rely on the progress interval and response events for updates instead
      });

      autocannonInstance.on('done', () => {
        sendLog(`✅ Autocannon completed`);
      });

      autocannonInstance.on('error', (error: Error) => {
        sendLog(`❌ Autocannon error: ${error.message}`);
        reject(error);
      });

      // Track progress using response events for more accurate real-time stats
      let requestCount = 0;
      let errorCount = 0;
      let latencySum = 0;

      autocannonInstance.on('response', (client: any, statusCode: number, resBytes: any, responseTime: number) => {
        requestCount++;
        latencySum += responseTime;
        
        if (statusCode >= 400) {
          errorCount++;
        }

        // Update current stats with real data
        currentStats = {
          requests: {
            total: requestCount,
            average: requestCount / ((Date.now() - startTime) / 1000),
            sent: requestCount
          },
          errors: errorCount,
          latency: {
            average: latencySum / requestCount,
            p50: responseTime, // Approximate
            p95: responseTime, // Approximate
            p99: responseTime  // Approximate
          },
          duration: (Date.now() - startTime) / 1000
        };
      });
    });

    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    sendLog(`🎉 Load test completed successfully`);
    
    // Extract stats from autocannon result - use the correct properties
    const totalRequests = result.totalCompletedRequests || result.totalRequests || currentStats.requests.total || 0;
    const errors = result.errors || 0;
    const duration = result.duration || 0;
    
    // Calculate average RPS from the actual data
    const averageRps = duration > 0 ? totalRequests / duration : currentStats.requests.average || 0;
    
    // Use real-time latency stats since autocannon result doesn't provide processed latency
    const latencyStats = currentStats.latency.average > 0 ? currentStats.latency : {
      average: 0, p50: 0, p95: 0, p99: 0
    };
    
    // Prepare comprehensive summary
    const summary = {
      totalRequests: totalRequests,
      successfulRequests: Math.max(0, totalRequests - errors),
      failedRequests: errors,
      averageRps: averageRps,
      p50Latency: latencyStats.p50,
      p95Latency: latencyStats.p95,
      p99Latency: latencyStats.p99,
      errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
      duration: duration
    };

    sendLog(`📊 Summary: ${summary.totalRequests} requests, ${summary.successfulRequests} successful, ${summary.failedRequests} failed`);
    sendLog(`📈 Performance: ${summary.averageRps.toFixed(1)} RPS, ${summary.p50Latency}ms P50 latency`);

    sendUpdate({
      type: 'complete',
      data: summary
    });

    process.exit(0);

  } catch (error) {
    // Clean up intervals
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    // Stop autocannon instance if it exists
    if (autocannonInstance && typeof autocannonInstance.stop === 'function') {
      try {
        autocannonInstance.stop();
      } catch (stopError) {
        console.error(`❌ [${runId}] Error stopping autocannon:`, stopError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    sendLog(`❌ Load test failed: ${errorMessage}`);
    
    sendError('Load test failed', error);
    process.exit(1);
  }
};

// Enhanced message handling
if (parentPort) {
  parentPort.on('message', (message: WorkerMessage) => {
    try {
      if (message.type === 'start') {
        if (!message.spec) {
          throw new Error('No spec provided');
        }
        runLoadTest(message.spec);
      } else {
        sendLog(`⚠️ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      sendError('Failed to process message', error);
      process.exit(1);
    }
  });

  parentPort.on('error', (error) => {
    sendError('Parent port error', error);
    process.exit(1);
  });
} else {
  console.error(`❌ [${runId}] No parent port available`);
  process.exit(1);
}

// Enhanced graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  sendLog(`🛑 Worker received ${signal}, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  sendError('Uncaught exception in worker', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  sendError('Unhandled rejection in worker', { reason, promise: promise.toString() });
  process.exit(1);
}); 