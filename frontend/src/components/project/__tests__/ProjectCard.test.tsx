/**
 * Unit tests for ProjectCard component
 * Tests project editing workflows and automatic saving behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCard from '../ProjectCard';
import { ProjectResponse } from '@/types/api';
import { api } from '@/lib/api';
import { ToastProvider } from '@/providers/ToastProvider';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    projects: {
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
    },
  },
}));

// Mock the auto-save hook
jest.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: jest.fn(({ saveFunction, onSuccess, onError }) => ({
    save: jest.fn((data) => {
      // Simulate async save
      setTimeout(async () => {
        try {
          await saveFunction(data);
          onSuccess?.();
        } catch (error) {
          onError?.(error);
        }
      }, 0);
    }),
    isLoading: false,
    error: null,
    lastSaved: null,
  })),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockProject: ProjectResponse = {
  id: 1,
  name: 'Test Project',
  department: 'IT',
  status: 'draft',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
};

const mockProps = {
  project: mockProject,
  onUpdate: jest.fn(),
  onDelete: jest.fn(),
};

// Wrapper component with ToastProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ProjectCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    (api.projects.updateProject as jest.Mock).mockResolvedValue({
      ...mockProject,
      name: 'Updated Project',
    });
    (api.projects.deleteProject as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Project Display (Requirement 1.5)', () => {
    it('displays project name, status, and relative update time', () => {
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      // Check project name is displayed
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      
      // Check status is displayed
      expect(screen.getByText('draft')).toBeInTheDocument();
      
      // Check relative time is displayed (should show date for the mock date)
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
      
      // Check continue link is present
      expect(screen.getByText('Continue →')).toBeInTheDocument();
      expect(screen.getByText('Continue →').closest('a')).toHaveAttribute('href', '/projects/1/hearing');
    });

    it('formats relative time correctly for different time periods', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const recentProject = {
        ...mockProject,
        updated_at: fiveMinutesAgo.toISOString(),
      };

      render(
        <TestWrapper>
          <ProjectCard {...mockProps} project={recentProject} />
        </TestWrapper>
      );

      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Updated 5 minutes ago';
      })).toBeInTheDocument();
    });
  });

  describe('Project Name Editing (Requirements 1.2, 1.3)', () => {
    it('allows editing project name when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      const projectName = screen.getByText('Test Project');
      
      // Click on project name to start editing
      await user.click(projectName);
      
      // Should show input field
      const input = screen.getByDisplayValue('Test Project');
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    it('saves project name changes automatically (Requirement 1.4)', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      // Start editing
      await user.click(screen.getByText('Test Project'));
      
      const input = screen.getByDisplayValue('Test Project');
      
      // Change the name
      await user.clear(input);
      await user.type(input, 'Updated Project Name');
      
      // Wait for auto-save to trigger
      await waitFor(() => {
        expect(api.projects.updateProject).toHaveBeenCalledWith(1, {
          name: 'Updated Project Name',
        });
      });
      
      expect(mockProps.onUpdate).toHaveBeenCalled();
    });

    it('exits edit mode on Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      // Start editing
      await user.click(screen.getByText('Test Project'));
      
      const input = screen.getByDisplayValue('Test Project');
      
      // Press Enter
      await user.keyboard('{Enter}');
      
      // Should exit edit mode
      expect(input).not.toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('cancels editing on Escape key', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      // Start editing
      await user.click(screen.getByText('Test Project'));
      
      const input = screen.getByDisplayValue('Test Project');
      
      // Change the name
      await user.clear(input);
      await user.type(input, 'Changed Name');
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      // Should exit edit mode and revert to original name
      expect(input).not.toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('does not save empty or whitespace-only names', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      // Start editing
      await user.click(screen.getByText('Test Project'));
      
      const input = screen.getByDisplayValue('Test Project');
      
      // Clear the name (empty)
      await user.clear(input);
      await user.tab(); // Trigger blur
      
      // Should not call API
      expect(api.projects.updateProject).not.toHaveBeenCalled();
    });
  });

  describe('Project Deletion', () => {
    it('shows confirmation dialog before deleting', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete this project? This action cannot be undone.'
      );
      
      // Should not call delete API if not confirmed
      expect(api.projects.deleteProject).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });

    it('deletes project when confirmed', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm to return true
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(api.projects.deleteProject).toHaveBeenCalledWith(1);
      });
      
      expect(mockProps.onDelete).toHaveBeenCalledWith(1);
      
      confirmSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during save operations', async () => {
      // Mock useAutoSave to return loading state
      const { useAutoSave } = require('@/hooks/useAutoSave');
      useAutoSave.mockReturnValue({
        save: jest.fn(),
        isLoading: true,
        error: null,
        lastSaved: null,
      });

      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API to reject
      (api.projects.updateProject as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      render(
        <TestWrapper>
          <ProjectCard {...mockProps} />
        </TestWrapper>
      );

      // Start editing and change name
      await user.click(screen.getByText('Test Project'));
      const input = screen.getByDisplayValue('Test Project');
      await user.tripleClick(input);
      await user.type(input, 'New Name');
      
      // The error should be handled by the auto-save hook
      // and the name should revert to original
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
      });
    });
  });
});