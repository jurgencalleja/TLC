import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export interface ConnectionStatusProps {
  status: ConnectionState;
  showLabel?: boolean;
  lastConnected?: string;
  onRetry?: () => void;
  className?: string;
}

const statusConfig: Record<ConnectionState, { color: string; label: string }> = {
  connected: { color: 'bg-success', label: 'Connected' },
  disconnected: { color: 'bg-error', label: 'Disconnected' },
  connecting: { color: 'bg-warning', label: 'Connecting...' },
  reconnecting: { color: 'bg-warning animate-pulse', label: 'Reconnecting...' },
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function ConnectionStatus({
  status,
  showLabel = false,
  lastConnected,
  onRetry,
  className = '',
}: ConnectionStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = statusConfig[status];

  return (
    <div
      data-testid="connection-status"
      className={`relative flex items-center gap-2 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        data-testid="connection-indicator"
        className={`w-2 h-2 rounded-full ${config.color}`}
      />

      {showLabel && (
        <div className="text-sm">
          <span className="text-foreground">{config.label}</span>
          {lastConnected && status === 'disconnected' && (
            <span className="text-muted-foreground ml-1">
              (Last connected: {formatRelativeTime(lastConnected)})
            </span>
          )}
        </div>
      )}

      {onRetry && status === 'disconnected' && (
        <button
          onClick={onRetry}
          aria-label="Retry connection"
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}

      {/* Tooltip */}
      {showTooltip && !showLabel && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs whitespace-nowrap z-10">
          {config.label}
        </div>
      )}
    </div>
  );
}
