import { useEffect } from 'react';
import { HealthDiagnosticsPanel } from '../components/HealthDiagnosticsPanel';
import { useUIStore } from '../stores';

export function HealthPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('health');
  }, [setActiveView]);

  return (
    <div className="h-full overflow-auto">
      <HealthDiagnosticsPanel />
    </div>
  );
}
