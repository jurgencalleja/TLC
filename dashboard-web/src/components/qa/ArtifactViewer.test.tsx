import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArtifactViewer } from './ArtifactViewer';

const mockArtifacts = {
  screenshots: [
    { name: 'login-success.png', url: '/artifacts/login-success.png', timestamp: new Date().toISOString() },
    { name: 'login-failure.png', url: '/artifacts/login-failure.png', timestamp: new Date().toISOString() },
  ],
  videos: [
    { name: 'login-flow.webm', url: '/artifacts/login-flow.webm', duration: '15s' },
  ],
  traces: [
    { name: 'trace-001.zip', url: '/artifacts/trace-001.zip', size: '2.4MB' },
  ],
};

describe('ArtifactViewer', () => {
  it('renders artifact viewer', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    expect(screen.getByTestId('artifact-viewer')).toBeInTheDocument();
  });

  it('shows screenshots tab', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    expect(screen.getByRole('tab', { name: /screenshots/i })).toBeInTheDocument();
  });

  it('shows videos tab', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    expect(screen.getByRole('tab', { name: /videos/i })).toBeInTheDocument();
  });

  it('shows traces tab', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    expect(screen.getByRole('tab', { name: /traces/i })).toBeInTheDocument();
  });

  it('displays screenshot thumbnails', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    expect(screen.getByAltText('login-success.png')).toBeInTheDocument();
    expect(screen.getByAltText('login-failure.png')).toBeInTheDocument();
  });

  it('opens screenshot in modal on click', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    fireEvent.click(screen.getByAltText('login-success.png'));
    expect(screen.getByTestId('artifact-modal')).toBeInTheDocument();
  });

  it('switches to videos tab', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    fireEvent.click(screen.getByRole('tab', { name: /videos/i }));
    expect(screen.getByText('login-flow.webm')).toBeInTheDocument();
  });

  it('shows video duration', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    fireEvent.click(screen.getByRole('tab', { name: /videos/i }));
    expect(screen.getByText('15s')).toBeInTheDocument();
  });

  it('switches to traces tab', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    fireEvent.click(screen.getByRole('tab', { name: /traces/i }));
    expect(screen.getByText('trace-001.zip')).toBeInTheDocument();
  });

  it('shows trace file size', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} />);
    fireEvent.click(screen.getByRole('tab', { name: /traces/i }));
    expect(screen.getByText('2.4MB')).toBeInTheDocument();
  });

  it('shows empty state when no artifacts', () => {
    render(<ArtifactViewer artifacts={{ screenshots: [], videos: [], traces: [] }} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ArtifactViewer artifacts={mockArtifacts} className="custom-artifacts" />);
    expect(screen.getByTestId('artifact-viewer')).toHaveClass('custom-artifacts');
  });
});
