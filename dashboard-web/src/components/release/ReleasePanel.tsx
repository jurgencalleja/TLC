import {
  Tag,
  ExternalLink,
  FileText,
  TestTube2,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

export type ReleaseStatus = 'pending' | 'deployed' | 'accepted' | 'rejected';

export interface TestSummary {
  passed: number;
  failed: number;
  coverage: number;
}

export interface ReleaseCandidate {
  id: string;
  tag: string;
  version: string;
  status: ReleaseStatus;
  previewUrl: string;
  changelog: string;
  testSummary: TestSummary;
  createdAt: string;
}

export interface ReleasePanelProps {
  candidates: ReleaseCandidate[];
  userRole: 'qa' | 'developer' | 'admin';
  onAccept: (tag: string) => void;
  onReject: (tag: string) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

const statusVariants: Record<ReleaseStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  deployed: 'info',
  accepted: 'success',
  rejected: 'danger',
};

/**
 * ReleasePanel displays a list of release candidates with their status,
 * test summaries, and QA action buttons.
 */
export function ReleasePanel({
  candidates,
  userRole,
  onAccept,
  onReject,
  loading = false,
  error,
  className = '',
}: ReleasePanelProps) {
  if (loading) {
    return (
      <div
        data-testid="release-panel"
        className={`bg-surface border border-border rounded-lg p-6 ${className}`}
      >
        <div className="space-y-4">
          <Skeleton height="1.5rem" className="w-1/3" />
          <Skeleton height="6rem" className="w-full" />
          <Skeleton height="6rem" className="w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="release-panel"
        className={`bg-surface border border-border rounded-lg p-6 ${className}`}
      >
        <div className="text-center text-danger">
          <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div
        data-testid="release-panel"
        className={`bg-surface border border-border rounded-lg p-6 ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No releases pending</h3>
          <p>Release candidates will appear here when tags are pushed</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="release-panel"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Release Candidates</h2>
          <Badge variant="secondary">{candidates.length}</Badge>
        </div>
      </div>

      {/* Candidate List */}
      <div className="divide-y divide-border">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="p-4 space-y-3">
            {/* Top row: tag, version, status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{candidate.tag}</span>
                <span className="text-sm text-muted-foreground">{candidate.version}</span>
              </div>
              <Badge variant={statusVariants[candidate.status]}>
                {candidate.status}
              </Badge>
            </div>

            {/* Changelog */}
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{candidate.changelog}</span>
            </div>

            {/* Preview URL */}
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <a
                href={candidate.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {candidate.previewUrl.replace(/^https?:\/\//, '')}
              </a>
            </div>

            {/* Test Summary */}
            <div className="flex items-center gap-4 text-sm">
              <TestTube2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-success">{candidate.testSummary.passed} passed</span>
              <span className={candidate.testSummary.failed > 0 ? 'text-danger' : 'text-muted-foreground'}>
                {candidate.testSummary.failed} failed
              </span>
              <span className="text-muted-foreground">{candidate.testSummary.coverage}% coverage</span>
            </div>

            {/* Actions (QA only) */}
            {userRole === 'qa' && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => onAccept(candidate.tag)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject(candidate.tag)}
                  className="flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
