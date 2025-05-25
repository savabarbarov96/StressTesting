"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const autocannon_1 = __importDefault(require("autocannon"));
const gridfs_1 = require("../utils/gridfs");
const sendUpdate = (update) => {
    if (worker_threads_1.parentPort) {
        worker_threads_1.parentPort.postMessage(update);
    }
};
const sendLog = (message) => {
    sendUpdate({
        type: 'log',
        data: {
            message,
            timestamp: new Date()
        }
    });
};
const translateLoadProfile = (loadProfile) => {
    const { rampUp, users, steady, rampDown } = loadProfile;
    const totalDuration = rampUp + steady + rampDown;
    return {
        connections: users,
        duration: totalDuration,
        // Autocannon doesn't have built-in ramp patterns, so we'll simulate steady state
        // In a production version, we'd implement custom ramping logic
        amount: users * totalDuration * 10 // Rough estimate for total requests
    };
};
const runLoadTest = async (spec) => {
    try {
        sendLog(`Starting load test for spec: ${spec.name}`);
        sendLog(`Target: ${spec.request.method} ${spec.request.url}`);
        sendLog(`Load profile: ${spec.loadProfile.users} users for ${spec.loadProfile.steady}s`);
        const autocannonConfig = translateLoadProfile(spec.loadProfile);
        // Prepare request configuration
        const requestConfig = {
            url: spec.request.url,
            method: spec.request.method,
            connections: autocannonConfig.connections,
            duration: autocannonConfig.duration,
            headers: spec.request.headers || {},
        };
        // Add query parameters to URL if present
        if (spec.request.queryParams && Object.keys(spec.request.queryParams).length > 0) {
            const url = new URL(spec.request.url);
            Object.entries(spec.request.queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
            requestConfig.url = url.toString();
        }
        // Add body if present
        if (spec.request.body) {
            requestConfig.body = spec.request.body;
            if (!requestConfig.headers['content-type']) {
                requestConfig.headers['content-type'] = 'application/json';
            }
        }
        // Handle file attachment if present
        if (spec.request.attachmentId) {
            try {
                const fileData = await (0, gridfs_1.downloadFile)(spec.request.attachmentId);
                // For simplicity, we'll convert the stream to a buffer
                // In production, you might want to stream this more efficiently
                const chunks = [];
                fileData.stream.on('data', (chunk) => chunks.push(chunk));
                fileData.stream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    requestConfig.body = buffer;
                    requestConfig.headers['content-type'] = 'application/octet-stream';
                });
                await new Promise((resolve) => fileData.stream.on('end', resolve));
            }
            catch (error) {
                sendLog(`Warning: Could not load attachment ${spec.request.attachmentId}: ${error}`);
            }
        }
        sendLog(`Starting autocannon with ${requestConfig.connections} connections for ${requestConfig.duration}s`);
        const startTime = Date.now();
        let progressInterval;
        let currentStats = {
            requests: { total: 0, average: 0 },
            errors: 0,
            latency: { average: 0 }
        };
        // Set up progress reporting
        progressInterval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            sendUpdate({
                type: 'progress',
                data: {
                    currentRps: currentStats.requests.average || 0,
                    totalRequests: currentStats.requests.total || 0,
                    successfulRequests: currentStats.requests.total - currentStats.errors,
                    failedRequests: currentStats.errors || 0,
                    averageLatency: currentStats.latency.average || 0,
                    elapsedTime
                }
            });
        }, 1000);
        // Use callback pattern for autocannon
        const instance = (0, autocannon_1.default)(requestConfig, (err, result) => {
            clearInterval(progressInterval);
            if (err) {
                sendUpdate({
                    type: 'error',
                    data: {
                        message: 'Load test failed',
                        error: err.message
                    }
                });
                process.exit(1);
                return;
            }
            sendLog('Load test completed');
            const summary = {
                totalRequests: result.requests.total,
                successfulRequests: result.requests.total - result.errors,
                failedRequests: result.errors,
                averageRps: result.requests.average,
                p50Latency: result.latency.p50,
                p95Latency: result.latency.p95 || result.latency.p99,
                p99Latency: result.latency.p99,
                errorRate: (result.errors / result.requests.total) * 100,
                duration: result.duration
            };
            sendUpdate({
                type: 'complete',
                data: summary
            });
            process.exit(0);
        });
        // Handle tick events for progress updates
        instance.on('tick', () => {
            // Update current stats from instance if available
            if (instance.opts) {
                currentStats = instance.opts;
            }
        });
    }
    catch (error) {
        sendUpdate({
            type: 'error',
            data: {
                message: 'Failed to start load test',
                error: error instanceof Error ? error.message : String(error)
            }
        });
        process.exit(1);
    }
};
// Listen for messages from parent
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', (message) => {
        if (message.type === 'start') {
            runLoadTest(message.spec);
        }
    });
}
// Handle graceful shutdown
process.on('SIGTERM', () => {
    sendLog('Worker received SIGTERM, shutting down...');
    process.exit(0);
});
process.on('SIGINT', () => {
    sendLog('Worker received SIGINT, shutting down...');
    process.exit(0);
});
//# sourceMappingURL=loadWorker.js.map