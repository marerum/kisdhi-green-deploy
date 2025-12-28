# Implementation Plan: Sequential Numbering for Hearing Logs

## Overview

This implementation plan adds sequential numbering (1, 2, 3...) to hearing logs display, replacing database IDs with continuous numbers that remain consistent after deletions. The implementation requires minimal changes to the frontend display logic only.

## Tasks

- [x] 1. Update HearingHistory component display logic
  - Modify the display logic to show sequential numbers instead of database IDs
  - Change `#{log.id}` to `#{index + 1}` in the component rendering
  - Ensure numbering starts from 1 for the newest log (first in sorted array)
  - _Requirements: 1.1, 1.2, 1.4_

- [ ]* 1.1 Write property test for sequential numbering
  - **Property 1: Sequential Numbering Consistency**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 1.2 Write property test for numbering after deletion
  - **Property 2: Numbering Stability After Deletion**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2. Update existing tests for new display format
  - Modify HearingHistory component tests to expect sequential numbers
  - Update test assertions from `#${log.id}` to `#${index + 1}`
  - Ensure all existing functionality tests still pass
  - _Requirements: 1.1, 1.2, 1.4, 3.1_

- [ ]* 2.1 Write unit tests for edge cases
  - Test empty list scenario (no numbering displayed)
  - Test single item scenario (displays as "#1")
  - Test numbering after various deletion patterns
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Verify visual consistency and user experience
  - Ensure "#" prefix format is maintained
  - Verify hover states and interactions work unchanged
  - Test with various numbers of hearing logs (1, 5, 10+)
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Integration testing with existing functionality
  - Test sequential numbering with edit functionality
  - Test sequential numbering with delete functionality
  - Verify numbering updates correctly after add/edit/delete operations
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3_

- [x] 5. Final validation and user testing
  - Verify no gaps in numbering after multiple deletions
  - Test user workflow: create logs → delete some → verify continuous numbering
  - Ensure no impact on backend operations or database queries
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 3.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster implementation
- This is a frontend-only change - no backend modifications required
- Database IDs are still used internally for all operations
- Sequential numbers are purely for display purposes
- Implementation should be completed in a single session to avoid inconsistencies
- All existing functionality must remain intact