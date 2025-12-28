# Requirements Document

## Introduction

This specification defines the requirement to display hearing logs with sequential numbering (1, 2, 3...) instead of database IDs, ensuring continuous numbering even after record deletions.

## Glossary

- **Hearing_Log**: A record containing user input from business process interviews
- **Sequential_Number**: A continuous numbering system starting from 1, without gaps
- **Display_Order**: The order in which hearing logs are presented to users (newest first)
- **Database_ID**: The unique identifier stored in the database (may have gaps after deletions)

## Requirements

### Requirement 1: Sequential Numbering Display

**User Story:** As a user, I want to see hearing logs numbered sequentially (1, 2, 3...), so that I can easily reference them without confusion from gaps in numbering.

#### Acceptance Criteria

1. WHEN displaying hearing logs, THE System SHALL show sequential numbers starting from 1
2. WHEN hearing logs are sorted by creation date (newest first), THE System SHALL assign number 1 to the most recent log
3. WHEN a hearing log is deleted, THE System SHALL renumber remaining logs to maintain sequential order
4. THE System SHALL display sequential numbers instead of database IDs in the user interface
5. WHEN new hearing logs are added, THE System SHALL assign the next sequential number in the display

### Requirement 2: Consistent Numbering After Deletions

**User Story:** As a user, I want the numbering to remain continuous after deleting hearing logs, so that there are no confusing gaps in the sequence.

#### Acceptance Criteria

1. WHEN a hearing log is deleted from the middle of the list, THE System SHALL renumber all remaining logs
2. WHEN the first hearing log is deleted, THE System SHALL renumber all remaining logs starting from 1
3. WHEN the last hearing log is deleted, THE System SHALL maintain proper numbering for remaining logs
4. THE System SHALL ensure no gaps exist in the sequential numbering after any deletion operation

### Requirement 3: Visual Consistency

**User Story:** As a user, I want the numbering format to be consistent and clear, so that I can easily identify and reference specific hearing logs.

#### Acceptance Criteria

1. THE System SHALL display sequential numbers with a "#" prefix (e.g., "#1", "#2", "#3")
2. THE System SHALL maintain the same visual styling for sequential numbers as currently used for database IDs
3. WHEN hovering over hearing logs, THE System SHALL maintain the same interaction behavior regardless of numbering changes