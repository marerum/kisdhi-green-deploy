/**
 * ExportDialog Component Tests
 * Tests for the export dialog functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportDialog from '../ExportDialog';
import { ExportOptions } from '@/utils/exportUtils';

// Mock the export utilities
jest.mock('@/utils/exportUtils', () => ({
  exportCanvas: jest.fn(),
  getSuggestedFilename: jest.fn((format: string, projectName?: string) => 
    `${projectName || 'flow-diagram'}-2024-01-01-12-00-00.${format}`
  ),
}));

describe('ExportDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export dialog when open', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('フロー図をエクスポート')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('SVG')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ExportDialog
        isOpen={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    expect(screen.queryByText('フロー図をエクスポート')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /キャンセル/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates format selection', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    const svgButton = screen.getByText('SVG');
    fireEvent.click(svgButton);

    // SVG button should be selected (have blue styling)
    expect(svgButton.closest('button')).toHaveClass('bg-blue-100');
  });

  it('updates filename input', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    const filenameInput = screen.getByPlaceholderText('ファイル名を入力');
    fireEvent.change(filenameInput, { target: { value: 'my-flow.png' } });

    expect(filenameInput).toHaveValue('my-flow.png');
  });

  it('shows quality slider for PNG format', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    // PNG is selected by default
    expect(screen.getByText(/品質:/)).toBeInTheDocument();
    
    // Switch to SVG
    fireEvent.click(screen.getByText('SVG'));
    
    // Quality slider should not be visible for SVG
    expect(screen.queryByText(/品質:/)).not.toBeInTheDocument();
  });

  it('calls onExport with correct options', async () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        projectName="test-project"
      />
    );

    // Set filename
    const filenameInput = screen.getByPlaceholderText('ファイル名を入力');
    fireEvent.change(filenameInput, { target: { value: 'test-export.png' } });

    // Click export
    fireEvent.click(screen.getByRole('button', { name: /エクスポート/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith({
        format: 'png',
        quality: 0.9,
        scale: 2,
        backgroundColor: '#ffffff',
        filename: 'test-export.png',
        includeGrid: false,
      });
    });
  });

  it('disables export button when filename is empty', async () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    // Clear filename
    const filenameInput = screen.getByPlaceholderText('ファイル名を入力');
    fireEvent.change(filenameInput, { target: { value: '   ' } }); // Use spaces to trigger trim

    // Export button should be disabled
    const exportButton = screen.getByRole('button', { name: /エクスポート/i });
    expect(exportButton).toBeDisabled();

    expect(mockOnExport).not.toHaveBeenCalled();
  });

  it('shows loading state during export', async () => {
    // Mock a slow export
    mockOnExport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    // Set filename
    const filenameInput = screen.getByPlaceholderText('ファイル名を入力');
    fireEvent.change(filenameInput, { target: { value: 'test.png' } });

    // Click export
    fireEvent.click(screen.getByRole('button', { name: /エクスポート/i }));

    // Should show loading state
    expect(screen.getByText('エクスポート中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /エクスポート中/i })).toBeDisabled();

    // Wait for export to complete
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles export errors', async () => {
    // Mock export failure
    mockOnExport.mockRejectedValue(new Error('Export failed'));

    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    // Set filename
    const filenameInput = screen.getByPlaceholderText('ファイル名を入力');
    fireEvent.change(filenameInput, { target: { value: 'test.png' } });

    // Click export
    fireEvent.click(screen.getByRole('button', { name: /エクスポート/i }));

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
    });

    // Dialog should remain open
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('updates suggested filename when format changes', () => {
    const { getSuggestedFilename } = require('@/utils/exportUtils');
    
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        projectName="test-project"
      />
    );

    // Switch to SVG format
    fireEvent.click(screen.getByText('SVG'));

    // Should call getSuggestedFilename with SVG format
    expect(getSuggestedFilename).toHaveBeenCalledWith('svg', 'test-project');
  });

  it('toggles transparent background', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    const transparentButton = screen.getByText('透明');
    fireEvent.click(transparentButton);

    // Button should be selected
    expect(transparentButton.closest('button')).toHaveClass('bg-blue-100');
  });

  it('toggles include grid option', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    );

    const gridCheckbox = screen.getByLabelText('グリッドを含める');
    fireEvent.click(gridCheckbox);

    expect(gridCheckbox).toBeChecked();
  });
});