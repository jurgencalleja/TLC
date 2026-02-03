import { Monitor, Server, Layers, Shield } from 'lucide-react';

export type Environment = 'local' | 'vps' | 'staging' | 'production';

export interface EnvironmentBadgeProps {
  environment: Environment;
  showIcon?: boolean;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const environmentConfig: Record<Environment, { label: string; color: string; icon: React.ReactNode }> = {
  local: {
    label: 'Local',
    color: 'bg-muted text-muted-foreground',
    icon: <Monitor className="w-3 h-3" />,
  },
  vps: {
    label: 'VPS',
    color: 'bg-info text-info-foreground',
    icon: <Server className="w-3 h-3" />,
  },
  staging: {
    label: 'Staging',
    color: 'bg-warning text-warning-foreground',
    icon: <Layers className="w-3 h-3" />,
  },
  production: {
    label: 'Production',
    color: 'bg-error text-error-foreground',
    icon: <Shield className="w-3 h-3" />,
  },
};

const sizeClasses: Record<string, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function EnvironmentBadge({
  environment,
  showIcon = false,
  tooltip,
  size = 'md',
  className = '',
}: EnvironmentBadgeProps) {
  const config = environmentConfig[environment];

  return (
    <span
      data-testid="env-badge"
      title={tooltip}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.color}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showIcon && <span data-testid="env-icon">{config.icon}</span>}
      {config.label}
    </span>
  );
}
