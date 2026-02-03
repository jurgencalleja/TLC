/**
 * Health Diagnostics Panel
 * Displays system health metrics and status
 */
import { useEffect } from 'react';

interface MemoryInfo {
  used: number;
  total: number;
  percent: number;
}

interface CpuInfo {
  percent: number;
}

interface TestsInfo {
  passed: number;
  failed: number;
  total: number;
}

interface RouterProvider {
  name: string;
  status: string;
}

interface RouterInfo {
  providers: RouterProvider[];
}

interface Alert {
  severity: string;
  message: string;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: MemoryInfo;
  cpu: CpuInfo;
  tests: TestsInfo;
  router?: RouterInfo;
  issues?: string[];
  alerts?: Alert[];
}

interface HealthDiagnosticsPanelProps {
  health?: HealthData;
  loading?: boolean;
  error?: string;
  showGraphs?: boolean;
  onRefresh?: () => Promise<HealthData>;
  refreshInterval?: number;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function StatusBadge({ status }: { status: string }) {
  const colorClasses = {
    healthy: 'bg-success text-white',
    degraded: 'bg-warning text-black',
    unhealthy: 'bg-error text-white',
  }[status] || 'bg-text-muted text-white';

  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${colorClasses}`}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-surface-elevated p-4 rounded-lg">
      <p className="text-text-muted text-sm">{label}</p>
      <p className="text-xl font-semibold">
        {value}{unit}
      </p>
    </div>
  );
}

function SimpleGraph({ value, testId }: { value: number; testId: string }) {
  return (
    <div data-testid={testId} className="h-8 bg-surface-elevated rounded overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function HealthDiagnosticsPanel({
  health,
  loading,
  error,
  showGraphs,
  onRefresh,
  refreshInterval,
}: HealthDiagnosticsPanelProps) {
  useEffect(() => {
    if (onRefresh && refreshInterval) {
      const interval = setInterval(() => {
        onRefresh();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [onRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-muted">Loading health diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-muted">No health data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Health</h2>
        <StatusBadge status={health.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Memory" value={health.memory.percent} unit="%" />
        <MetricCard label="CPU" value={health.cpu.percent} unit="%" />
        <MetricCard label="Tests" value={health.tests.passed} unit={` / ${health.tests.total}`} />
        <MetricCard label="Uptime" value={formatUptime(health.uptime)} />
      </div>

      {showGraphs && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-text-muted mb-2">Memory Usage</p>
            <SimpleGraph value={health.memory.percent} testId="memory-graph" />
          </div>
          <div>
            <p className="text-sm text-text-muted mb-2">CPU Usage</p>
            <SimpleGraph value={health.cpu.percent} testId="cpu-graph" />
          </div>
        </div>
      )}

      {health.issues && health.issues.length > 0 && (
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <h3 className="font-medium text-warning mb-2">Issues</h3>
          <ul className="list-disc list-inside space-y-1">
            {health.issues.map((issue, index) => (
              <li key={index} className="text-sm">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {health.alerts && health.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Alerts</h3>
          {health.alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                alert.severity === 'warning'
                  ? 'bg-warning/10 border border-warning'
                  : alert.severity === 'error'
                  ? 'bg-error/10 border border-error'
                  : 'bg-info/10 border border-info'
              }`}
            >
              <p className="text-sm">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {health.router && health.router.providers && (
        <div>
          <h3 className="font-medium mb-2">Router Providers</h3>
          <div className="space-y-2">
            {health.router.providers.map((provider, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-surface-elevated rounded"
              >
                <span>{provider.name}</span>
                <span
                  className={`text-sm ${
                    provider.status === 'active'
                      ? 'text-success'
                      : provider.status === 'error'
                      ? 'text-error'
                      : 'text-text-muted'
                  }`}
                >
                  {provider.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
