import { Worker } from 'worker_threads';
import path from 'path';
import { EventEmitter } from 'events';
import { Run, IRun, IRunSummary, IProgressMetrics } from '../models/Run';
import { Spec, ISpec } from '../models/Spec';

interface ActiveRun {
  runId: string;
  worker: Worker;
  run: IRun;
  startTime: Date;
}

interface WorkerMessage {
  type: 'progress' | 'log' | 'complete' | 'error';
  data: any;
}

export class RunManager extends EventEmitter {
  private activeRuns: Map<string, ActiveRun> = new Map();
  private maxConcurrentRuns: number;

  constructor(maxConcurrentRuns: number = 4) {
    super();
    this.maxConcurrentRuns = maxConcurrentRuns;
  }

  async startRun(specId: string): Promise<string> {
    // Check if we've reached the maximum concurrent runs
    if (this.activeRuns.size >= this.maxConcurrentRuns) {
      throw new Error('Maximum concurrent runs reached');
    }

    // Fetch the spec from database
    const spec = await Spec.findById(specId);
    if (!spec) {
      throw new Error('Spec not found');
    }

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

    // Create and start worker
    const workerPath = path.join(__dirname, '../workers/loadWorker.js');
    const worker = new Worker(workerPath);

    const activeRun: ActiveRun = {
      runId: run.id,
      worker,
      run,
      startTime: new Date()
    };

    this.activeRuns.set(run.id, activeRun);

    // Set up worker message handling
    worker.on('message', (message: WorkerMessage) => {
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

  async stopRun(runId: string): Promise<void> {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error('Run not found or not active');
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
    if (!activeRun) return;

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

  private async handleWorkerError(runId: string, error: Error) {
    console.error(`Worker error for run ${runId}:`, error);
    await this.failRun(runId, { message: 'Worker error', error: error.message });
  }

  private async handleWorkerExit(runId: string, code: number) {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) return;

    // Clean up
    this.activeRuns.delete(runId);

    // If the worker exited with a non-zero code and the run isn't already completed/failed
    if (code !== 0) {
      const run = await Run.findById(runId);
      if (run && run.status === 'running') {
        await Run.findByIdAndUpdate(runId, {
          status: 'failed',
          completedAt: new Date()
        });
        this.emit('runFailed', { runId, error: `Worker exited with code ${code}` });
      }
    }
  }

  private async updateProgress(runId: string, progressData: IProgressMetrics) {
    await Run.findByIdAndUpdate(runId, {
      progress: progressData
    });
  }

  private async completeRun(runId: string, summaryData: IRunSummary) {
    await Run.findByIdAndUpdate(runId, {
      status: 'completed',
      completedAt: new Date(),
      summary: summaryData
    });

    // Remove from active runs
    this.activeRuns.delete(runId);

    this.emit('runCompleted', { runId, summary: summaryData });
  }

  private async failRun(runId: string, errorData: { message: string; error?: any }) {
    await Run.findByIdAndUpdate(runId, {
      status: 'failed',
      completedAt: new Date()
    });

    // Remove from active runs
    this.activeRuns.delete(runId);

    this.emit('runFailed', { runId, error: errorData });
  }

  // Cleanup method to stop all active runs
  async shutdown() {
    const promises = Array.from(this.activeRuns.keys()).map(runId => 
      this.stopRun(runId).catch(err => console.error(`Error stopping run ${runId}:`, err))
    );
    
    await Promise.all(promises);
  }
} 