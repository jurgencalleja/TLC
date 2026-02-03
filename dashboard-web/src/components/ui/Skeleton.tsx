export interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: 'rectangular' | 'rounded' | 'circular';
  className?: string;
  testId?: string;
}

const variantClasses = {
  rectangular: 'rounded-none',
  rounded: 'rounded-md',
  circular: 'rounded-full',
};

export function Skeleton({
  width,
  height = '1rem',
  variant = 'rounded',
  className = '',
  testId = 'skeleton',
}: SkeletonProps) {
  return (
    <div
      data-testid={testId}
      className={`
        animate-pulse bg-muted
        ${variantClasses[variant]}
        ${className}
      `}
      style={{ width, height }}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 1, className = '' }: SkeletonTextProps) {
  return (
    <div data-testid="skeleton-text" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          className={i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

export interface SkeletonCardProps {
  showHeader?: boolean;
  showImage?: boolean;
  textLines?: number;
  className?: string;
}

export function SkeletonCard({
  showHeader = false,
  showImage = false,
  textLines = 2,
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      data-testid="skeleton-card"
      className={`p-4 border border-border rounded-lg bg-surface ${className}`}
    >
      {showHeader && (
        <div data-testid="skeleton-header" className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton height="0.875rem" className="w-1/3" />
            <Skeleton height="0.75rem" className="w-1/4" />
          </div>
        </div>
      )}

      {showImage && (
        <Skeleton
          testId="skeleton-image"
          variant="rounded"
          height="150px"
          className="w-full mb-4"
        />
      )}

      <SkeletonText lines={textLines} />
    </div>
  );
}

export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  return (
    <Skeleton variant="circular" className={`${avatarSizes[size]} ${className}`} />
  );
}
