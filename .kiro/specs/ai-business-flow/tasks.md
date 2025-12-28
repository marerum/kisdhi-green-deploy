# Implementation Plan: AI Business Flow

## Overview

This implementation plan creates an AI-powered business flow creation application with a three-screen MVP: project management, hearing input, and flow editing. The system uses Next.js with TypeScript for the frontend, FastAPI with Python for the backend, and integrates with OpenAI for flow generation.

## Tasks

- [x] 1. Set up project structure and development environment
  - Create frontend directory with Next.js App Router and TypeScript configuration
  - Create backend directory with FastAPI and Python 3.11+ setup
  - Configure Tailwind CSS for frontend styling
  - Set up environment variable templates (.env.local for frontend, .env for backend)
  - Create basic project documentation and README
  - _Requirements: 7.1, 7.2, 7.4_

- [-] 2. Implement database models and configuration
  - [x] 2.1 Set up SQLAlchemy database configuration and connection
    - Configure Azure MySQL database connection with connection pooling
    - Create database session management and dependency injection
    - _Requirements: 7.3, 7.4_

  - [x] 2.2 Create SQLAlchemy models for Project, HearingLog, and FlowNode
    - Implement Project model with relationships to hearing logs and flow nodes
    - Implement HearingLog model with foreign key to Project
    - Implement FlowNode model with project relationship and ordering
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 2.3 Write property test for data model relationships
    - **Property 8: Data Integrity and Timestamps**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 3. Create backend API foundation
  - [x] 3.1 Set up FastAPI application with basic configuration
    - Configure FastAPI app with CORS, middleware, and error handling
    - Implement environment variable validation and startup checks
    - Create Pydantic schemas for request/response models
    - _Requirements: 7.2, 7.4, 7.6_

  - [x] 3.2 Implement project management API endpoints
    - Create GET /api/projects endpoint for listing projects
    - Create POST /api/projects endpoint for project creation
    - Create PUT /api/projects/{id} endpoint for project updates
    - Create DELETE /api/projects/{id} endpoint for project deletion
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.3 Write property tests for project API endpoints
    - **Property 1: Project Creation Consistency**
    - **Property 2: Automatic Data Persistence**
    - **Validates: Requirements 1.2, 1.3, 1.4, 2.3, 4.8, 6.1, 6.2**

- [x] 4. Implement hearing log functionality
  - [x] 4.1 Create hearing log API endpoints
    - Create GET /api/projects/{id}/hearing endpoint for retrieving hearing logs
    - Create POST /api/projects/{id}/hearing endpoint for adding hearing logs
    - Create PUT /api/hearing/{id} endpoint for updating hearing log content
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Implement automatic saving for hearing logs
    - Add automatic persistence without save buttons
    - Implement timestamped storage for chronological ordering
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 4.3 Write property tests for hearing log functionality
    - **Property 3: Hearing Log Storage and Ordering**
    - **Validates: Requirements 2.2, 2.4**

- [x] 5. Integrate OpenAI for flow generation
  - [x] 5.1 Set up OpenAI client and AI service
    - Configure AsyncOpenAI client with API key from environment
    - Implement AI service with lifespan event initialization
    - Create prompt templates for business flow generation
    - _Requirements: 3.1, 3.4, 7.5_

  - [x] 5.2 Implement AI flow generation logic
    - Create flow generation endpoint POST /api/projects/{id}/flow/generate
    - Implement AI response parsing and validation
    - Ensure output contains 5-8 linear nodes without branching
    - Validate AI responses don't contain improvement suggestions or scoring
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Write property tests for AI flow generation
    - **Property 4: AI Flow Generation Constraints**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 8.2, 8.3**

- [x] 6. Implement flow editing functionality
  - [x] 6.1 Create flow node management API endpoints
    - Create GET /api/projects/{id}/flow endpoint for retrieving flow nodes
    - Create PUT /api/flow/nodes/{id} endpoint for updating node content
    - Create POST /api/flow/nodes endpoint for adding new nodes
    - Create DELETE /api/flow/nodes/{id} endpoint for deleting nodes
    - Create PUT /api/projects/{id}/flow/reorder endpoint for reordering nodes
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [x] 6.2 Implement undo functionality for flow operations
    - Add operation history tracking for the most recent action
    - Implement undo endpoint and logic
    - _Requirements: 4.7_

  - [x] 6.3 Write property tests for flow manipulation
    - **Property 5: Flow Node Manipulation**
    - **Property 7: Undo Functionality**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.7**

- [x] 7. Checkpoint - Backend API completion
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 8. Create frontend API client and utilities
  - [x] 8.1 Implement centralized API client in lib/api.ts
    - Create typed API client functions for all backend endpoints
    - Implement error handling and retry logic
    - Add request/response interceptors for consistent error handling
    - _Requirements: 7.1_

  - [x] 8.2 Set up frontend project structure and routing
    - Configure Next.js App Router with three main routes
    - Create layout component with consistent navigation
    - Set up Tailwind CSS configuration and base styles
    - _Requirements: 5.3, 7.1_

  - [x] 8.3 Write unit tests for API client
    - Test error handling and retry mechanisms
    - Test request/response formatting
    - _Requirements: 7.1_

- [x] 9. Implement project management frontend
  - [x] 9.1 Create project list page (Screen ①)
    - Implement ProjectList component with card-based layout
    - Add project creation functionality with inline name editing
    - Display project status, name, and relative update times
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 9.2 Add automatic saving for project changes
    - Implement auto-save functionality without save buttons
    - Add loading states and user feedback
    - _Requirements: 1.4, 5.2_

  - [x] 9.3 Write unit tests for project management components
    - Test project creation and editing workflows
    - Test automatic saving behavior
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 10. Implement hearing input frontend
  - [x] 10.1 Create hearing input page (Screen ②)
    - Implement HearingInput component with text area
    - Add HearingHistory component for chronological display
    - Include encouraging text about accuracy not being required
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 10.2 Add automatic saving for hearing content
    - Implement real-time auto-save as user types
    - Add timestamped storage and chronological ordering
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 10.3 Write unit tests for hearing input components
    - Test automatic saving and content persistence
    - Test chronological display of hearing logs
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [-] 11. Implement flow editing frontend
  - [x] 11.1 Create flow diagram page (Screen ③)
    - Implement FlowDiagram component with vertical node layout
    - Add connecting lines between flow nodes
    - Implement hover states for edit/delete options
    - _Requirements: 4.1, 4.2_

  - [x] 11.2 Add flow node editing capabilities
    - Implement inline text editing for node content
    - Add drag-and-drop reordering functionality
    - Implement node deletion with confirmation
    - Add "add business step" functionality
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [x] 11.3 Implement undo functionality in frontend
    - Add undo button and keyboard shortcut
    - Track most recent operation for undo capability
    - _Requirements: 4.7_

  - [x] 11.4 Add automatic saving for flow modifications
    - Implement auto-save for all flow changes
    - Add optimistic updates with error handling
    - _Requirements: 4.8_

  - [x] 11.5 Write property tests for flow editing
    - **Property 6: Flow Display and Interaction**
    - **Validates: Requirements 4.1, 4.2, 4.6**

  - [x] 11.6 Write unit tests for flow editing components
    - Test drag-and-drop reordering functionality
    - Test inline editing and node manipulation
    - Test undo functionality and automatic saving
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 12. Implement AI flow generation integration
  - [x] 12.1 Connect frontend to AI flow generation
    - Add flow generation trigger in hearing input page
    - Implement loading states during AI processing
    - Handle AI generation errors gracefully
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 12.2 Validate and display generated flows
    - Ensure generated flows meet 5-8 node requirement
    - Validate linear structure without branching
    - Display generated flows in flow editing interface
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 12.3 Write integration tests for AI flow generation
    - Test end-to-end flow generation from hearing logs
    - Test error handling for AI service failures
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 13. Implement security and configuration validation
  - [x] 13.1 Add environment variable validation
    - Implement startup checks for required environment variables
    - Ensure API keys are never exposed to frontend
    - Add clear error messages for missing configuration
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 13.2 Write property tests for security requirements
    - **Property 9: Security and Configuration**
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [x] 14. Add comprehensive error handling
  - [x] 14.1 Implement frontend error boundaries and user feedback
    - Add error boundaries for React components
    - Implement user-friendly error messages
    - Add retry mechanisms for failed operations
    - _Requirements: 5.2_

  - [x] 14.2 Enhance backend error handling
    - Add comprehensive API error responses
    - Implement database error handling and recovery
    - Add OpenAI API timeout and error handling
    - _Requirements: 7.2, 7.3_

  - [x] 14.3 Write unit tests for error handling
    - Test error boundary functionality
    - Test API error response handling
    - Test database connection error recovery
    - _Requirements: 5.2, 7.2, 7.3_

- [x] 15. Final integration and testing
  - [x] 15.1 Perform end-to-end testing of complete user workflows
    - Test complete project creation to flow editing workflow
    - Verify automatic saving across all screens
    - Test AI generation with various hearing log inputs
    - _Requirements: 1.1, 2.1, 4.1_

  - [x] 15.2 Validate MVP scope limitations
    - Ensure no sharing, commenting, or approval features exist
    - Verify no improvement suggestions or scoring in AI output
    - Confirm no branching or conditional logic in flows
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 15.3 Write property tests for display requirements
    - **Property 10: Project Display Information**
    - **Validates: Requirements 1.5**

- [x] 16. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the three-screen structure: project list → hearing input → flow editing
- All sensitive configuration is handled through environment variables
- Automatic saving is implemented throughout without save buttons