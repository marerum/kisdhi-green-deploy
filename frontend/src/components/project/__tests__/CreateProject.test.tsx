/**
 * Unit tests for CreateProject component
 * Tests project creation workflow and automatic saving behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateProject from '../CreateProject';
import { ProjectResponse } from '@/types/api';
import { api } from '@/lib/api';
import { ToastProvider } from '@/providers/ToastProvider';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    projects: {
      createProject: jest.fn(),
    },
  },
}));

const mockOnProjectCreated = jest.fn();

const mockNewProject: ProjectResponse = {
  id: 1,
  name: 'New Test Project',
  status: 'draft',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

// Wrapper component with ToastProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('CreateProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.projects.createProject as jest.Mock).mockResolvedValue(mockNewProject);
  });

  describe('Initial State (Requirement 1.1)', () => {
    it('displays create project button initially', () => {
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      expect(screen.getByText('Add New Business Process')).toBeInTheDocument();
      expect(screen.getByText('Start a new project to analyze business processes')).toBeInTheDocument();
      
      // Should show plus icon
      const button = screen.getByRole('button');
      expect(button).toHaveClass('card', 'border-dashed');
    });

    it('has proper hover states', () => {
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:border-blue-400', 'hover:bg-blue-50');
    });
  });

  describe('Project Creation Workflow (Requirement 1.2)', () => {
    it('shows input form when create button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      const createButton = screen.getByText('Add New Business Process');
      await user.click(createButton);

      // Should show input form
      expect(screen.getByPlaceholderText('Enter project name...')).toBeInTheDocument();
      expect(screen.getByText('Create Project')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      // Input should be focused
      expect(screen.getByPlaceholderText('Enter project name...')).toHaveFocus();
    });

    it('creates project with draft status when name is entered (Requirements 1.2, 1.3)', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Click create button
      await user.click(screen.getByText('Add New Business Process'));
      
      // Enter project name
      const input = screen.getByPlaceholderText('Enter project name...');
      await user.type(input, 'My New Project');
      
      // Click create
      const createButton = screen.getByText('Create Project');
      await user.click(createButton);

      await waitFor(() => {
        expect(api.projects.createProject).toHaveBeenCalledWith({
          name: 'My New Project',
        });
      });

      expect(mockOnProjectCreated).toHaveBeenCalledWith(mockNewProject);
    });

    it('creates project when Enter key is pressed', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Click create button
      await user.click(screen.getByText('Add New Business Process'));
      
      // Enter project name and press Enter
      const input = screen.getByPlaceholderText('Enter project name...');
      await user.type(input, 'My New Project{Enter}');

      await waitFor(() => {
        expect(api.projects.createProject).toHaveBeenCalledWith({
          name: 'My New Project',
        });
      });

      expect(mockOnProjectCreated).toHaveBeenCalledWith(mockNewProject);
    });

    it('trims whitespace from project names', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Click create button
      await user.click(screen.getByText('Add New Business Process'));
      
      // Enter project name with whitespace
      const input = screen.getByPlaceholderText('Enter project name...');
      await user.type(input, '  My New Project  ');
      
      // Click create
      await user.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(api.projects.createProject).toHaveBeenCalledWith({
          name: 'My New Project',
        });
      });
    });

    it('does not create project with empty name', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Click create button
      await user.click(screen.getByText('Add New Business Process'));
      
      // Try to create without entering name
      const createButton = screen.getByText('Create Project');
      expect(createButton).toBeDisabled();
      
      // Enter only whitespace
      const input = screen.getByPlaceholderText('Enter project name...');
      await user.type(input, '   ');
      
      // Button should still be disabled
      expect(createButton).toBeDisabled();
      
      // Should not call API
      expect(api.projects.createProject).not.toHaveBeenCalled();
    });
  });

  describe('Form Cancellation', () => {
    it('cancels creation when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Click create button
      await user.click(screen.getByText('Add New Business Process'));
      
      // Enter some text
      const input = screen.getByPlaceholderText('Enter project name...');
      await user.type(input, 'Some text');
      
      // Click cancel
      await user.click(screen.getByText('Cancel'));

      // Should return to initial state
      expect(screen.getByText('Add New Business Process')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Enter project name...')).not.toBeInTheDocument();
      
      // Should not call API
      expect(api.projects.createProject).not.toHaveBeenCalled();
    });

    it('cancels creation when Escape key is pressed', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Click create button
      await user.click(screen.getByText('Add New Business Process'));
      
      // Enter some text
      const input = screen.getByPlaceholderText('Enter project name...');
      await user.type(input, 'Some text');
      
      // Press Escape
      await user.keyboard('{Escape}');

      // Should return to initial state
      expect(screen.getByText('Add New Business Process')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Enter project name...')).not.toBeInTheDocument();
    });
  });

  describe('Loading States (Requirement 1.4)', () => {
    it('shows loading state during project creation', async () => {
      const user = userEvent.setup();
      
      // Mock API to return a promise that we can control
      let resolveCreate: (value: ProjectResponse) => void;
      const createPromise = new Promise<ProjectResponse>((resolve) => {
        resolveCreate = resolve;
      });
      (api.projects.createProject as jest.Mock).mockReturnValue(createPromise);
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Start creation
      await user.click(screen.getByText('Add New Business Process'));
      await user.type(screen.getByPlaceholderText('Enter project name...'), 'Test Project');
      await user.click(screen.getByText('Create Project'));

      // Should show loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeDisabled();
      expect(screen.getByPlaceholderText('Enter project name...')).toBeDisabled();

      // Resolve the promise
      resolveCreate!(mockNewProject);
      
      await waitFor(() => {
        expect(screen.getByText('Add New Business Process')).toBeInTheDocument();
      });
    });

    it('resets form after successful creation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Create project
      await user.click(screen.getByText('Add New Business Process'));
      await user.type(screen.getByPlaceholderText('Enter project name...'), 'Test Project');
      await user.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(mockOnProjectCreated).toHaveBeenCalledWith(mockNewProject);
      });

      // Should return to initial state
      expect(screen.getByText('Add New Business Process')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Enter project name...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API to reject
      (api.projects.createProject as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Try to create project
      await user.click(screen.getByText('Add New Business Process'));
      await user.type(screen.getByPlaceholderText('Enter project name...'), 'Test Project');
      await user.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(api.projects.createProject).toHaveBeenCalled();
      });

      // Should remain in creation form (not reset)
      expect(screen.getByPlaceholderText('Enter project name...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
      
      // Should not call onProjectCreated
      expect(mockOnProjectCreated).not.toHaveBeenCalled();
    });

    it('re-enables form after error', async () => {
      const user = userEvent.setup();
      
      // Mock API to reject
      (api.projects.createProject as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      render(
        <TestWrapper>
          <CreateProject onProjectCreated={mockOnProjectCreated} />
        </TestWrapper>
      );

      // Try to create project
      await user.click(screen.getByText('Add New Business Process'));
      await user.type(screen.getByPlaceholderText('Enter project name...'), 'Test Project');
      await user.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(api.projects.createProject).toHaveBeenCalled();
      });

      // Form should be enabled again
      expect(screen.getByText('Create Project')).not.toBeDisabled();
      expect(screen.getByText('Cancel')).not.toBeDisabled();
      expect(screen.getByPlaceholderText('Enter project name...')).not.toBeDisabled();
    });
  });
});