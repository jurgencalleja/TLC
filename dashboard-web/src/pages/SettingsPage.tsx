import { useEffect } from 'react';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { useUIStore } from '../stores';

export function SettingsPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('settings');
  }, [setActiveView]);

  return (
    <div className="h-full overflow-auto">
      <SettingsPanel />
    </div>
  );
}
