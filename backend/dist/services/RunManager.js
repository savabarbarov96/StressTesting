"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunManager = void 0;
const worker_threads_1 = require("worker_threads");
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
const Run_1 = require("../models/Run");
const Spec_1 = require("../models/Spec");
class RunManager extends events_1.EventEmitter {
    constructor(maxConcurrentRuns = 4) {
        super();
        this.activeRuns = new Map();
        this.maxConcurrentRuns = maxConcurrentRuns;
    }
    async startRun(specId) {
        // Check if we've reached the maximum concurrent runs
        if (this.activeRuns.size >= this.maxConcurrentRuns) {
            throw new Error('Maximum concurrent runs reached');
        }
        // Fetch the spec from database
        const spec = await Spec_1.Spec.findById(specId);
        if (!spec) {
            throw new Error('Spec not found');
        }
        // Create a new run record
        const run = new Run_1.Run({
            specId: specId,
            status: 'running',
            startedAt: new Date(),
            progress: {
                currentRps: 0,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageLatency: 0,
                elapsedTime: 0
            }
        });
        await run.save();
        // Create and start worker
        const workerPath = path_1.default.join(__dirname, '../workers/loadWorker.js');
        const worker = new worker_threads_1.Worker(workerPath);
        const activeRun = {
            runId: run.id,
            worker,
            run,
            startTime: new Date()
        };
        this.activeRuns.set(run.id, activeRun);
        // Set up worker message handling
        worker.on('message', (message) => {
            this.handleWorkerMessage(run.id, message);
        });
        worker.on('error', (error) => {
            this.handleWorkerError(run.id, error);
        });
        worker.on('exit', (code) => {
            this.handleWorkerExit(run.id, code);
        });
        // Send the spec to the worker to start the load test
        worker.postMessage({
            type: 'start',
            spec: spec.toObject()
        });
        this.emit('runStarted', {
            runId: run.id,
            specId,
            specName: spec.name
        });
        return run.id;
    }
    async stopRun(runId) {
        const activeRun = this.activeRuns.get(runId);
        if (!activeRun) {
            throw new Error('Run not found or not active');
        }
        // Terminate the worker
        await activeRun.worker.terminate();
        // Update run status
        await Run_1.Run.findByIdAndUpdate(runId, {
            status: 'stopped',
            completedAt: new Date()
        });
        // Remove from active runs
        this.activeRuns.delete(runId);
        this.emit('runStopped', { runId });
    }
    listActive() {
        const now = new Date();
        return Array.from(this.activeRuns.values()).map(activeRun => ({
            runId: activeRun.runId,
            specId: activeRun.run.specId,
            startTime: activeRun.startTime,
            elapsedTime: Math.floor((now.getTime() - activeRun.startTime.getTime()) / 1000)
        }));
    }
    async handleWorkerMessage(runId, message) {
        const activeRun = this.activeRuns.get(runId);
        if (!activeRun)
            return;
        switch (message.type) {
            case 'progress':
                await this.updateProgress(runId, message.data);
                this.emit('progress', { runId, data: message.data });
                break;
            case 'log':
                this.emit('log', { runId, data: message.data });
                break;
            case 'complete':
                await this.completeRun(runId, message.data);
                break;
            case 'error':
                await this.failRun(runId, message.data);
                break;
        }
    }
    async handleWorkerError(runId, error) {
        console.error(`Worker error for run ${runId}:`, error);
        await this.failRun(runId, { message: 'Worker error', error: error.message });
    }
    async handleWorkerExit(runId, code) {
        const activeRun = this.activeRuns.get(runId);
        if (!activeRun)
            return;
        // Clean up
        this.activeRuns.delete(runId);
        // If the worker exited with a non-zero code and the run isn't already completed/failed
        if (code !== 0) {
            const run = await Run_1.Run.findById(runId);
            if (run && run.status === 'running') {
                await Run_1.Run.findByIdAndUpdate(runId, {
                    status: 'failed',
                    completedAt: new Date()
                });
                this.emit('runFailed', { runId, error: `Worker exited with code ${code}` });
            }
        }
    }
    async updateProgress(runId, progressData) {
        await Run_1.Run.findByIdAndUpdate(runId, {
            progress: progressData
        });
    }
    async completeRun(runId, summaryData) {
        await Run_1.Run.findByIdAndUpdate(runId, {
            status: 'completed',
            completedAt: new Date(),
            summary: summaryData
        });
        // Remove from active runs
        this.activeRuns.delete(runId);
        this.emit('runCompleted', { runId, summary: summaryData });
    }
    async failRun(runId, errorData) {
        await Run_1.Run.findByIdAndUpdate(runId, {
            status: 'failed',
            completedAt: new Date()
        });
        // Remove from active runs
        this.activeRuns.delete(runId);
        this.emit('runFailed', { runId, error: errorData });
    }
    // Cleanup method to stop all active runs
    async shutdown() {
        const promises = Array.from(this.activeRuns.keys()).map(runId => this.stopRun(runId).catch(err => console.error(`Error stopping run ${runId}:`, err)));
        await Promise.all(promises);
    }
}
exports.RunManager = RunManager;
//# sourceMappingURL=RunManager.js.map