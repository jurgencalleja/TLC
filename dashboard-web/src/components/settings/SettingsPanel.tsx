import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface TlcConfig {
  project?: string;
  testFrameworks?: {
    primary?: string;
  };
  quality?: {
    coverageThreshold?: number;
    qualityScoreThreshold?: number;
  };
}

export interface SettingsPanelProps {
  config: TlcConfig;
  onSave: (config: TlcConfig) => void;
  onCancel?: () => void;
  saving?: boolean;
  className?: string;
}

export function SettingsPanel({
  config,
  onSave,
  onCancel,
  saving = false,
  className = '',
}: SettingsPanelProps) {
  const [formData, setFormData] = useState({
    project: config.project || '',
    coverageThreshold: config.quality?.coverageThreshold?.toString() || '80',
    qualityScoreThreshold: config.quality?.qualityScoreThreshold?.toString() || '75',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const coverage = parseInt(formData.coverageThreshold, 10);
    if (isNaN(coverage) || coverage < 0 || coverage > 100) {
      newErrors.coverageThreshold = 'Must be between 0 and 100';
    }

    const quality = parseInt(formData.qualityScoreThreshold, 10);
    if (isNaN(quality) || quality < 0 || quality > 100) {
      newErrors.qualityScoreThreshold = 'Must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      ...config,
      project: formData.project,
      quality: {
        ...config.quality,
        coverageThreshold: parseInt(formData.coverageThreshold, 10),
        qualityScoreThreshold: parseInt(formData.qualityScoreThreshold, 10),
      },
    });
  };

  return (
    <div
      data-testid="settings-panel"
      className={`bg-surface border border-border rounded-lg p-6 ${className}`}
    >
      <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>

      {/* General Section */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          General
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-foreground mb-1">
              Project Name
            </label>
            <Input
              id="project"
              value={formData.project}
              onChange={(e) => handleChange('project', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Quality Section */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Quality
        </h3>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="coverageThreshold"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Coverage Threshold (%)
            </label>
            <Input
              id="coverageThreshold"
              type="number"
              min="0"
              max="100"
              value={formData.coverageThreshold}
              onChange={(e) => handleChange('coverageThreshold', e.target.value)}
            />
            {errors.coverageThreshold && (
              <p className="text-sm text-error mt-1">{errors.coverageThreshold}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="qualityScoreThreshold"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Quality Score Threshold
            </label>
            <Input
              id="qualityScoreThreshold"
              type="number"
              min="0"
              max="100"
              value={formData.qualityScoreThreshold}
              onChange={(e) => handleChange('qualityScoreThreshold', e.target.value)}
            />
            {errors.qualityScoreThreshold && (
              <p className="text-sm text-error mt-1">{errors.qualityScoreThreshold}</p>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
