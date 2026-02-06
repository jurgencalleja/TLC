import { useEffect } from 'react';
import { SettingsPanel, type TlcConfig } from '../components/settings/SettingsPanel';
import { ThemeToggle } from '../components/settings/ThemeToggle';
import { useUIStore } from '../stores';
import { useSettings } from '../hooks';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

export function SettingsPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const { config, loading, saving, error, saveConfig } = useSettings();

  useEffect(() => {
    setActiveView('settings');
  }, [setActiveView]);

  const handleSave = async (newConfig: TlcConfig) => {
    try {
      await saveConfig(newConfig);
    } catch {
      // Error is handled by useSettings hook
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure your TLC dashboard</p>
      </div>

      {error && (
        <div className="text-danger text-sm p-3 bg-danger/10 rounded-lg">{error}</div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text-primary">Theme</div>
            <div className="text-sm text-text-secondary">
              Switch between light and dark mode
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Project Configuration</h2>
        <SettingsPanel
          config={config ?? { project: '' }}
          onSave={handleSave}
          saving={saving}
        />
      </Card>
    </div>
  );
}
