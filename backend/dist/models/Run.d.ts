import mongoose, { Document } from 'mongoose';
export interface IRunSummary {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageRps: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    duration: number;
}
export interface IProgressMetrics {
    currentRps: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    elapsedTime: number;
}
export interface IRun extends Document {
    specId: string;
    status: 'running' | 'completed' | 'stopped' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    summary?: IRunSummary;
    progress: IProgressMetrics;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Run: mongoose.Model<IRun, {}, {}, {}, mongoose.Document<unknown, {}, IRun, {}> & IRun & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Run.d.ts.map