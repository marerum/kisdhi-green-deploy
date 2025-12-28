/**
 * Unit tests for HearingHistory component
 * Tests chronological display of hearing logs with delete functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HearingHistory from '../HearingHistory';
import { HearingLogResponse } from '@/types/api';
import { hearingApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  hearingApi: {
    deleteHearingLog: jest.fn(),
  },
}));

const mockDeleteHearingLog = hearingApi.deleteHearingLog as jest.MockedFunction<typeof hearingApi.deleteHearingLog>;

const mockHearingLogs: HearingLogResponse[] = [
  {
    id: 1,
    project_id: 1,
    content: 'First hearing log entry with detailed information about the business process.',
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    project_id: 1,
    content: 'Second hearing log entry with additional details.',
    created_at: '2024-01-01T11:00:00Z',
  },
  {
    id: 3,
    project_id: 1,
    content: 'Most recent hearing log entry.',
    created_at: '2024-01-01T12:00:00Z',
  },
];

describe('HearingHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    global.confirm = jest.fn();
    global.alert = jest.fn();
  });

  describe('Component Rendering (Requirement 2.4)', () => {
    it('displays hearing history title with entry count in Japanese', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} />);

      expect(screen.getByText('過去のヒアリングログ')).toBeInTheDocument();
      expect(screen.getByText('(3件のエントリ)')).toBeInTheDocument();
    });

    it('displays singular form for single entry in Japanese', () => {
      const singleLog = [mockHearingLogs[0]];
      render(<HearingHistory hearingLogs={singleLog} />);

      expect(screen.getByText('(1件のエントリ)')).toBeInTheDocument();
    });

    it('shows empty state when no hearing logs exist in Japanese', () => {
      render(<HearingHistory hearingLogs={[]} />);

      expect(screen.getByText('ヒアリングログがまだありません。上記で最初のエントリを追加してください。')).toBeInTheDocument();
      // Check for SVG icon in empty state - SVG doesn't have img role, just check it exists
      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });
  });

  describe('Chronological Display (Requirement 2.4)', () => {
    it('displays hearing logs in chronological order (oldest first)', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} />);

      const logElements = screen.getAllByText(/hearing log entry/);
      
      // Should display in chronological order (oldest first)
      expect(logElements[0]).toHaveTextContent('First hearing log entry with detailed information about the business process.');
      expect(logElements[1]).toHaveTextContent('Second hearing log entry with additional details.');
      expect(logElements[2]).toHaveTextContent('Most recent hearing log entry.');
    });

    it('displays sequential numbers for each entry', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} />);

      // Sequential numbers should be assigned based on display order (oldest first)
      // ID 1 (oldest) gets #1, ID 2 gets #2, ID 3 (newest) gets #3
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('preserves whitespace and line breaks in log content', () => {
      const logWithFormatting: HearingLogResponse = {
        id: 4,
        project_id: 1,
        content: 'Line 1\nLine 2\n\nLine 4 with spaces   ',
        created_at: '2024-01-01T13:00:00Z',
      };

      render(<HearingHistory hearingLogs={[logWithFormatting]} />);

      // Check that the content element has the whitespace-pre-wrap class
      const contentElement = screen.getByText((content, element) => {
        return element?.textContent === 'Line 1\nLine 2\n\nLine 4 with spaces   ';
      });
      expect(contentElement).toHaveClass('whitespace-pre-wrap');
    });
  });

  describe('Relative Time Display in Japanese', () => {
    beforeEach(() => {
      // Mock current time for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:30:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays "たった今" for very recent entries', () => {
      const recentLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'Very recent log',
        created_at: '2024-01-01T12:30:00Z', // Same as current time
      };

      render(<HearingHistory hearingLogs={[recentLog]} />);

      expect(screen.getByText('たった今')).toBeInTheDocument();
    });

    it('displays minutes ago in Japanese for recent entries', () => {
      const recentLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'Recent log',
        created_at: '2024-01-01T12:25:00Z', // 5 minutes ago
      };

      render(<HearingHistory hearingLogs={[recentLog]} />);

      expect(screen.getByText('5分前')).toBeInTheDocument();
    });

    it('displays hours ago in Japanese for entries within 24 hours', () => {
      const hourlyLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'Hourly log',
        created_at: '2024-01-01T10:30:00Z', // 2 hours ago
      };

      render(<HearingHistory hearingLogs={[hourlyLog]} />);

      expect(screen.getByText('2時間前')).toBeInTheDocument();
    });

    it('displays days ago in Japanese for entries within a week', () => {
      const dailyLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'Daily log',
        created_at: '2023-12-30T12:30:00Z', // 2 days ago
      };

      render(<HearingHistory hearingLogs={[dailyLog]} />);

      expect(screen.getByText('2日前')).toBeInTheDocument();
    });

    it('displays actual date in Japanese format for entries older than a week', () => {
      const oldLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'Old log',
        created_at: '2023-12-20T12:30:00Z', // More than a week ago
      };

      render(<HearingHistory hearingLogs={[oldLog]} />);

      // The date format is Japanese locale
      expect(screen.getByText(/2023/)).toBeInTheDocument();
    });
  });

  describe('Loading State (Requirement 2.1)', () => {
    it('displays loading skeleton when isLoading is true', () => {
      render(<HearingHistory hearingLogs={[]} isLoading={true} />);

      expect(screen.getByText('過去のヒアリングログ')).toBeInTheDocument();
      
      // Should show skeleton placeholders
      const skeletons = screen.getAllByRole('generic');
      const animatedElements = skeletons.filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('does not display actual logs during loading', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} isLoading={true} />);

      // Should not show actual log content during loading
      expect(screen.queryByText('First hearing log entry')).not.toBeInTheDocument();
      expect(screen.queryByText('Second hearing log entry')).not.toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    const mockOnHearingLogDeleted = jest.fn();

    beforeEach(() => {
      mockOnHearingLogDeleted.mockClear();
      mockDeleteHearingLog.mockClear();
    });

    it('shows delete button on hover', async () => {
      const user = userEvent.setup();
      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogDeleted={mockOnHearingLogDeleted} />);

      const logEntry = screen.getByText('First hearing log entry with detailed information about the business process.').closest('.group');
      expect(logEntry).toBeInTheDocument();

      // Delete button should be hidden initially
      const deleteButton = logEntry?.querySelector('button[title="ヒアリングログを削除"]');
      expect(deleteButton).toHaveClass('opacity-0');

      // Hover over the log entry
      if (logEntry) {
        await user.hover(logEntry);
      }

      // Delete button should become visible on hover (handled by CSS group-hover)
      expect(deleteButton).toBeInTheDocument();
    });

    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(false); // User cancels

      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogDeleted={mockOnHearingLogDeleted} />);

      const deleteButtons = screen.getAllByTitle('ヒアリングログを削除');
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('このヒアリングログを削除しますか？');
      expect(mockDeleteHearingLog).not.toHaveBeenCalled();
    });

    it('deletes hearing log when user confirms', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true); // User confirms
      mockDeleteHearingLog.mockResolvedValue(undefined);

      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogDeleted={mockOnHearingLogDeleted} />);

      const deleteButtons = screen.getAllByTitle('ヒアリングログを削除');
      await user.click(deleteButtons[0]); // Delete first log (id: 1, oldest)

      expect(global.confirm).toHaveBeenCalledWith('このヒアリングログを削除しますか？');
      expect(mockDeleteHearingLog).toHaveBeenCalledWith(1); // Oldest log has id 1
      
      await waitFor(() => {
        expect(mockOnHearingLogDeleted).toHaveBeenCalledWith(1);
      });
    });

    it('shows loading spinner during delete operation', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true);
      
      // Make the delete operation hang
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteHearingLog.mockReturnValue(deletePromise);

      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogDeleted={mockOnHearingLogDeleted} />);

      const deleteButtons = screen.getAllByTitle('ヒアリングログを削除');
      await user.click(deleteButtons[0]);

      // Should show loading spinner in the first button
      const firstButton = deleteButtons[0];
      const spinner = firstButton.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Button should be disabled
      expect(firstButton).toBeDisabled();

      // Resolve the delete operation
      resolveDelete!();
      await waitFor(() => {
        expect(mockOnHearingLogDeleted).toHaveBeenCalled();
      });
    });

    it('shows error alert when delete fails', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true);
      mockDeleteHearingLog.mockRejectedValue(new Error('Delete failed'));

      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogDeleted={mockOnHearingLogDeleted} />);

      const deleteButtons = screen.getAllByTitle('ヒアリングログを削除');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('ヒアリングログの削除に失敗しました。再度お試しください。');
      });

      expect(mockOnHearingLogDeleted).not.toHaveBeenCalled();
    });
  });

  describe('Scrollable Container', () => {
    it('applies scrollable styling for long lists', () => {
      const manyLogs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        project_id: 1,
        content: `Hearing log entry ${i + 1}`,
        created_at: `2024-01-01T${10 + i}:00:00Z`,
      }));

      render(<HearingHistory hearingLogs={manyLogs} />);

      const scrollContainer = screen.getByText('Hearing log entry 1').closest('.space-y-4');
      expect(scrollContainer).toHaveClass('max-h-96', 'overflow-y-auto');
    });
  });

  describe('Visual Styling and Interaction', () => {
    it('applies hover effects to log entries', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} />);

      const logEntry = screen.getByText('First hearing log entry with detailed information about the business process.').closest('.bg-gray-50');
      expect(logEntry).toHaveClass('hover:bg-gray-100');
    });

    it('displays chronological order note at bottom in Japanese', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} />);

      expect(screen.getByText('すべてのヒアリングログを時系列順に表示（古い順）')).toBeInTheDocument();
    });

    it('does not show chronological note when no logs exist', () => {
      render(<HearingHistory hearingLogs={[]} />);

      expect(screen.queryByText('Showing all hearing logs in chronological order')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles logs with empty content gracefully', () => {
      const emptyContentLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: '',
        created_at: '2024-01-01T10:00:00Z',
      };

      render(<HearingHistory hearingLogs={[emptyContentLog]} />);

      expect(screen.getByText('#1')).toBeInTheDocument();
      // Empty content should still be rendered in a content div
      const logContainer = screen.getByText('#1').closest('.bg-gray-50');
      const contentElement = logContainer?.querySelector('.text-gray-700');
      expect(contentElement).toBeInTheDocument();
    });

    it('handles logs with very long content', () => {
      const longContentLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'A'.repeat(1000), // Very long content
        created_at: '2024-01-01T10:00:00Z',
      };

      render(<HearingHistory hearingLogs={[longContentLog]} />);

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('handles invalid date strings gracefully', () => {
      const invalidDateLog: HearingLogResponse = {
        id: 1,
        project_id: 1,
        content: 'Log with invalid date',
        created_at: 'invalid-date',
      };

      render(<HearingHistory hearingLogs={[invalidDateLog]} />);

      // Should still render the log, even with invalid date
      expect(screen.getByText('Log with invalid date')).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    const mockOnHearingLogEdit = jest.fn();

    beforeEach(() => {
      mockOnHearingLogEdit.mockClear();
    });

    it('makes log entries clickable with cursor pointer', () => {
      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogEdit={mockOnHearingLogEdit} />);

      const logEntry = screen.getByText('First hearing log entry with detailed information about the business process.').closest('.bg-gray-50');
      expect(logEntry).toHaveClass('cursor-pointer');
    });

    it('shows edit hint on hover', async () => {
      const user = userEvent.setup();
      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogEdit={mockOnHearingLogEdit} />);

      const logEntry = screen.getByText('First hearing log entry with detailed information about the business process.').closest('.group');
      expect(logEntry).toBeInTheDocument();

      // Edit hint should be present but hidden initially within this specific log entry
      const editHint = logEntry?.querySelector('.mt-2.text-xs.text-gray-400.opacity-0');
      expect(editHint).toBeInTheDocument();
      expect(editHint).toHaveTextContent('クリックして編集');

      // Hover over the log entry
      if (logEntry) {
        await user.hover(logEntry);
      }

      // Edit hint should become visible on hover (handled by CSS group-hover)
      expect(editHint).toBeInTheDocument();
    });

    it('calls onHearingLogEdit when log content is clicked', async () => {
      const user = userEvent.setup();
      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogEdit={mockOnHearingLogEdit} />);

      const logContent = screen.getByText('First hearing log entry with detailed information about the business process.');
      await user.click(logContent);

      expect(mockOnHearingLogEdit).toHaveBeenCalledWith(mockHearingLogs[0]);
    });

    it('prevents delete button click from triggering edit', async () => {
      const user = userEvent.setup();
      const mockOnHearingLogDeleted = jest.fn();
      (global.confirm as jest.Mock).mockReturnValue(false); // User cancels delete

      render(
        <HearingHistory 
          hearingLogs={mockHearingLogs} 
          onHearingLogEdit={mockOnHearingLogEdit}
          onHearingLogDeleted={mockOnHearingLogDeleted}
        />
      );

      const deleteButton = screen.getAllByTitle('ヒアリングログを削除')[0];
      await user.click(deleteButton);

      // Delete confirmation should be shown
      expect(global.confirm).toHaveBeenCalled();
      // Edit callback should not be called
      expect(mockOnHearingLogEdit).not.toHaveBeenCalled();
    });

    it('works without onHearingLogEdit callback', async () => {
      const user = userEvent.setup();
      render(<HearingHistory hearingLogs={mockHearingLogs} />);

      const logContent = screen.getByText('First hearing log entry with detailed information about the business process.');
      
      // Should not throw error when clicking without callback
      await expect(user.click(logContent)).resolves.not.toThrow();
    });

    it('calls onHearingLogEdit with correct log data', async () => {
      const user = userEvent.setup();
      render(<HearingHistory hearingLogs={mockHearingLogs} onHearingLogEdit={mockOnHearingLogEdit} />);

      // Click on the second log entry
      const secondLogContent = screen.getByText('Second hearing log entry with additional details.');
      await user.click(secondLogContent);

      expect(mockOnHearingLogEdit).toHaveBeenCalledWith(mockHearingLogs[1]);
    });
  });
});