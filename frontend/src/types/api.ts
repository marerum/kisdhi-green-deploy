/**
 * TypeScript types for API requests and responses
 * Based on backend Pydantic schemas
 */

export interface ProjectCreate {
  name: string;
  department?: string;
}

export interface ProjectUpdate {
  name?: string;
  department?: string;
  status?: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  department?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HearingLogCreate {
  content: string;
}

export interface HearingLogUpdate {
  content: string;
}

export interface HearingLogResponse {
  id: number;
  project_id: number;
  content: string;
  created_at: string;
}

export interface FlowNodeCreate {
  project_id: number;
  text: string;
  order: number;
}

export interface FlowNodeUpdate {
  text: string;
}

export interface FlowNodeResponse {
  id: number;
  project_id: number;
  text: string;
  order: number;
  actor?: string;
  step?: string;
  position_x?: number;
  position_y?: number;
  created_at: string;
  updated_at: string;
}

export interface ActorSchema {
  name: string;
  role: string;
}

export interface StepSchema {
  name: string;
  description: string;
}

export interface FlowGenerationResponse {
  actors: ActorSchema[];
  steps: StepSchema[];
  flow_nodes: FlowNodeResponse[];
}

export interface FlowReorderRequest {
  node_orders: Array<{ id: number; order: number }>;
}

export interface ProjectWithDetails extends ProjectResponse {
  hearing_logs: HearingLogResponse[];
  flow_nodes: FlowNodeResponse[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}