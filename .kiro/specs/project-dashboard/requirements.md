# Project Dashboard Requirements

## Introduction

This specification defines the requirements for a comprehensive project dashboard that serves as the main landing page for individual business process analysis projects. The dashboard provides navigation to key project functions and displays project status and recent activity.

## Glossary

- **Project_Dashboard**: The main landing page for an individual project, accessible at `/projects/[id]`
- **Project**: A business process analysis project containing hearing logs and flow diagrams
- **Hearing_Log**: User input describing business processes from interviews
- **Flow_Generation**: The process of creating visual flow diagrams from hearing logs
- **Navigation_Card**: Interactive UI elements that provide access to different project functions
- **Activity_Feed**: Display of recent project activities and updates

## Requirements

### Requirement 1: Project Dashboard Page Structure

**User Story:** As a user, I want a dedicated dashboard page for each project, so that I can access all project functions from a central location.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[id]`, THE System SHALL display a project-specific dashboard page
2. WHEN the project ID is invalid or not found, THE System SHALL display a user-friendly error message with navigation back to project list
3. THE System SHALL display the project dashboard with a clean, card-based layout following existing design patterns
4. WHEN loading project data, THE System SHALL show a loading spinner with appropriate messaging
5. THE System SHALL handle loading states gracefully and provide feedback during data fetching

### Requirement 2: Project Header Information

**User Story:** As a user, I want to see key project information at the top of the dashboard, so that I can quickly identify which project I'm viewing.

#### Acceptance Criteria

1. THE System SHALL display the project name as the main heading
2. THE System SHALL display the project department (if available) or default descriptive text
3. THE System SHALL display the project creation date in Japanese locale format
4. THE System SHALL format the header information consistently with other pages in the application
5. WHEN project information is missing, THE System SHALL provide appropriate fallback text

### Requirement 3: Hearing Input Navigation Card

**User Story:** As a user, I want easy access to the hearing input functionality, so that I can add and manage business process information.

#### Acceptance Criteria

1. THE System SHALL display a hearing input navigation card with appropriate icon and description
2. THE System SHALL show the current count of hearing logs for the project
3. THE System SHALL display the last update date when hearing logs exist
4. THE System SHALL provide a prominent button to navigate to the hearing input page (`/projects/[id]/hearing`)
5. THE System SHALL use consistent styling with other navigation cards

### Requirement 4: Flow Editor Navigation Card

**User Story:** As a user, I want easy access to the flow editor functionality, so that I can create and edit business process diagrams.

#### Acceptance Criteria

1. THE System SHALL display a flow editor navigation card with appropriate icon and description
2. THE System SHALL show the current flow generation status (available/requires hearing input)
3. THE System SHALL provide a button to navigate to the flow editor page (`/projects/[id]/flow`)
4. THE System SHALL provide a button to generate new flows when hearing logs are available
5. WHEN no hearing logs exist, THE System SHALL disable flow generation and show explanatory text

### Requirement 5: Flow Generation Functionality

**User Story:** As a user, I want to generate new business flows directly from the dashboard, so that I can quickly create diagrams from my hearing input.

#### Acceptance Criteria

1. WHEN hearing logs exist, THE System SHALL enable the "新しいフローを生成" (Generate New Flow) button
2. WHEN the generate button is clicked, THE System SHALL call the flow generation API
3. WHEN flow generation is in progress, THE System SHALL show loading state with spinner and disable the button
4. WHEN flow generation succeeds, THE System SHALL navigate to the flow editor page
5. WHEN flow generation fails, THE System SHALL display an error message and allow retry

### Requirement 6: Recent Activity Display

**User Story:** As a user, I want to see recent project activity on the dashboard, so that I can quickly review what has been done recently.

#### Acceptance Criteria

1. WHEN hearing logs exist, THE System SHALL display a "Recent Activity" section
2. THE System SHALL show the 3 most recent hearing logs with content preview
3. THE System SHALL display creation date and time for each activity item
4. THE System SHALL provide a link to view all hearing logs when more than 3 exist
5. THE System SHALL truncate long content with appropriate ellipsis

### Requirement 7: Empty State Handling

**User Story:** As a user, I want clear guidance when starting a new project, so that I know what steps to take first.

#### Acceptance Criteria

1. WHEN no hearing logs exist, THE System SHALL display an encouraging empty state message
2. THE System SHALL provide a prominent call-to-action button to start hearing input
3. THE System SHALL explain the recommended workflow (hearing input first, then flow generation)
4. THE System SHALL use appropriate iconography and messaging to guide user actions
5. THE System SHALL maintain visual consistency with the rest of the application

### Requirement 8: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN API calls fail, THE System SHALL display user-friendly error messages
2. WHEN network errors occur, THE System SHALL provide retry options where appropriate
3. WHEN flow generation fails, THE System SHALL show specific error messaging
4. THE System SHALL handle timeout errors gracefully with appropriate messaging
5. THE System SHALL provide navigation options when errors prevent normal operation

### Requirement 9: Responsive Design and Accessibility

**User Story:** As a user, I want the dashboard to work well on different screen sizes, so that I can access it from various devices.

#### Acceptance Criteria

1. THE System SHALL implement responsive design using CSS Grid and Flexbox
2. THE System SHALL adapt the card layout for mobile and tablet screens
3. THE System SHALL maintain readability and usability across different viewport sizes
4. THE System SHALL provide appropriate touch targets for mobile interaction
5. THE System SHALL follow accessibility best practices for navigation and content

### Requirement 10: Performance and Loading States

**User Story:** As a user, I want the dashboard to load quickly and provide feedback during operations, so that I have a smooth experience.

#### Acceptance Criteria

1. THE System SHALL load project data and hearing logs in parallel for optimal performance
2. THE System SHALL show loading spinners during data fetching operations
3. THE System SHALL handle partial data loading gracefully (project loads, hearing logs fail)
4. THE System SHALL provide appropriate timeout handling for slow network conditions
5. THE System SHALL cache project data appropriately to improve subsequent load times

## Technical Implementation Notes

### API Integration
- Uses `api.projects.getProject(id)` for individual project data
- Uses `hearingApi.getHearingLogs(projectId)` for hearing log data
- Uses `flowApi.generateFlow(projectId)` for flow generation
- Implements proper error handling and retry logic

### Component Dependencies
- `LoadingSpinner` component for loading states
- Consistent styling with existing project components
- Integration with Next.js routing for navigation

### Data Flow
- Parallel loading of project and hearing log data
- Graceful handling of missing or failed data requests
- Real-time updates during flow generation process

## Success Metrics

1. Users can navigate to project dashboard without 404 errors
2. All project information displays correctly and consistently
3. Navigation to hearing and flow pages works reliably
4. Flow generation completes successfully from dashboard
5. Error states provide clear guidance for user actions
6. Loading states provide appropriate feedback during operations

## Out of Scope

- Real-time collaboration features
- Project sharing and permissions
- Advanced analytics and reporting
- Integration with external project management tools
- Bulk operations on multiple projects