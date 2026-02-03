import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PreviewPanel } from './PreviewPanel';

const mockServices = [
  { id: 'frontend', name: 'Frontend', url: 'http://localhost:3000', status: 'running' as const },
  { id: 'api', name: 'API', url: 'http://localhost:4000', status: 'running' as const },
  { id: 'admin', name: 'Admin', url: 'http://localhost:5000', status: 'stopped' as const },
];

describe('PreviewPanel', () => {
  it('renders iframe with service URL', () => {
    render(<PreviewPanel services={mockServices} />);
    const iframe = screen.getByTestId('preview-iframe');
    expect(iframe).toHaveAttribute('src', 'http://localhost:3000');
  });

  it('renders service selector', () => {
    render(<PreviewPanel services={mockServices} />);
    expect(screen.getByTestId('service-selector')).toBeInTheDocument();
  });

  it('shows all services in selector', () => {
    render(<PreviewPanel services={mockServices} />);

    const selectorButton = screen.getByTestId('service-selector').querySelector('button')!;
    fireEvent.click(selectorButton);

    // Dropdown should show menu items
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBe(3);
  });

  it('changes iframe URL when service selected', () => {
    render(<PreviewPanel services={mockServices} />);

    const selectorButton = screen.getByTestId('service-selector').querySelector('button')!;
    fireEvent.click(selectorButton);

    const menuItems = screen.getAllByRole('menuitem');
    fireEvent.click(menuItems[1]); // API is second item

    const iframe = screen.getByTestId('preview-iframe');
    expect(iframe).toHaveAttribute('src', 'http://localhost:4000');
  });

  it('renders device toggle buttons', () => {
    render(<PreviewPanel services={mockServices} />);

    expect(screen.getByLabelText('Phone view')).toBeInTheDocument();
    expect(screen.getByLabelText('Tablet view')).toBeInTheDocument();
    expect(screen.getByLabelText('Desktop view')).toBeInTheDocument();
  });

  it('changes viewport on phone button click', () => {
    render(<PreviewPanel services={mockServices} />);

    fireEvent.click(screen.getByLabelText('Phone view'));

    const container = screen.getByTestId('iframe-container');
    expect(container).toHaveStyle({ width: '375px' });
  });

  it('changes viewport on tablet button click', () => {
    render(<PreviewPanel services={mockServices} />);

    fireEvent.click(screen.getByLabelText('Tablet view'));

    const container = screen.getByTestId('iframe-container');
    expect(container).toHaveStyle({ width: '768px' });
  });

  it('shows full width on desktop button click', () => {
    render(<PreviewPanel services={mockServices} />);

    fireEvent.click(screen.getByLabelText('Desktop view'));

    const container = screen.getByTestId('iframe-container');
    expect(container).toHaveStyle({ width: '100%' });
  });

  it('shows refresh button', () => {
    render(<PreviewPanel services={mockServices} />);
    expect(screen.getByLabelText('Refresh preview')).toBeInTheDocument();
  });

  it('refreshes iframe on refresh button click', () => {
    render(<PreviewPanel services={mockServices} />);

    const iframe = screen.getByTestId('preview-iframe') as HTMLIFrameElement;
    const initialSrc = iframe.getAttribute('src');

    fireEvent.click(screen.getByLabelText('Refresh preview'));

    // URL should have a timestamp query parameter appended
    const newSrc = screen.getByTestId('preview-iframe').getAttribute('src');
    expect(newSrc).toContain('?_t=');
    expect(newSrc).not.toBe(initialSrc);
  });

  it('shows open in new tab button', () => {
    render(<PreviewPanel services={mockServices} />);
    expect(screen.getByLabelText('Open in new tab')).toBeInTheDocument();
  });

  it('opens URL in new tab on button click', () => {
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<PreviewPanel services={mockServices} />);

    fireEvent.click(screen.getByLabelText('Open in new tab'));
    expect(mockOpen).toHaveBeenCalledWith('http://localhost:3000', '_blank');
  });

  it('shows service status indicator', () => {
    render(<PreviewPanel services={mockServices} />);
    expect(screen.getByTestId('service-status')).toHaveClass('bg-success');
  });

  it('shows stopped status for stopped service', () => {
    render(<PreviewPanel services={mockServices} selectedService="admin" />);
    expect(screen.getByTestId('service-status')).toHaveClass('bg-muted');
  });

  it('shows error message when service stopped', () => {
    render(<PreviewPanel services={mockServices} selectedService="admin" />);
    expect(screen.getByText(/service is not running/i)).toBeInTheDocument();
  });

  it('shows empty state when no services', () => {
    render(<PreviewPanel services={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PreviewPanel services={mockServices} className="custom-preview" />);
    expect(screen.getByTestId('preview-panel')).toHaveClass('custom-preview');
  });
});
