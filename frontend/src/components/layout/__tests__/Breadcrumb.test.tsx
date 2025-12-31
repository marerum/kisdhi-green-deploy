/**
 * Tests for Breadcrumb component
 */

import { render, screen, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Breadcrumb from '../Breadcrumb';
import { api } from '@/lib/api';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    projects: {
      getProject: jest.fn(),
    },
  },
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockGetProject = api.projects.getProject as jest.MockedFunction<typeof api.projects.getProject>;

describe('Breadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render breadcrumb on home page', () => {
    mockUsePathname.mockReturnValue('/');
    
    const { container } = render(<Breadcrumb />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render project list breadcrumb', () => {
    mockUsePathname.mockReturnValue('/projects');
    
    render(<Breadcrumb />);
    
    expect(screen.getByText('プロジェクト')).toBeInTheDocument();
  });

  it('should render project breadcrumb with project name', async () => {
    mockUsePathname.mockReturnValue('/projects/1');
    mockGetProject.mockResolvedValue({
      id: 1,
      name: 'Test Project',
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    render(<Breadcrumb />);

    // Initially shows project ID
    expect(screen.getByText('プロジェクト 1')).toBeInTheDocument();

    // Wait for project name to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    expect(mockGetProject).toHaveBeenCalledWith(1);
  });

  it('should handle project switching correctly', async () => {
    // Start with project 1
    mockUsePathname.mockReturnValue('/projects/1');
    mockGetProject.mockResolvedValue({
      id: 1,
      name: 'Project One',
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    const { rerender } = render(<Breadcrumb />);

    // Wait for first project to load
    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    // Switch to project 2
    mockUsePathname.mockReturnValue('/projects/2');
    mockGetProject.mockResolvedValue({
      id: 2,
      name: 'Project Two',
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    rerender(<Breadcrumb />);

    // Should show project 2 ID initially
    expect(screen.getByText('プロジェクト 2')).toBeInTheDocument();

    // Wait for second project name to load
    await waitFor(() => {
      expect(screen.getByText('Project Two')).toBeInTheDocument();
    });

    // Should not show the old project name
    expect(screen.queryByText('Project One')).not.toBeInTheDocument();
  });

  it('should render hearing page breadcrumb', async () => {
    mockUsePathname.mockReturnValue('/projects/1/hearing');
    mockGetProject.mockResolvedValue({
      id: 1,
      name: 'Test Project',
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    render(<Breadcrumb />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    expect(screen.getByText('ヒアリング入力')).toBeInTheDocument();
  });

  it('should render flow page breadcrumb', async () => {
    mockUsePathname.mockReturnValue('/projects/1/flow');
    mockGetProject.mockResolvedValue({
      id: 1,
      name: 'Test Project',
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    render(<Breadcrumb />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    expect(screen.getByText('フロー図')).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    mockUsePathname.mockReturnValue('/projects/1');
    mockGetProject.mockRejectedValue(new Error('API Error'));

    render(<Breadcrumb />);

    // Should fallback to project ID when API fails
    await waitFor(() => {
      expect(screen.getByText('プロジェクト 1')).toBeInTheDocument();
    });
  });
});