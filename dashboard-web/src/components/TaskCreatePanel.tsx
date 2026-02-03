/**
 * Task Create Panel
 * Form for creating new tasks
 */
import { useState, type FormEvent } from 'react';

interface Phase {
  number: number;
  name?: string;
}

interface TaskFormData {
  subject: string;
  description: string;
  phase?: number;
}

interface TaskCreatePanelProps {
  phases?: Phase[];
  currentPhase?: number;
  onSubmit?: (data: TaskFormData) => Promise<{ id: string }>;
}

export function TaskCreatePanel({ phases, currentPhase, onSubmit }: TaskCreatePanelProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>(
    currentPhase?.toString() || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setValidationError(null);

    if (!subject.trim()) {
      setValidationError('Subject is required');
      return;
    }

    if (onSubmit) {
      setLoading(true);
      try {
        await onSubmit({
          subject,
          description,
          phase: selectedPhase ? parseInt(selectedPhase, 10) : undefined,
        });
        setSuccess(true);
        setSubject('');
        setDescription('');
      } catch (err) {
        setError('Failed to create task');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="task-subject" className="block text-sm font-medium text-text-secondary mb-1.5">
          Subject
        </label>
        <input
          id="task-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input w-full"
        />
      </div>

      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-text-secondary mb-1.5">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input w-full min-h-[100px]"
        />
      </div>

      {phases && phases.length > 0 && (
        <div>
          <label htmlFor="task-phase" className="block text-sm font-medium text-text-secondary mb-1.5">
            Phase
          </label>
          <select
            id="task-phase"
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="input w-full"
          >
            <option value="">Select a phase</option>
            {phases.map((phase) => (
              <option key={phase.number} value={phase.number.toString()}>
                {phase.name || `Phase ${phase.number}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {validationError && (
        <p className="text-sm text-error" role="alert">
          {validationError}
        </p>
      )}

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-success" role="status">
          Task created successfully
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={loading}
      >
        {loading ? 'Create Task...' : 'Create Task'}
      </button>
    </form>
  );
}
