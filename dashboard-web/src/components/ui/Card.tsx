import { forwardRef, type HTMLAttributes } from 'react';

type CardStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  status?: CardStatus;
  clickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const statusColors: Record<CardStatus, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-text-muted',
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      status,
      clickable = false,
      padding = 'md',
      children,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const classes = [
      'card',
      paddingClasses[padding],
      clickable && 'card-hover',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const cardContent = (
      <>
        {status && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${statusColors[status]}`}
            data-testid="status-indicator"
          />
        )}
        {children}
      </>
    );

    if (clickable || onClick) {
      return (
        <div
          ref={ref}
          role="button"
          tabIndex={0}
          data-testid="card"
          className={`${classes} relative`}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
            }
          }}
          {...props}
        >
          {cardContent}
        </div>
      );
    }

    return (
      <div ref={ref} data-testid="card" className={`${classes} relative`} {...props}>
        {cardContent}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`border-b border-border pb-3 mb-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`border-t border-border pt-3 mt-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
