/**
 * Unit tests for ProjectList component
 * Tests project listing, creation workflow, and automatic saving behavior
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectList from '../ProjectList';
import { ProjectResponse } from '@/types/api';
import { api } from '@/lib/api';
import { ToastProvider } from '@/providers/ToastProvider';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    projects: {
      getProjects: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
    },
  },
}));

// Mock child components
jest.mock('../ProjectCard', () => {
  return function MockProjectCard({ project, onUpdate, onDelete }: any) {
    return (
      <div data-testid={`project-card-${project.id}`}>
        <span>{project.name}</span>
        <button onClick={() => onUpdate({ ...project, name: 'Updated' })}>
          Update
        </button>
        <button onClick={() => onDelete(project.id)}>Delete</button>
      </div>
    );
  };
});

jest.mock('../CreateProject', () => {
  return function MockCreateProject({ onProjectCreated }: any) {
    const mockProject = {
      id: 999,
      name: 'New Project',
      status: 'draft',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    };
    
    return (
      <div data-testid="create-project">
        <button onClick={() => onProjectCreated(mockProject)}>
          Create New Project
        </button>
      </div>
    );
  };
});

jest.mock('@/components/common/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

const mockProjects: ProjectResponse[] = [
  {
    id: 1,
    name: 'Project One',
    status: 'draft',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  },
  {
    id: 2,
    name: 'Project Two',
    status: 'draft',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T12:00:00Z',
  },
];

// Wrapper component with ToastProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ProjectList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.projects.getProjects as jest.Mock).mockResolvedValue(mockProjects);
  });

  describe('Project Loading (Requirement 1.1)', () => {
    it('displays loading state while fetching projects', async () => {
      // Mock API to return a promise that doesn't resolve immediately
      let resolveProjects: (value: ProjectResponse[]) => void;
      const projectsPromise = new Promise<ProjectResponse[]>((resolve) => {
        resolveProjects = resolve;
      });
      (api.projects.getProjects as jest.Mock).mockReturnValue(projectsPromise);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading projects...')).toBeInTheDocument();

      // Resolve the promise
      resolveProjects!(mockProjects);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('displays list of existing projects with their information', async () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(api.projects.getProjects).toHaveBeenCalled();
      });

      // Should display project cards
      expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
      
      // Should display project names
      expect(screen.getByText('Project One')).toBeInTheDocument();
      expect(screen.getByText('Project Two')).toBeInTheDocument();
    });

    it('displays page header and description', async () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Business Process Projects')).toBeInTheDocument();
      });

      expect(screen.getByText('Organize hearing content and create structured business flow diagrams')).toBeInTheDocument();
    });

    it('displays create project component', async () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-project')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no projects exist', async () => {
      (api.projects.getProjects as jest.Mock).mockResolvedValue([]);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No projects yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Create your first business process project to get started')).toBeInTheDocument();
      
      // Should still show create project component
      expect(screen.getByTestId('create-project')).toBeInTheDocument();
    });
  });

  describe('Project Creation Workflow (Requirement 1.2)', () => {
    it('adds new project to the list when created', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      });

      // Initially should have 2 projects
      expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();

      // Create new project
      await user.click(screen.getByText('Create New Project'));

      // Should add new project to the list
      await waitFor(() => {
        expect(screen.getByTestId('project-card-999')).toBeInTheDocument();
      });

      expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    it('adds new project at the beginning of the list', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      });

      // Create new project
      await user.click(screen.getByText('Create New Project'));

      await waitFor(() => {
        expect(screen.getByTestId('project-card-999')).toBeInTheDocument();
      });

      // Check that the new project appears first in the DOM
      const projectCards = screen.getAllByTestId(/project-card-/);
      expect(projectCards[0]).toHaveAttribute('data-testid', 'project-card-999');
    });
  });

  describe('Project Updates (Requirement 1.3, 1.4)', () => {
    it('updates project in the list when modified', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Project One')).toBeInTheDocument();
      });

      // Update project - use getAllByText to get the first Update button
      const updateButtons = screen.getAllByText('Update');
      await user.click(updateButtons[0]);

      // Should update the project in the list
      await waitFor(() => {
        expect(screen.getByText('Updated')).toBeInTheDocument();
      });

      // Original name should be gone
      expect(screen.queryByText('Project One')).not.toBeInTheDocument();
    });
  });

  describe('Project Deletion', () => {
    it('removes project from the list when deleted', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      });

      // Delete project
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      // Should remove project from the list
      await waitFor(() => {
        expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
      });

      // Other project should still be there
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when loading projects fails', async () => {
      (api.projects.getProjects as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load projects. Please try again.')).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('retries loading projects when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      (api.projects.getProjects as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProjects);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load projects. Please try again.')).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      });

      // Error message should be gone
      expect(screen.queryByText('Failed to load projects. Please try again.')).not.toBeInTheDocument();
      
      // Should have called API twice
      expect(api.projects.getProjects).toHaveBeenCalledTimes(2);
    });

    it('clears error state when retrying', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      (api.projects.getProjects as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProjects);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load projects. Please try again.')).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      });

      // Error should be cleared
      expect(screen.queryByText('Failed to load projects. Please try again.')).not.toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('displays projects in a responsive grid layout', async () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      });

      // Check that the grid container has the correct classes
      const gridContainer = screen.getByTestId('project-card-1').parentElement;
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
    });
  });
});