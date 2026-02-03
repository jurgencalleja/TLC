export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  taskUpdates: boolean;
  testResults: boolean;
  teamActivity: boolean;
  deployments: boolean;
}

export interface NotificationSettingsProps {
  settings: NotificationPreferences;
  onChange: (settings: NotificationPreferences) => void;
  className?: string;
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ id, label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
      />
    </div>
  );
}

export function NotificationSettings({
  settings,
  onChange,
  className = '',
}: NotificationSettingsProps) {
  const handleChange = (key: keyof NotificationPreferences, value: boolean) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div
      data-testid="notification-settings"
      className={`bg-surface border border-border rounded-lg p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Notifications</h3>

      <div className="divide-y divide-border">
        {/* Master Toggle */}
        <ToggleRow
          id="notifications-enabled"
          label="Enable Notifications"
          description="Turn all notifications on or off"
          checked={settings.enabled}
          onChange={(checked) => handleChange('enabled', checked)}
        />

        {/* Sound */}
        <ToggleRow
          id="notification-sound"
          label="Notification Sound"
          description="Play a sound for notifications"
          checked={settings.sound}
          disabled={!settings.enabled}
          onChange={(checked) => handleChange('sound', checked)}
        />

        {/* Task Updates */}
        <ToggleRow
          id="task-updates"
          label="Task Updates"
          description="When tasks are claimed or completed"
          checked={settings.taskUpdates}
          disabled={!settings.enabled}
          onChange={(checked) => handleChange('taskUpdates', checked)}
        />

        {/* Test Results */}
        <ToggleRow
          id="test-results"
          label="Test Results"
          description="When test runs complete"
          checked={settings.testResults}
          disabled={!settings.enabled}
          onChange={(checked) => handleChange('testResults', checked)}
        />

        {/* Team Activity */}
        <ToggleRow
          id="team-activity"
          label="Team Activity"
          description="When teammates commit or comment"
          checked={settings.teamActivity}
          disabled={!settings.enabled}
          onChange={(checked) => handleChange('teamActivity', checked)}
        />

        {/* Deployments */}
        <ToggleRow
          id="deployments"
          label="Deployments"
          description="When branches are deployed"
          checked={settings.deployments}
          disabled={!settings.enabled}
          onChange={(checked) => handleChange('deployments', checked)}
        />
      </div>
    </div>
  );
}
