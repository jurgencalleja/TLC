import { forwardRef, type HTMLAttributes } from 'react';

type BadgeStatus = 'running' | 'stopped' | 'building' | 'error' | 'pending' | 'success';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const statusClasses: Record<BadgeStatus, string> = {
  running: 'badge-success',
  success: 'badge-success',
  stopped: 'badge-neutral',
  pending: 'badge-neutral',
  building: 'badge-warning',
  error: 'badge-error',
};

const dotColors: Record<BadgeStatus, string> = {
  running: 'bg-success',
  success: 'bg-success',
  stopped: 'bg-text-muted',
  pending: 'bg-text-muted',
  building: 'bg-warning',
  error: 'bg-error',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      status = 'pending',
      size = 'sm',
      dot = false,
      icon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const classes = [
      'badge',
      statusClasses[status],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...props}>
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`}
            data-testid="dot-indicator"
          />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
