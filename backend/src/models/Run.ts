import mongoose, { Document, Schema } from 'mongoose';

export interface IRunSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageRps: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  duration: number; // seconds
}

export interface IProgressMetrics {
  currentRps: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  elapsedTime: number; // seconds
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

const RunSummarySchema = new Schema<IRunSummary>({
  totalRequests: { type: Number, required: true },
  successfulRequests: { type: Number, required: true },
  failedRequests: { type: Number, required: true },
  averageRps: { type: Number, required: true },
  p50Latency: { type: Number, required: true },
  p95Latency: { type: Number, required: true },
  p99Latency: { type: Number, required: true },
  errorRate: { type: Number, required: true },
  duration: { type: Number, required: true }
});

const ProgressMetricsSchema = new Schema<IProgressMetrics>({
  currentRps: { type: Number, default: 0 },
  totalRequests: { type: Number, default: 0 },
  successfulRequests: { type: Number, default: 0 },
  failedRequests: { type: Number, default: 0 },
  averageLatency: { type: Number, default: 0 },
  elapsedTime: { type: Number, default: 0 }
});

const RunSchema = new Schema<IRun>({
  specId: { type: String, required: true, ref: 'Spec' },
  status: { 
    type: String, 
    required: true, 
    enum: ['running', 'completed', 'stopped', 'failed'],
    default: 'running'
  },
  startedAt: { type: Date, required: true, default: Date.now },
  completedAt: { type: Date },
  summary: { type: RunSummarySchema },
  progress: { type: ProgressMetricsSchema, required: true, default: {} }
}, {
  timestamps: true
});

export const Run = mongoose.model<IRun>('Run', RunSchema); 