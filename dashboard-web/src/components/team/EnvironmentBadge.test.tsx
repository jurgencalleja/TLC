import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EnvironmentBadge } from './EnvironmentBadge';

describe('EnvironmentBadge', () => {
  it('renders local environment', () => {
    render(<EnvironmentBadge environment="local" />);
    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.getByTestId('env-badge')).toHaveClass('bg-muted');
  });

  it('renders vps environment', () => {
    render(<EnvironmentBadge environment="vps" />);
    expect(screen.getByText('VPS')).toBeInTheDocument();
    expect(screen.getByTestId('env-badge')).toHaveClass('bg-info');
  });

  it('renders staging environment', () => {
    render(<EnvironmentBadge environment="staging" />);
    expect(screen.getByText('Staging')).toBeInTheDocument();
    expect(screen.getByTestId('env-badge')).toHaveClass('bg-warning');
  });

  it('renders production environment', () => {
    render(<EnvironmentBadge environment="production" />);
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByTestId('env-badge')).toHaveClass('bg-error');
  });

  it('shows environment icon', () => {
    render(<EnvironmentBadge environment="vps" showIcon />);
    expect(screen.getByTestId('env-icon')).toBeInTheDocument();
  });

  it('hides icon by default', () => {
    render(<EnvironmentBadge environment="vps" />);
    expect(screen.queryByTestId('env-icon')).not.toBeInTheDocument();
  });

  it('shows tooltip with details', () => {
    render(<EnvironmentBadge environment="vps" tooltip="Deployed on AWS" />);
    expect(screen.getByTestId('env-badge')).toHaveAttribute('title', 'Deployed on AWS');
  });

  it('applies custom className', () => {
    render(<EnvironmentBadge environment="local" className="custom-badge" />);
    expect(screen.getByTestId('env-badge')).toHaveClass('custom-badge');
  });

  it('supports small size', () => {
    render(<EnvironmentBadge environment="local" size="sm" />);
    expect(screen.getByTestId('env-badge')).toHaveClass('text-xs');
  });

  it('supports medium size', () => {
    render(<EnvironmentBadge environment="local" size="md" />);
    expect(screen.getByTestId('env-badge')).toHaveClass('text-sm');
  });

  it('supports large size', () => {
    render(<EnvironmentBadge environment="local" size="lg" />);
    expect(screen.getByTestId('env-badge')).toHaveClass('text-base');
  });
});
