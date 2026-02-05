import { useEffect, useState, useCallback } from 'react';
import { SettingsPanel, type TlcConfig } from '../components/settings/SettingsPanel';
import { ThemeToggle } from '../components/settings/ThemeToggle';
import { useUIStore } from '../stores';
import { Card } from '../components/ui/Card';

const defaultConfig: TlcConfig = {
  project: 'TLC Dashboard',
  testFrameworks: {
    primary: 'vitest',
  },
  quality: {
    coverageThreshold: 80,
    qualityScoreThreshold: 75,
  },
};

export function SettingsPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const [config, setConfig] = useState<TlcConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActiveView('settings');
  }, [setActiveView]);

  const handleSave = useCallback(async (newConfig: TlcConfig) => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setConfig(newConfig);
    setSaving(false);
  }, []);

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure your TLC dashboard</p>
      </div>

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
          config={config}
          onSave={handleSave}
          saving={saving}
        />
      </Card>
    </div>
  );
}
