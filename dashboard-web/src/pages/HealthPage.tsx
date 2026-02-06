import { useEffect, useState, useCallback } from 'react';
import { HealthDiagnosticsPanel } from '../components/HealthDiagnosticsPanel';
import { useUIStore } from '../stores';
import { api } from '../api';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { RefreshCw } from 'lucide-react';

export function HealthPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.health.getHealth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveView('health');
    fetchHealth();
  }, [setActiveView, fetchHealth]);

  if (loading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Health</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Health</h1>
          <Button variant="ghost" onClick={fetchHealth} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Retry
          </Button>
        </div>
        <div className="text-danger p-4">Failed to load health data: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-text-primary">Health</h1>
        <Button variant="ghost" onClick={fetchHealth} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Refresh
        </Button>
      </div>
      <HealthDiagnosticsPanel onRefresh={async () => {
        const data = await api.health.getHealth();
        return data as never;
      }} />
    </div>
  );
}
