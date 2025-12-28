# Requirements Document

## Introduction

This system enables business DX/improvement personnel at companies to organize hearing content, understand the overall business structure, and reach a state where they can formulate specific improvement proposals in their own words. The AI acts as an organizer that generates editable drafts (60-point business flows) rather than providing "correct answers" or "improvement proposals."

## Glossary

- **System**: The AI Business Flow application
- **User**: Business DX/improvement personnel at companies
- **Project**: A business process analysis project containing hearing logs and flow diagrams
- **Hearing_Log**: User input describing business processes from interviews
- **Flow_Node**: Individual steps in a business process flow diagram
- **AI_Generator**: The AI service that converts hearing logs into structured flow diagrams

## Requirements

### Requirement 1: Project Management

**User Story:** As a user, I want to create and manage business process analysis projects, so that I can organize multiple business improvement initiatives.

#### Acceptance Criteria

1. WHEN a user visits the main page, THE System SHALL display a list of existing projects with their status and last update time
2. WHEN a user clicks "add new business process", THE System SHALL create a new project with draft status
3. WHEN a project is created, THE System SHALL allow the user to edit the project name at any time
4. THE System SHALL automatically save all project changes without requiring a save button
5. WHEN displaying projects, THE System SHALL show project name, status (draft), and relative update time

### Requirement 2: Hearing Input Management

**User Story:** As a user, I want to input and manage hearing content from business process interviews, so that I can capture the raw information needed for flow generation.

#### Acceptance Criteria

1. WHEN a user navigates to a project's hearing page, THE System SHALL display a text input interface for hearing content
2. WHEN a user enters hearing content, THE System SHALL store it as a timestamped hearing log entry
3. WHEN hearing content is entered, THE System SHALL automatically save the content without user action
4. THE System SHALL display existing hearing log entries in chronological order
5. WHEN displaying the hearing input interface, THE System SHALL show encouraging text indicating accuracy is not required

### Requirement 3: AI Flow Generation

**User Story:** As a user, I want the AI to generate business flow diagrams from my hearing input, so that I can visualize the business process structure.

#### Acceptance Criteria

1. WHEN hearing logs exist for a project, THE AI_Generator SHALL convert them into a structured flow diagram
2. WHEN generating flows, THE AI_Generator SHALL create between 5 and 8 flow nodes
3. WHEN generating flows, THE AI_Generator SHALL create linear flows without branching or conditional logic
4. THE AI_Generator SHALL output flow data as JSON containing text and order information
5. THE AI_Generator SHALL NOT provide improvement suggestions, evaluations, or scoring

### Requirement 4: Flow Editing and Manipulation

**User Story:** As a user, I want to edit and modify the generated business flow, so that I can refine it to match my understanding of the process.

#### Acceptance Criteria

1. WHEN a user views a flow diagram, THE System SHALL display flow nodes in vertical sequence with connecting lines
2. WHEN a user hovers over a flow node, THE System SHALL display edit and delete options
3. WHEN a user clicks edit on a node, THE System SHALL allow inline text editing of the node content
4. WHEN a user drags a flow node, THE System SHALL allow reordering of the flow sequence
5. WHEN a user clicks delete on a node, THE System SHALL remove the node from the flow
6. WHEN a user clicks "add business step", THE System SHALL insert a new editable node in the flow
7. THE System SHALL provide an undo function for the most recent operation only
8. THE System SHALL automatically save all flow modifications without requiring user action

### Requirement 5: User Interface and Experience

**User Story:** As a user, I want a clean and intuitive interface, so that I can focus on understanding and improving business processes without interface complexity.

#### Acceptance Criteria

1. THE System SHALL implement a modern, minimal design with ample whitespace and card-based layouts
2. WHEN users interact with the interface, THE System SHALL provide response times between 0.3 and 0.5 seconds
3. THE System SHALL implement a three-screen structure: project list, hearing input, and flow editing
4. WHEN displaying any interface, THE System SHALL avoid overwhelming users with too many options
5. THE System SHALL provide encouraging messaging that emphasizes progress over perfection

### Requirement 6: Data Persistence and Management

**User Story:** As a user, I want my work to be automatically saved and persisted, so that I never lose progress on my business process analysis.

#### Acceptance Criteria

1. THE System SHALL automatically save all user input and modifications without save buttons
2. WHEN data is modified, THE System SHALL persist changes to the database immediately
3. THE System SHALL maintain project metadata including creation and update timestamps
4. THE System SHALL store hearing logs with timestamps for chronological ordering
5. THE System SHALL maintain flow node order and content across sessions

### Requirement 7: System Architecture and Security

**User Story:** As a system administrator, I want secure and maintainable system architecture, so that the application can be deployed and operated safely.

#### Acceptance Criteria

1. THE System SHALL implement a Next.js frontend with TypeScript and Tailwind CSS
2. THE System SHALL implement a FastAPI backend with Python 3.11+
3. THE System SHALL use Azure Database for MySQL for data persistence
4. THE System SHALL store all sensitive configuration in environment variables
5. THE System SHALL never expose API keys or database credentials to the frontend
6. WHEN environment variables are missing, THE System SHALL fail to start with clear error messages

### Requirement 8: MVP Scope and Limitations

**User Story:** As a product owner, I want clear boundaries on MVP functionality, so that development stays focused on core value delivery.

#### Acceptance Criteria

1. THE System SHALL NOT implement sharing, commenting, or approval workflows
2. THE System SHALL NOT provide automatic improvement suggestions, evaluations, or scoring
3. THE System SHALL NOT implement branching, conditional logic, or if/else flow structures
4. THE System SHALL NOT implement organization management, permissions, or notifications
5. THE System SHALL NOT implement estimation or requirements definition features