import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface ScenarioRequest {
  title: string;
  description: string;
  feature?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ScenarioRequestFormProps {
  onSubmit: (request: ScenarioRequest) => void;
  onCancel?: () => void;
  features?: string[];
  className?: string;
}

export function ScenarioRequestForm({
  onSubmit,
  onCancel,
  features = [],
  className = '',
}: ScenarioRequestFormProps) {
  const [formData, setFormData] = useState<ScenarioRequest>({
    title: '',
    description: '',
    feature: '',
    priority: 'medium',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    field: keyof ScenarioRequest,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit(formData);

    // Clear form
    setFormData({
      title: '',
      description: '',
      feature: '',
      priority: 'medium',
    });
  };

  return (
    <form
      data-testid="scenario-request-form"
      onSubmit={handleSubmit}
      className={`bg-surface border border-border rounded-lg p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Request New Test Scenario
      </h3>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Scenario Title
          </label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Test user logout flow"
          />
          {errors.title && (
            <p className="text-sm text-error mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe what should be tested and any specific conditions..."
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm resize-none"
            rows={4}
          />
        </div>

        {/* Feature */}
        {features.length > 0 && (
          <div>
            <label
              htmlFor="feature"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Related Feature
            </label>
            <select
              id="feature"
              value={formData.feature}
              onChange={(e) => handleChange('feature', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm"
            >
              <option value="">Select a feature</option>
              {features.map((feature) => (
                <option key={feature} value={feature}>
                  {feature}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value as ScenarioRequest['priority'])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Submit Request</Button>
      </div>
    </form>
  );
}
