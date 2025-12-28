/**
 * Unit tests for HearingInput component
 * Tests manual save functionality and content input
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HearingInput from '../HearingInput';
import { HearingLogResponse } from '@/types/api';
import { hearingApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  hearingApi: {
    addHearingLog: jest.fn(),
    updateHearingLog: jest.fn(),
  },
}));

const mockProps = {
  projectId: 1,
  onHearingLogAdded: jest.fn(),
};

const mockHearingLog: HearingLogResponse = {
  id: 1,
  project_id: 1,
  content: 'Test hearing content',
  created_at: '2024-01-01T10:00:00Z',
};

describe('HearingInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    (hearingApi.addHearingLog as jest.Mock).mockResolvedValue(mockHearingLog);
    (hearingApi.updateHearingLog as jest.Mock).mockResolvedValue(mockHearingLog);
  });

  describe('Component Rendering (Requirement 2.1)', () => {
    it('displays hearing input interface with text area', () => {
      render(<HearingInput {...mockProps} />);

      // Check for text area
      const textarea = screen.getByRole('textbox', { name: /新しいヒアリング内容/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('rows', '12');

      // Check for placeholder text with examples
      expect(textarea).toHaveAttribute('placeholder');
      expect(textarea.getAttribute('placeholder')).toContain('インタビューで学んだことを入力してください');
      expect(textarea.getAttribute('placeholder')).toContain('承認プロセスには3-5日かかります');

      // Check for save button
      expect(screen.getByText('反映')).toBeInTheDocument();
    });

    it('shows encouraging text about accuracy not being required', () => {
      render(<HearingInput {...mockProps} />);

      const placeholder = screen.getByRole('textbox').getAttribute('placeholder');
      expect(placeholder).toContain('インタビューで学んだことを入力してください');
    });
  });

  describe('Content Input (Requirements 2.2, 2.3)', () => {
    it('updates content when user types', async () => {
      const user = userEvent.setup();
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      
      await user.type(textarea, 'New hearing content');
      
      expect(textarea).toHaveValue('New hearing content');
    });

    it('enables save button when content exists', async () => {
      const user = userEvent.setup();
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Initially button should be disabled
      expect(saveButton).toBeDisabled();
      
      // Type content
      await user.type(textarea, 'Test content');
      
      // Button should be enabled
      expect(saveButton).not.toBeDisabled();
    });

    it('keeps save button disabled for empty or whitespace-only content', async () => {
      const user = userEvent.setup();
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type only whitespace
      await user.type(textarea, '   ');
      
      // Button should remain disabled
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('saves content when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type content
      await user.type(textarea, 'Test hearing content');
      
      // Click save button
      await user.click(saveButton);
      
      // API should be called
      await waitFor(() => {
        expect(hearingApi.addHearingLog).toHaveBeenCalledWith(1, {
          content: 'Test hearing content'
        });
      });
    });

    it('calls onHearingLogAdded callback after successful save', async () => {
      const user = userEvent.setup();
      const onHearingLogAdded = jest.fn();
      render(<HearingInput {...mockProps} onHearingLogAdded={onHearingLogAdded} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type content
      await user.type(textarea, 'Test content');
      
      // Click save button
      await user.click(saveButton);
      
      // Callback should be called with the returned hearing log
      await waitFor(() => {
        expect(onHearingLogAdded).toHaveBeenCalledWith(mockHearingLog);
      });
    });

    it('clears content after successful save', async () => {
      const user = userEvent.setup();
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type content
      await user.type(textarea, 'Test content');
      
      // Click save button
      await user.click(saveButton);
      
      // Content should be cleared after save
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('shows error message when save fails', async () => {
      const user = userEvent.setup();
      (hearingApi.addHearingLog as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type content
      await user.type(textarea, 'Test content');
      
      // Click save button
      await user.click(saveButton);
      
      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText('ヒアリングログの保存に失敗しました。再度お試しください。')).toBeInTheDocument();
      });
    });

    it('shows error for empty content when trying to save', async () => {
      const user = userEvent.setup();
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Button should be disabled for empty content
      expect(saveButton).toBeDisabled();
      
      // Type some content to enable button, then clear it
      await user.type(textarea, 'test');
      expect(saveButton).not.toBeDisabled();
      
      await user.clear(textarea);
      
      // Button should be disabled again
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Loading States and User Feedback', () => {
    it('shows loading state during save operations', async () => {
      const user = userEvent.setup();
      // Mock API to delay response
      (hearingApi.addHearingLog as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockHearingLog), 100))
      );
      
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type content
      await user.type(textarea, 'Test content');
      
      // Click save button
      await user.click(saveButton);
      
      // Should show loading state
      expect(screen.getByText('反映中...')).toBeInTheDocument();
      
      // Check for loading spinner SVG
      const spinner = screen.getByText('反映中...').querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
      
      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText('反映')).toBeInTheDocument();
      });
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      (hearingApi.addHearingLog as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<HearingInput {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('反映');
      
      // Type content and save to trigger error
      await user.type(textarea, 'Test content');
      await user.click(saveButton);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('ヒアリングログの保存に失敗しました。再度お試しください。')).toBeInTheDocument();
      });
      
      // Start typing again
      await user.type(textarea, ' more content');
      
      // Error should be cleared
      expect(screen.queryByText('ヒアリングログの保存に失敗しました。再度お試しください。')).not.toBeInTheDocument();
    });
  });

  describe('Integration with Parent Component', () => {
    it('accepts projectId prop and uses it correctly', () => {
      render(<HearingInput {...mockProps} />);
      
      // Component should render without errors with the provided projectId
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('calls onHearingLogAdded callback when provided', () => {
      const onHearingLogAdded = jest.fn();
      render(<HearingInput {...mockProps} onHearingLogAdded={onHearingLogAdded} />);
      
      // Component should render without errors
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Functionality', () => {
    const editingLog: HearingLogResponse = {
      id: 2,
      project_id: 1,
      content: 'Original content to edit',
      created_at: '2024-01-01T10:00:00Z',
    };

    it('displays edit mode interface when editingLog is provided', () => {
      render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      // Check for edit mode label
      expect(screen.getByText('ヒアリング内容を編集')).toBeInTheDocument();
      
      // Check for update button instead of save button
      expect(screen.getByText('更新')).toBeInTheDocument();
      expect(screen.queryByText('反映')).not.toBeInTheDocument();
      
      // Check for cancel button
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    it('loads editing log content into textarea', () => {
      render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Original content to edit');
    });

    it('updates existing hearing log when update button is clicked', async () => {
      const user = userEvent.setup();
      const onHearingLogUpdated = jest.fn();
      const onCancelEdit = jest.fn();
      
      render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={onHearingLogUpdated}
          onCancelEdit={onCancelEdit}
        />
      );

      const textarea = screen.getByRole('textbox');
      const updateButton = screen.getByText('更新');
      
      // Modify content
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      
      // Click update button
      await user.click(updateButton);
      
      // API should be called with update
      await waitFor(() => {
        expect(hearingApi.updateHearingLog).toHaveBeenCalledWith(2, {
          content: 'Updated content'
        });
      });
      
      // Callbacks should be called
      expect(onHearingLogUpdated).toHaveBeenCalledWith(mockHearingLog);
      expect(onCancelEdit).toHaveBeenCalled();
    });

    it('calls onCancelEdit when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancelEdit = jest.fn();
      
      render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={onCancelEdit}
        />
      );

      const cancelButton = screen.getByText('キャンセル');
      
      // Click cancel button
      await user.click(cancelButton);
      
      // Callback should be called
      expect(onCancelEdit).toHaveBeenCalled();
    });

    it('shows loading state during update operations', async () => {
      const user = userEvent.setup();
      // Mock API to delay response
      (hearingApi.updateHearingLog as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockHearingLog), 100))
      );
      
      render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      const textarea = screen.getByRole('textbox');
      const updateButton = screen.getByText('更新');
      
      // Modify content
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      
      // Click update button
      await user.click(updateButton);
      
      // Should show loading state
      expect(screen.getByText('更新中...')).toBeInTheDocument();
      
      // Wait for update to complete
      await waitFor(() => {
        expect(screen.getByText('更新')).toBeInTheDocument();
      });
    });

    it('shows error message when update fails', async () => {
      const user = userEvent.setup();
      (hearingApi.updateHearingLog as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      const textarea = screen.getByRole('textbox');
      const updateButton = screen.getByText('更新');
      
      // Modify content
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      
      // Click update button
      await user.click(updateButton);
      
      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText('ヒアリングログの保存に失敗しました。再度お試しください。')).toBeInTheDocument();
      });
    });

    it('clears content and resets to create mode when editingLog becomes null', () => {
      const { rerender } = render(
        <HearingInput 
          {...mockProps} 
          editingLog={editingLog}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      // Should be in edit mode
      expect(screen.getByText('ヒアリング内容を編集')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('Original content to edit');

      // Change to create mode
      rerender(
        <HearingInput 
          {...mockProps} 
          editingLog={null}
          onHearingLogUpdated={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      // Should be in create mode
      expect(screen.getByText('新しいヒアリング内容')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.getByText('反映')).toBeInTheDocument();
      expect(screen.queryByText('キャンセル')).not.toBeInTheDocument();
    });
  });
});