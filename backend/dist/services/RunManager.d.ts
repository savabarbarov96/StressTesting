import { EventEmitter } from 'events';
export declare class RunManager extends EventEmitter {
    private activeRuns;
    private maxConcurrentRuns;
    private workerTimeout;
    constructor(maxConcurrentRuns?: number);
    private getWorkerPath;
    startRun(specId: string): Promise<string>;
    private validateSpec;
    private handleWorkerTimeout;
    stopRun(runId: string): Promise<void>;
    listActive(): Array<{
        runId: string;
        specId: string;
        startTime: Date;
        elapsedTime: number;
    }>;
    private handleWorkerMessage;
    private handleWorkerError;
    private handleWorkerExit;
    private updateProgress;
    private completeRun;
    private failRun;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=RunManager.d.ts.map