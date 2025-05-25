import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types
export interface LoadProfile {
  rampUp: number;
  users: number;
  steady: number;
  rampDown: number;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: string;
  attachmentId?: string;
}

export interface Spec {
  _id?: string;
  name: string;
  request: RequestConfig;
  loadProfile: LoadProfile;
  attachmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RunSummary {
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

export interface ProgressMetrics {
  currentRps: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  elapsedTime: number;
}

export interface Run {
  _id: string;
  specId: string;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  startedAt: string;
  completedAt?: string;
  summary?: RunSummary;
  progress: ProgressMetrics;
  createdAt: string;
  updatedAt: string;
}

// API functions
export const specsApi = {
  // Get all specs
  getAll: () => api.get<{ specs: Spec[] }>('/specs'),
  
  // Get spec by ID
  getById: (id: string) => api.get<{ spec: Spec }>(`/specs/${id}`),
  
  // Create new spec
  create: (spec: Omit<Spec, '_id' | 'createdAt' | 'updatedAt'>) => 
    api.post<{ spec: Spec }>('/specs', spec),
  
  // Update spec
  update: (id: string, spec: Partial<Spec>) => 
    api.put<{ spec: Spec }>(`/specs/${id}`, spec),
  
  // Delete spec
  delete: (id: string) => api.delete(`/specs/${id}`),
};

export const runsApi = {
  // Get all runs
  getAll: () => api.get<{ runs: Run[] }>('/runs'),
  
  // Get run by ID
  getById: (id: string) => api.get<{ run: Run }>(`/runs/${id}`),
  
  // Start new run
  start: (specId: string) => 
    api.post<{ runId: string; message: string }>(`/runs/${specId}`),
  
  // Stop run
  stop: (id: string) => api.delete(`/runs/${id}`),
  
  // Get active runs
  getActive: () => api.get('/runs/active'),
  
  // Download CSV
  downloadCsv: (id: string) => api.get(`/runs/${id}/csv`, { responseType: 'blob' }),
};

export const attachmentsApi = {
  // Upload file
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post<{ fileId: string; filename: string; message: string }>(
      '/attachments',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },
  
  // Download file
  download: (id: string) => api.get(`/attachments/${id}`, { responseType: 'blob' }),
  
  // Get file info
  getInfo: (id: string) => api.get(`/attachments/${id}/info`),
  
  // Delete file
  delete: (id: string) => api.delete(`/attachments/${id}`),
};

export default api; 