/**
 * Centralized API client for AI Business Flow application
 * Provides typed functions for all backend endpoints with error handling and retry logic
 */

import {
  ProjectCreate,
  ProjectUpdate,
  ProjectResponse,
  HearingLogCreate,
  HearingLogUpdate,
  HearingLogResponse,
  FlowNodeCreate,
  FlowNodeUpdate,
  FlowNodeResponse,
  FlowReorderRequest,
  ApiError,
} from '@/types/api';
import { config } from './config';

// Configuration
const API_BASE_URL = config.apiUrl;
console.log(`[DEBUG] API_BASE_URL configured as: ${API_BASE_URL}`);
const DEFAULT_TIMEOUT = 5000; // 5 seconds (短縮してテスト)
const FLOW_GENERATION_TIMEOUT = 90000; // 90 seconds for AI flow generation
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Custom error class for API errors
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: Record<string, any>,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromResponse(response: Response, data?: any): ApiClientError {
    const isRetryable = response.status >= 500 || response.status === 408 || response.status === 429;
    
    if (data?.error) {
      const apiError = data as ApiError;
      return new ApiClientError(
        apiError.error.message,
        response.status,
        apiError.error.code,
        apiError.error.details,
        isRetryable
      );
    }
    
    return new ApiClientError(
      data?.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      undefined,
      undefined,
      isRetryable
    );
  }

  static fromNetworkError(error: Error): ApiClientError {
    return new ApiClientError(
      `Network error: ${error.message}`,
      undefined,
      'NETWORK_ERROR',
      undefined,
      true // Network errors are retryable
    );
  }

  static fromTimeout(): ApiClientError {
    return new ApiClientError(
      'Request timed out. Please check your connection and try again.',
      408,
      'TIMEOUT',
      undefined,
      true
    );
  }

  getUserFriendlyMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'TIMEOUT':
        return 'The request took too long to complete. Please try again.';
      case 'VALIDATION_ERROR':
        return this.message;
      default:
        if (this.status === 404) {
          return 'The requested resource was not found.';
        }
        if (this.status === 403) {
          return 'You do not have permission to perform this action.';
        }
        if (this.status === 401) {
          return 'Authentication required. Please refresh the page and try again.';
        }
        if (this.status && this.status >= 500) {
          return 'A server error occurred. Please try again in a moment.';
        }
        return this.message || 'An unexpected error occurred.';
    }
  }
}

// Utility function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor for consistent headers and error handling
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
  customTimeout?: number
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Add timeout using AbortController with custom timeout support
  const controller = new AbortController();
  const timeout = customTimeout || DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  requestOptions.signal = controller.signal;

  try {
    console.log(`[DEBUG] Making request to: ${url}`);
    console.log(`[DEBUG] Request options:`, requestOptions);
    console.log(`[DEBUG] Timeout set to: ${timeout}ms`);
    
    const response = await fetch(url, requestOptions);
    clearTimeout(timeoutId);
    
    console.log(`[DEBUG] Response received - Status: ${response.status}`);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw ApiClientError.fromResponse(response);
      }
      // For successful non-JSON responses (like DELETE operations)
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw ApiClientError.fromResponse(response, data);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error(`[DEBUG] Request failed:`, error);
    console.error(`[DEBUG] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    if (error instanceof Error) {
      console.error(`[DEBUG] Error name:`, error.name);
      console.error(`[DEBUG] Error message:`, error.message);
    }

    // Handle AbortError (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = ApiClientError.fromTimeout();
      
      if (retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY * (retryCount + 1));
        return makeRequest<T>(endpoint, options, retryCount + 1, customTimeout);
      }
      
      throw timeoutError;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = ApiClientError.fromNetworkError(error);
      
      if (retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY * (retryCount + 1));
        return makeRequest<T>(endpoint, options, retryCount + 1, customTimeout);
      }
      
      throw networkError;
    }

    // Handle API errors with retry logic
    if (error instanceof ApiClientError && error.isRetryable && retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return makeRequest<T>(endpoint, options, retryCount + 1, customTimeout);
    }

    // Re-throw ApiClientError as-is
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Wrap other errors
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

// Enhanced request function with user feedback
async function makeRequestWithFeedback<T>(
  endpoint: string,
  options: RequestInit = {},
  context?: string,
  customTimeout?: number
): Promise<T> {
  try {
    return await makeRequest<T>(endpoint, options, 0, customTimeout);
  } catch (error) {
    if (error instanceof ApiClientError) {
      // Add context to error message if provided
      if (context) {
        const contextualError = new ApiClientError(
          `${context}: ${error.getUserFriendlyMessage()}`,
          error.status,
          error.code,
          error.details,
          error.isRetryable
        );
        throw contextualError;
      }
    }
    throw error;
  }
}

// Project API functions
export const projectApi = {
  /**
   * Get all projects
   */
  async getProjects(): Promise<ProjectResponse[]> {
    return makeRequestWithFeedback<ProjectResponse[]>('/api/projects/', {}, 'Loading projects');
  },

  /**
   * Get a specific project by ID
   */
  async getProject(id: number): Promise<ProjectResponse> {
    return makeRequestWithFeedback<ProjectResponse>(`/api/projects/${id}/`, {}, 'Loading project');
  },

  /**
   * Create a new project
   */
  async createProject(project: ProjectCreate): Promise<ProjectResponse> {
    return makeRequestWithFeedback<ProjectResponse>('/api/projects/', {
      method: 'POST',
      body: JSON.stringify(project),
    }, 'Creating project');
  },

  /**
   * Update an existing project
   */
  async updateProject(id: number, updates: ProjectUpdate): Promise<ProjectResponse> {
    return makeRequestWithFeedback<ProjectResponse>(`/api/projects/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'Updating project');
  },

  /**
   * Delete a project
   */
  async deleteProject(id: number): Promise<void> {
    return makeRequestWithFeedback<void>(`/api/projects/${id}/`, {
      method: 'DELETE',
    }, 'Deleting project');
  },
};

// Hearing log API functions
export const hearingApi = {
  /**
   * Get hearing logs for a project
   */
  async getHearingLogs(projectId: number): Promise<HearingLogResponse[]> {
    return makeRequestWithFeedback<HearingLogResponse[]>(`/api/projects/${projectId}/hearing`, {}, 'Loading hearing logs');
  },

  /**
   * Add a new hearing log to a project
   */
  async addHearingLog(projectId: number, hearingLog: HearingLogCreate): Promise<HearingLogResponse> {
    return makeRequestWithFeedback<HearingLogResponse>(`/api/projects/${projectId}/hearing`, {
      method: 'POST',
      body: JSON.stringify(hearingLog),
    }, 'Saving hearing log');
  },

  /**
   * Update an existing hearing log
   */
  async updateHearingLog(id: number, updates: HearingLogUpdate): Promise<HearingLogResponse> {
    return makeRequestWithFeedback<HearingLogResponse>(`/api/hearing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'Updating hearing log');
  },

  /**
   * Delete a hearing log
   */
  async deleteHearingLog(id: number): Promise<void> {
    return makeRequestWithFeedback<void>(`/api/hearing/${id}`, {
      method: 'DELETE',
    }, 'Deleting hearing log');
  },
};

// Flow API functions
export const flowApi = {
  /**
   * Get flow nodes for a project
   */
  async getFlowNodes(projectId: number): Promise<FlowNodeResponse[]> {
    return makeRequestWithFeedback<FlowNodeResponse[]>(`/api/projects/${projectId}/flow`, {}, 'Loading flow diagram');
  },

  /**
   * Generate flow from hearing logs
   */
  async generateFlow(projectId: number): Promise<FlowNodeResponse[]> {
    return makeRequestWithFeedback<FlowNodeResponse[]>(`/api/projects/${projectId}/flow/generate`, {
      method: 'POST',
    }, 'Generating flow diagram', FLOW_GENERATION_TIMEOUT);
  },

  /**
   * Update a flow node
   */
  async updateFlowNode(id: number, updates: FlowNodeUpdate): Promise<FlowNodeResponse> {
    return makeRequestWithFeedback<FlowNodeResponse>(`/api/flow/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, 'Updating flow node');
  },

  /**
   * Add a new flow node
   */
  async addFlowNode(flowNode: FlowNodeCreate): Promise<FlowNodeResponse> {
    return makeRequestWithFeedback<FlowNodeResponse>('/api/flow/nodes', {
      method: 'POST',
      body: JSON.stringify(flowNode),
    }, 'Adding flow node');
  },

  /**
   * Delete a flow node
   */
  async deleteFlowNode(id: number): Promise<void> {
    return makeRequestWithFeedback<void>(`/api/flow/nodes/${id}`, {
      method: 'DELETE',
    }, 'Deleting flow node');
  },

  /**
   * Reorder flow nodes
   */
  async reorderFlowNodes(projectId: number, reorderRequest: FlowReorderRequest): Promise<FlowNodeResponse[]> {
    return makeRequestWithFeedback<FlowNodeResponse[]>(`/api/projects/${projectId}/flow/reorder`, {
      method: 'PUT',
      body: JSON.stringify(reorderRequest),
    }, 'Reordering flow nodes');
  },
};

// Combined API client export
export const api = {
  projects: projectApi,
  hearing: hearingApi,
  flow: flowApi,
};

export default api;