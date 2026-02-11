import { RefreshCw, Loader2 } from 'lucide-react';

export interface WorkspaceToolbarProps {
  onScan: () => Promise<void>;
  lastScan: number | null;
  isScanning: boolean;
  projectCount: number;
  error?: string | null;
}

/**
 * Formats a Unix timestamp into a human-readable relative time string.
 * @param timestamp - Unix timestamp in milliseconds
 * @returns A relative time string (e.g. "5 minutes ago", "just now")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

/**
 * WorkspaceToolbar displays project count, last scan time, a refresh button,
 * scan progress spinner, and error messages for workspace scanning.
 */
export function WorkspaceToolbar({
  onScan,
  lastScan,
  isScanning,
  projectCount,
  error,
}: WorkspaceToolbarProps) {
  const projectLabel = projectCount === 1 ? 'project' : 'projects';
  const lastScanText = lastScan !== null
    ? `Last scanned: ${formatRelativeTime(lastScan)}`
    : 'Never scanned';

  return (
    <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
      <div className="flex items-center gap-4">
        {/* Project count */}
        <span
          data-testid="project-count"
          className="text-sm font-medium text-foreground"
        >
          {projectCount} {projectLabel}
        </span>

        {/* Last scan timestamp */}
        <span
          data-testid="last-scan"
          className="text-sm text-muted-foreground"
        >
          {lastScanText}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Scan error */}
        {error && (
          <span
            data-testid="scan-error"
            className="text-sm text-error"
          >
            {error}
          </span>
        )}

        {/* Spinner */}
        {isScanning && (
          <Loader2
            data-testid="scan-spinner"
            className="w-4 h-4 text-primary animate-spin"
          />
        )}

        {/* Refresh button */}
        <button
          data-testid="refresh-button"
          onClick={onScan}
          disabled={isScanning}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium
            rounded-md border border-border
            transition-colors
            ${isScanning
              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-surface hover:bg-muted text-foreground cursor-pointer'
            }
          `}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
