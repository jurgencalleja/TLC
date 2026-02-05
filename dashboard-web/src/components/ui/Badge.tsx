import { forwardRef, type HTMLAttributes } from 'react';

type BadgeStatus = 'running' | 'stopped' | 'building' | 'error' | 'pending' | 'success';
type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'secondary' | 'error' | 'outline' | 'destructive';
type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  variant?: BadgeVariant;
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

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'badge-primary bg-primary/10 text-primary border-primary/20',
  success: 'badge-success bg-success/10 text-success border-success/20',
  warning: 'badge-warning bg-warning/10 text-warning border-warning/20',
  danger: 'badge-error bg-danger/10 text-danger border-danger/20',
  info: 'badge-info bg-info/10 text-info border-info/20',
  neutral: 'badge-neutral bg-text-muted/10 text-text-secondary border-border',
  secondary: 'badge-secondary bg-text-muted/10 text-text-secondary border-border',
  error: 'badge-error bg-danger/10 text-danger border-danger/20',
  outline: 'badge-outline bg-transparent text-text-primary border-border',
  destructive: 'badge-destructive bg-danger/10 text-danger border-danger/20',
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
  lg: 'text-base px-3 py-1',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      status = 'pending',
      variant,
      size = 'sm',
      dot = false,
      icon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const colorClass = variant ? variantClasses[variant] : statusClasses[status];
    const classes = [
      'badge inline-flex items-center gap-1 rounded-full border',
      colorClass,
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
