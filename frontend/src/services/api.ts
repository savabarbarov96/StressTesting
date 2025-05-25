import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';

// Enhanced error interface
interface ApiError {
  message: string;
  details?: unknown;
  timestamp?: string;
  requestId?: string;
  statusCode?: number;
}

// Extend axios types to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: number;
    };
  }
  
  interface AxiosError {
    apiError?: ApiError;
  }
}

// Backend error response interface
interface BackendErrorResponse {
  error: string;
  details?: unknown;
  timestamp?: string;
  requestId?: string;
}



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
    const requestId = Math.random().toString(36).substring(7);
    config.metadata = { requestId, startTime: Date.now() };
    console.log(`🚀 [${requestId}] API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const requestId = response.config.metadata?.requestId;
    const duration = Date.now() - (response.config.metadata?.startTime || 0);
    console.log(`✅ [${requestId}] API Response: ${response.status} (${duration}ms)`);
    return response;
  },
  (error: AxiosError) => {
    const requestId = error.config?.metadata?.requestId;
    const duration = Date.now() - (error.config?.metadata?.startTime || 0);
    
    // Enhanced error logging
    console.error(`❌ [${requestId}] API Error (${duration}ms):`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      message: error.message
    });

    // Create user-friendly error message
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      statusCode: error.response?.status,
      requestId
    };

    if (error.response?.data) {
      const errorData = error.response.data as BackendErrorResponse;
      
      // Handle structured error responses from backend
      if (errorData.error) {
        apiError.message = errorData.error;
        apiError.details = errorData.details;
        apiError.timestamp = errorData.timestamp;
        apiError.requestId = errorData.requestId || requestId;
      } else if (typeof errorData === 'string') {
        apiError.message = errorData;
      }
    } else if (error.code === 'ECONNABORTED') {
      apiError.message = 'Request timed out. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      apiError.message = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      apiError.message = error.message;
    }

    // Add status-specific messages
    switch (error.response?.status) {
      case 400:
        if (!apiError.details) {
          apiError.message = 'Invalid request. Please check your input and try again.';
        }
        break;
      case 401:
        apiError.message = 'Authentication required. Please log in and try again.';
        break;
      case 403:
        apiError.message = 'Access denied. You do not have permission to perform this action.';
        break;
      case 404:
        if (!apiError.message.includes('not found')) {
          apiError.message = 'The requested resource was not found.';
        }
        break;
      case 429:
        if (!apiError.message.includes('concurrent')) {
          apiError.message = 'Too many requests. Please wait a moment and try again.';
        }
        break;
      case 500:
        if (!apiError.details) {
          apiError.message = 'Server error. Please try again later.';
        }
        break;
      case 503:
        apiError.message = 'Service temporarily unavailable. Please try again later.';
        break;
    }

    // Attach the enhanced error to the original error object
    error.apiError = apiError;
    
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
  error?: {
    message: string;
    details?: unknown;
    stack?: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Helper function to extract user-friendly error message
export const getErrorMessage = (error: AxiosError | Error | unknown): string => {
  if (error && typeof error === 'object' && 'apiError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.apiError?.message || 'An unexpected error occurred';
  }
  
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data as BackendErrorResponse;
    if (responseData?.error) {
      return responseData.error;
    }
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as Error).message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Helper function to get error details for debugging
export const getErrorDetails = (error: AxiosError | Error | unknown): unknown => {
  if (error && typeof error === 'object' && 'apiError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.apiError?.details || null;
  }
  
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data as BackendErrorResponse;
    return responseData?.details || null;
  }
  
  return null;
};

// API functions with enhanced error handling
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
    api.post<{ runId: string; message: string; timestamp: string; requestId: string }>(`/runs/${specId}`),
  
  // Stop run
  stop: (id: string) => api.delete(`/runs/${id}`),
  
  // Delete run
  delete: (id: string) => api.delete(`/runs/${id}/delete`),
  
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
        timeout: 60000, // Longer timeout for file uploads
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

export interface HealthStatus {
  status: string;
  timestamp: string;
  activeRuns: number;
}

export const healthApi = {
  // Check backend health
  check: () => api.get<HealthStatus>('/health'),
};

// Export the enhanced error type
export type { ApiError };

export default api; 