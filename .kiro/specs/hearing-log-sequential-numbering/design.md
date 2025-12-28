# Design Document: Sequential Numbering for Hearing Logs

## Overview

This design implements sequential numbering for hearing logs in the user interface, replacing database IDs with continuous numbers (1, 2, 3...) that remain consistent even after record deletions. The implementation focuses on frontend display logic while maintaining existing backend functionality.

## Architecture

The sequential numbering will be implemented as a frontend display feature that:
- Calculates sequential numbers based on the sorted order of hearing logs
- Updates numbering dynamically when logs are added or deleted
- Maintains existing backend API structure without changes
- Preserves all current functionality while improving user experience

## Components and Interfaces

### Frontend Components

**HearingHistory Component**
- **Current**: Displays `#{log.id}` using database ID
- **Updated**: Displays `#{index + 1}` using array position
- **Input**: Array of hearing logs sorted by creation date (newest first)
- **Output**: Sequential numbers starting from 1 for the newest log

**No Backend Changes Required**
- Database schema remains unchanged
- API endpoints continue to use database IDs for operations
- Sequential numbers are purely for display purposes

## Data Models

### Current Data Flow
```
Database → API Response → Frontend Display
HearingLog.id → log.id → #{log.id}
```

### Updated Data Flow
```
Database → API Response → Frontend Processing → Display
HearingLog.id → log.id → sortedLogs[index] → #{index + 1}
```

### Sequential Number Calculation
```typescript
// Hearing logs are already sorted by creation date (newest first)
const sortedLogs = [...hearingLogs].sort((a, b) => 
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

// Sequential number = array index + 1
const sequentialNumber = index + 1;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sequential Numbering Consistency
*For any* list of hearing logs, when displayed in chronological order (newest first), the sequential numbers should start from 1 and increment by 1 for each subsequent log without gaps.
**Validates: Requirements 1.1, 1.2**

### Property 2: Numbering Stability After Deletion
*For any* hearing log deletion operation, the remaining logs should maintain sequential numbering starting from 1 with no gaps in the sequence.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Display Format Consistency
*For any* hearing log with a sequential number, the display format should be "#" followed by the number (e.g., "#1", "#2").
**Validates: Requirements 3.1**

## Error Handling

### Edge Cases
- **Empty List**: When no hearing logs exist, no numbering is displayed
- **Single Item**: When only one hearing log exists, it displays as "#1"
- **After All Deletions**: When all logs are deleted, the next added log starts at "#1"

### Error Prevention
- Sequential numbers are calculated from array indices, preventing negative or zero values
- Array bounds checking ensures no out-of-range access
- Fallback to database ID if calculation fails (graceful degradation)

## Testing Strategy

### Unit Tests
- Test sequential number calculation with various array sizes
- Test numbering after simulated deletions
- Test edge cases (empty arrays, single items)
- Test display format consistency

### Property-Based Tests
- Generate random arrays of hearing logs and verify sequential numbering
- Test deletion scenarios with random log removal
- Verify numbering consistency across different sorting orders

### Integration Tests
- Test complete user workflow: add logs → delete logs → verify numbering
- Test interaction with existing edit and delete functionality
- Verify no impact on backend operations

## Implementation Notes

### Minimal Changes Required
- Only the HearingHistory component needs modification
- Change `#{log.id}` to `#{index + 1}` in the display logic
- No database migrations or API changes needed
- Existing tests need minor updates for new display format

### Backward Compatibility
- All existing functionality remains intact
- Database operations continue using actual IDs
- Edit and delete operations work unchanged
- Only the visual display is modified