/**
 * Client Dashboard - Non-technical view for project stakeholders
 * Shows progress, status updates, and bug submission without developer jargon
 */
import { useState, type FormEvent } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Project {
  name: string;
  progress: number;
  currentPhase: string;
  totalPhases: number;
  completedPhases: number;
}

interface StatusUpdate {
  date: string;
  message: string;
}

interface BugReport {
  title: string;
  description: string;
}

interface ClientDashboardProps {
  project?: Project;
  updates?: StatusUpdate[];
  loading?: boolean;
  error?: string;
  onBugSubmit?: (bug: BugReport) => Promise<{ success: boolean }>;
}

export function ClientDashboard({
  project,
  updates = [],
  loading = false,
  error,
  onBugSubmit,
}: ClientDashboardProps) {
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">Loading project details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card status="error" className="max-w-md">
          <p className="text-error">{error}</p>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">No project data available</p>
      </div>
    );
  }

  const handleBugSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onBugSubmit || !bugTitle || !bugDescription) return;

    setSubmitting(true);
    try {
      await onBugSubmit({ title: bugTitle, description: bugDescription });
      setBugTitle('');
      setBugDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Project Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
        <p className="text-text-secondary mt-1">Project Overview</p>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Overall Progress</h2>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Completion</span>
            <span className="text-xl font-bold text-text-primary">{project.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={project.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 bg-bg-tertiary rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Phase Progress</h2>
        </CardHeader>
        <div className="space-y-4">
          <p className="text-text-primary font-medium">{project.currentPhase}</p>
          <p className="text-text-secondary">
            {project.completedPhases} of {project.totalPhases} phases complete
          </p>
          <div
            className="h-2 bg-bg-tertiary rounded-full overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-info rounded-full transition-all duration-300"
              style={{ width: `${(project.completedPhases / project.totalPhases) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Status Updates */}
      {updates.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">Recent Updates</h2>
          </CardHeader>
          <ul className="space-y-3">
            {updates.map((update, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-text-muted text-sm whitespace-nowrap">{update.date}</span>
                <span className="text-text-primary">{update.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Bug Report Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Report an Issue</h2>
        </CardHeader>
        <form onSubmit={handleBugSubmit} className="space-y-4">
          <div>
            <label htmlFor="bug-title" className="block text-sm font-medium text-text-secondary mb-1.5">
              Title
            </label>
            <input
              id="bug-title"
              type="text"
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
              className="input w-full"
              placeholder="Brief summary of the issue"
            />
          </div>
          <div>
            <label htmlFor="bug-description" className="block text-sm font-medium text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              id="bug-description"
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              className="input w-full min-h-[100px]"
              placeholder="Please describe what happened and what you expected"
            />
          </div>
          <Button type="submit" loading={submitting} disabled={!bugTitle || !bugDescription}>
            Submit Issue
          </Button>
        </form>
      </Card>
    </div>
  );
}
