import { Worker } from 'worker_threads';
import path from 'path';
import { EventEmitter } from 'events';
import { Run, IRun, IRunSummary, IProgressMetrics } from '../models/Run';
import { Spec, ISpec } from '../models/Spec';
import fs from 'fs';

interface ActiveRun {
  runId: string;
  worker: Worker;
  run: IRun;
  startTime: Date;
  timeout?: NodeJS.Timeout;
}

interface WorkerMessage {
  type: 'progress' | 'log' | 'complete' | 'error';
  data: any;
}

export class RunManager extends EventEmitter {
  private activeRuns: Map<string, ActiveRun> = new Map();
  private maxConcurrentRuns: number;
  private workerTimeout: number = 300000; // 5 minutes default timeout

  constructor(maxConcurrentRuns: number = 4) {
    super();
    this.maxConcurrentRuns = maxConcurrentRuns;
  }

  private getWorkerPath(): string {
    // More robust worker path resolution - prioritize compiled JS files
    const possiblePaths = [
      // For compiled JavaScript (production) - prioritize these
      path.join(__dirname, '../workers/loadWorker.js'),
      path.resolve(process.cwd(), 'backend/dist/workers/loadWorker.js'),
      path.resolve(process.cwd(), 'dist/workers/loadWorker.js'),
      path.join(__dirname, './workers/loadWorker.js'),
      // For development with ts-node (only if JS not found)
      path.join(__dirname, '../workers/loadWorker.ts'),
      path.resolve(process.cwd(), 'backend/src/workers/loadWorker.ts'),
      path.resolve(process.cwd(), 'src/workers/loadWorker.ts'),
    ];

    for (const workerPath of possiblePaths) {
      if (fs.existsSync(workerPath)) {
        console.log(`✅ Found worker at: ${workerPath}`);
        return workerPath;
      }
    }

    throw new Error(`❌ Worker file not found. Searched paths: ${possiblePaths.join(', ')}`);
  }

  async startRun(specId: string): Promise<string> {
    try {
      // Check if we've reached the maximum concurrent runs
      if (this.activeRuns.size >= this.maxConcurrentRuns) {
        throw new Error('Maximum concurrent runs reached');
      }

      // Fetch the spec from database
      const spec = await Spec.findById(specId);
      if (!spec) {
        throw new Error('Spec not found');
      }

      // Validate spec configuration
      this.validateSpec(spec);

      // Create a new run record
      const run = new Run({
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
      console.log(`🚀 Starting run ${run.id} for spec ${spec.name}`);

      // Get worker path with robust resolution
      const workerPath = this.getWorkerPath();
      
      // Create and start worker with error handling
      const worker = new Worker(workerPath, {
        workerData: { runId: run.id }
      });

      // Set up timeout for the worker
      const timeout = setTimeout(() => {
        console.error(`⏰ Worker timeout for run ${run.id}`);
        this.handleWorkerTimeout(run.id);
      }, this.workerTimeout);

      const activeRun: ActiveRun = {
        runId: run.id,
        worker,
        run,
        startTime: new Date(),
        timeout
      };

      this.activeRuns.set(run.id, activeRun);

      // Set up worker message handling with better error handling
      worker.on('message', (message: WorkerMessage) => {
        try {
          this.handleWorkerMessage(run.id, message);
        } catch (error) {
          console.error(`❌ Error handling worker message for run ${run.id}:`, error);
          this.handleWorkerError(run.id, error as Error);
        }
      });

      worker.on('error', (error) => {
        console.error(`❌ Worker error for run ${run.id}:`, error);
        this.handleWorkerError(run.id, error);
      });

      worker.on('exit', (code) => {
        console.log(`🔄 Worker exited for run ${run.id} with code ${code}`);
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
    } catch (error) {
      console.error(`❌ Failed to start run for spec ${specId}:`, error);
      throw error;
    }
  }

  private validateSpec(spec: ISpec): void {
    if (!spec.request?.url) {
      throw new Error('Spec must have a valid URL');
    }

    if (!spec.loadProfile?.users || spec.loadProfile.users <= 0) {
      throw new Error('Spec must have a valid number of users');
    }

    if (!spec.loadProfile?.steady || spec.loadProfile.steady <= 0) {
      throw new Error('Spec must have a valid steady duration');
    }

    // Validate URL format
    try {
      new URL(spec.request.url);
    } catch {
      throw new Error('Spec URL is not valid');
    }
  }

  private async handleWorkerTimeout(runId: string): Promise<void> {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) return;

    console.error(`⏰ Worker timeout for run ${runId}, terminating...`);
    
    try {
      await activeRun.worker.terminate();
    } catch (error) {
      console.error(`❌ Error terminating worker for run ${runId}:`, error);
    }

    await this.failRun(runId, { 
      message: 'Load test timed out', 
      error: `Worker exceeded timeout of ${this.workerTimeout}ms` 
    });
  }

  async stopRun(runId: string): Promise<void> {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error('Run not found or not active');
    }

    console.log(`🛑 Stopping run ${runId}`);

    try {
      // Clear timeout
      if (activeRun.timeout) {
        clearTimeout(activeRun.timeout);
      }

      // Terminate the worker
      await activeRun.worker.terminate();

      // Update run status
      await Run.findByIdAndUpdate(runId, {
        status: 'stopped',
        completedAt: new Date()
      });

      // Remove from active runs
      this.activeRuns.delete(runId);

      this.emit('runStopped', { runId });
    } catch (error) {
      console.error(`❌ Error stopping run ${runId}:`, error);
      throw error;
    }
  }

  listActive(): Array<{ runId: string; specId: string; startTime: Date; elapsedTime: number }> {
    const now = new Date();
    return Array.from(this.activeRuns.values()).map(activeRun => ({
      runId: activeRun.runId,
      specId: activeRun.run.specId,
      startTime: activeRun.startTime,
      elapsedTime: Math.floor((now.getTime() - activeRun.startTime.getTime()) / 1000)
    }));
  }

  private async handleWorkerMessage(runId: string, message: WorkerMessage) {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      console.warn(`⚠️ Received message for unknown run ${runId}`);
      return;
    }

    switch (message.type) {
      case 'progress':
        await this.updateProgress(runId, message.data);
        this.emit('progress', { runId, data: message.data });
        break;

      case 'log':
        console.log(`📝 [${runId}] ${message.data.message}`);
        this.emit('log', { runId, data: message.data });
        break;

      case 'complete':
        console.log(`✅ Run ${runId} completed successfully`);
        await this.completeRun(runId, message.data);
        break;

      case 'error':
        console.error(`❌ Run ${runId} failed:`, message.data);
        await this.failRun(runId, message.data);
        break;

      default:
        console.warn(`⚠️ Unknown message type from worker: ${message.type}`);
    }
  }

  private async handleWorkerError(runId: string, error: Error) {
    console.error(`❌ Worker error for run ${runId}:`, error);
    await this.failRun(runId, { 
      message: 'Worker error', 
      error: error.message,
      stack: error.stack 
    });
  }

  private async handleWorkerExit(runId: string, code: number) {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) return;

    // Clear timeout
    if (activeRun.timeout) {
      clearTimeout(activeRun.timeout);
    }

    // Clean up
    this.activeRuns.delete(runId);

    // If the worker exited with a non-zero code and the run isn't already completed/failed
    if (code !== 0) {
      const run = await Run.findById(runId);
      if (run && run.status === 'running') {
        console.error(`❌ Worker exited unexpectedly for run ${runId} with code ${code}`);
        await Run.findByIdAndUpdate(runId, {
          status: 'failed',
          completedAt: new Date()
        });
        this.emit('runFailed', { 
          runId, 
          error: {
            message: `Worker exited with code ${code}`,
            code,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  private async updateProgress(runId: string, progressData: IProgressMetrics) {
    try {
      await Run.findByIdAndUpdate(runId, {
        progress: progressData
      });
    } catch (error) {
      console.error(`❌ Error updating progress for run ${runId}:`, error);
    }
  }

  private async completeRun(runId: string, summaryData: IRunSummary) {
    try {
      const activeRun = this.activeRuns.get(runId);
      if (activeRun?.timeout) {
        clearTimeout(activeRun.timeout);
      }

      await Run.findByIdAndUpdate(runId, {
        status: 'completed',
        completedAt: new Date(),
        summary: summaryData
      });

      // Remove from active runs
      this.activeRuns.delete(runId);

      this.emit('runCompleted', { runId, summary: summaryData });
    } catch (error) {
      console.error(`❌ Error completing run ${runId}:`, error);
    }
  }

  private async failRun(runId: string, errorData: { message: string; error?: any; stack?: string }) {
    try {
      const activeRun = this.activeRuns.get(runId);
      if (activeRun?.timeout) {
        clearTimeout(activeRun.timeout);
      }

      await Run.findByIdAndUpdate(runId, {
        status: 'failed',
        completedAt: new Date(),
        error: {
          message: errorData.message,
          details: errorData.error,
          stack: errorData.stack,
          timestamp: new Date().toISOString()
        }
      });

      // Remove from active runs
      this.activeRuns.delete(runId);

      this.emit('runFailed', { runId, error: errorData });
    } catch (error) {
      console.error(`❌ Error failing run ${runId}:`, error);
    }
  }

  // Cleanup method to stop all active runs
  async shutdown() {
    console.log(`🔄 Shutting down RunManager with ${this.activeRuns.size} active runs`);
    
    const promises = Array.from(this.activeRuns.keys()).map(runId => 
      this.stopRun(runId).catch(err => console.error(`❌ Error stopping run ${runId}:`, err))
    );
    
    await Promise.all(promises);
    console.log('✅ RunManager shutdown complete');
  }
} 