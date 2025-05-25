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
    expectedProgress: number;  // Added to track expected progress percentage
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
    targetRequests: number;  // Added to show the intended request count
    targetDuration: number;  // Added to show the intended duration
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
      console.log(`📤 [Worker ${runId}] Sending update:`, update.type, update.data);
      parentPort.postMessage(update);
    } catch (error) {
      console.error(`❌ [${runId}] Failed to send update:`, error);
    }
  } else {
    console.error(`❌ [${runId}] No parent port available for sending update`);
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

/**
 * Translates the user-configured load profile to autocannon parameters.
 * This function is critical for ensuring the actual test execution matches
 * what users configure in the UI.
 */
const translateLoadProfile = (loadProfile: ILoadProfile) => {
  const { rampUp, users, steady, rampDown, requestsPerSecond = 1 } = loadProfile;
  
  // Validate load profile
  if (!users || users <= 0) {
    throw new Error('Invalid number of users');
  }
  
  if (!steady || steady <= 0) {
    throw new Error('Invalid steady duration');
  }
  
  const totalDuration = (rampUp || 0) + steady + (rampDown || 0);
  
  // Calculate the target RPS (requests per second) across all users
  const peakRps = users * requestsPerSecond;
  
  // Calculate estimated total requests based on load profile phases
  // Using trapezoidal area calculation for ramp-up and ramp-down phases
  const rampUpRequests = (rampUp > 0) ? (0.5 * peakRps * rampUp) : 0;
  const steadyRequests = peakRps * steady;
  const rampDownRequests = (rampDown > 0) ? (0.5 * peakRps * rampDown) : 0;
  const estimatedRequests = Math.round(rampUpRequests + steadyRequests + rampDownRequests);
  
  sendLog(`🧮 Load Profile Calculation:`);
  sendLog(`   - Ramp-up: ${rampUp}s with ${rampUpRequests.toFixed(0)} estimated requests`);
  sendLog(`   - Steady: ${steady}s with ${steadyRequests.toFixed(0)} estimated requests`);
  sendLog(`   - Ramp-down: ${rampDown}s with ${rampDownRequests.toFixed(0)} estimated requests`);
  sendLog(`   - Total: ${estimatedRequests.toFixed(0)} requests over ${totalDuration}s`);
  
  // Configure autocannon for the most accurate test execution
  // We prioritize achieving the correct request count and distribution
  return {
    connections: Math.min(users, 1000), // Cap connections to prevent system overload
    duration: totalDuration,
    amount: estimatedRequests,
    rate: peakRps, // Target maximum RPS during steady state
    rampUp: rampUp || 0,
    steady: steady,
    rampDown: rampDown || 0,
    requestsPerSecond: requestsPerSecond,
    maxRps: peakRps,
    targetRequests: estimatedRequests,  // Store the target request count for reporting
    targetDuration: totalDuration       // Store the target duration for reporting
  };
};

const runLoadTest = async (spec: ISpec) => {
  let autocannonInstance: any = null;
  let progressInterval: NodeJS.Timeout | null = null;
  let loadProfile = translateLoadProfile(spec.loadProfile);
  
  try {
    sendLog(`🚀 Starting load test for spec: ${spec.name}`);
    sendLog(`🎯 Target: ${spec.request.method} ${spec.request.url}`);
    sendLog(`👥 Load profile: ${spec.loadProfile.users} users, ${spec.loadProfile.requestsPerSecond || 1} RPS/user for ${spec.loadProfile.steady}s`);
    sendLog(`🔢 Expected total requests: ${loadProfile.targetRequests}`);
    
    // Prepare request configuration with validation
    const requestConfig: any = {
      url: spec.request.url,
      method: spec.request.method.toUpperCase(),
      connections: loadProfile.connections,
      duration: loadProfile.duration,
      amount: loadProfile.amount,
      // We cannot use both rate and amount effectively with autocannon
      // We'll prioritize amount for accuracy in total requests
      rate: loadProfile.rate,
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
    sendLog(`⚡ Target RPS: ${loadProfile.rate} (${spec.loadProfile.requestsPerSecond} per user × ${spec.loadProfile.users} users)`);

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
      
      // Calculate where we should be in the test based on the load profile
      let expectedProgress = 0;
      const { rampUp, steady, rampDown, targetDuration } = loadProfile;
      
      if (targetDuration > 0) {
        if (elapsedTime <= rampUp) {
          // In ramp-up phase
          expectedProgress = (elapsedTime / targetDuration) * 100;
        } else if (elapsedTime <= rampUp + steady) {
          // In steady phase
          expectedProgress = ((rampUp / targetDuration) + ((elapsedTime - rampUp) / targetDuration)) * 100;
        } else if (elapsedTime <= targetDuration) {
          // In ramp-down phase
          expectedProgress = ((rampUp + steady) / targetDuration + ((elapsedTime - rampUp - steady) / targetDuration)) * 100;
        } else {
          // Beyond expected duration
          expectedProgress = 100;
        }
      }
      
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
            elapsedTime: Math.round(elapsedTime),
            expectedProgress: Math.min(100, Math.round(expectedProgress))
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

      // Track progress using response events for more accurate real-time stats
      let requestCount = 0;
      let errorCount = 0;
      let latencySum = 0;
      
      // Listen for responses to track accurate progress
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

      autocannonInstance.on('done', () => {
        sendLog(`✅ Autocannon completed`);
      });

      autocannonInstance.on('error', (error: Error) => {
        sendLog(`❌ Autocannon error: ${error.message}`);
        reject(error);
      });
    });

    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    sendLog(`🎉 Load test completed successfully`);
    
    // Extract stats from autocannon result with improved accuracy
    const totalRequests = result.requests?.total || result.requests || currentStats.requests.total || 0;
    const errors = result.errors || result.non2xx || 0;
    const duration = result.duration || (Date.now() - startTime) / 1000;
    
    // Calculate average RPS from the actual data
    const averageRps = duration > 0 ? totalRequests / duration : 0;
    
    // Use the actual latency metrics from autocannon result if available
    const latencyStats = {
      average: result.latency?.average || currentStats.latency.average || 0,
      p50: result.latency?.p50 || currentStats.latency.p50 || 0,
      p95: result.latency?.p95 || currentStats.latency.p95 || 0,
      p99: result.latency?.p99 || currentStats.latency.p99 || 0
    };
    
    // Prepare comprehensive summary with both target and actual metrics
    const summary = {
      totalRequests: totalRequests,
      successfulRequests: Math.max(0, totalRequests - errors),
      failedRequests: errors,
      averageRps: averageRps,
      p50Latency: latencyStats.p50,
      p95Latency: latencyStats.p95,
      p99Latency: latencyStats.p99,
      errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
      duration: duration,
      targetRequests: loadProfile.targetRequests,
      targetDuration: loadProfile.targetDuration
    };

    // Log summary with comparison to targets
    sendLog(`📊 Summary: ${summary.totalRequests} requests (target: ${loadProfile.targetRequests})`);
    sendLog(`🕒 Duration: ${duration.toFixed(1)}s (target: ${loadProfile.targetDuration}s)`);
    sendLog(`⚡ Performance: ${summary.averageRps.toFixed(1)} RPS (target: ${loadProfile.rate})`);
    sendLog(`📈 Success Rate: ${summary.successfulRequests} / ${summary.totalRequests} (${(100 - summary.errorRate).toFixed(1)}%)`);

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
  console.log(`🔧 [Worker ${runId}] Worker initialized and listening for messages`);
  
  parentPort.on('message', (message: WorkerMessage) => {
    try {
      console.log(`📥 [Worker ${runId}] Received message:`, message.type);
      if (message.type === 'start') {
        if (!message.spec) {
          throw new Error('No spec provided');
        }
        console.log(`🚀 [Worker ${runId}] Starting load test for spec: ${message.spec.name}`);
        runLoadTest(message.spec);
      } else {
        sendLog(`⚠️ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ [Worker ${runId}] Failed to process message:`, error);
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