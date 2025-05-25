import mongoose, { Document, Schema } from 'mongoose';

export interface ILoadProfile {
  rampUp: number;    // seconds
  users: number;     // concurrent users
  steady: number;    // seconds
  rampDown: number;  // seconds
  requestsPerSecond?: number; // requests per second per user
  testType?: 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
}

export interface IRequestConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: string;
  attachmentId?: string;
}

export interface ISpec extends Document {
  name: string;
  request: IRequestConfig;
  loadProfile: ILoadProfile;
  attachmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoadProfileSchema = new Schema<ILoadProfile>({
  rampUp: { type: Number, required: true, min: 0 },
  users: { type: Number, required: true, min: 1 },
  steady: { type: Number, required: true, min: 0 },
  rampDown: { type: Number, required: true, min: 0 },
  requestsPerSecond: { type: Number, min: 0.1, default: 1 },
  testType: { type: String, enum: ['smoke', 'load', 'stress', 'spike', 'soak'], default: 'load' }
});

const RequestConfigSchema = new Schema<IRequestConfig>({
  method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  url: { type: String, required: true },
  headers: { type: Map, of: String, default: {} },
  queryParams: { type: Map, of: String, default: {} },
  body: { type: String },
  attachmentId: { type: String }
});

const SpecSchema = new Schema<ISpec>({
  name: { type: String, required: true, trim: true },
  request: { type: RequestConfigSchema, required: true },
  loadProfile: { type: LoadProfileSchema, required: true },
  attachmentId: { type: String }
}, {
  timestamps: true
});

export const Spec = mongoose.model<ISpec>('Spec', SpecSchema); 