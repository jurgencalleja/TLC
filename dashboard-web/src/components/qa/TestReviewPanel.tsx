import { useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, FileCode, Target } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export type TestReviewStatus = 'pending' | 'approved' | 'needs_changes';

export interface TestCase {
  id: string;
  name: string;
  file: string;
  status: TestReviewStatus;
  coverage: string[];
  acceptanceCriteria: string[];
}

export interface TestReviewPanelProps {
  test: TestCase;
  onApprove: (testId: string) => void;
  onReject: (testId: string, comment: string) => void;
  className?: string;
}

const statusConfig: Record<TestReviewStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  pending: { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  needs_changes: { label: 'Needs Changes', variant: 'error' },
};

export function TestReviewPanel({
  test,
  onApprove,
  onReject,
  className = '',
}: TestReviewPanelProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comment, setComment] = useState('');

  const handleApprove = () => {
    onApprove(test.id);
  };

  const handleReject = () => {
    setShowRejectForm(true);
  };

  const handleSubmitReject = () => {
    onReject(test.id, comment);
    setShowRejectForm(false);
    setComment('');
  };

  const status = statusConfig[test.status];

  return (
    <div
      data-testid="test-review-panel"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{test.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <FileCode className="w-4 h-4" />
            {test.file}
          </div>
        </div>
        <Badge data-testid="status-badge" variant={status.variant}>
          {status.label}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Acceptance Criteria */}
        <div>
          <h4 className="flex items-center gap-2 font-medium text-foreground mb-2">
            <Target className="w-4 h-4" />
            Acceptance Criteria
          </h4>
          <ul className="space-y-2">
            {test.acceptanceCriteria.map((criterion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-5 h-5 flex items-center justify-center bg-muted rounded text-xs">
                  {index + 1}
                </span>
                {criterion}
              </li>
            ))}
          </ul>
        </div>

        {/* Coverage */}
        <div>
          <h4 className="font-medium text-foreground mb-2">Coverage</h4>
          <div className="flex flex-wrap gap-2">
            {test.coverage.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {/* Comment Section */}
        <div>
          <label className="block font-medium text-foreground mb-2">
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
        {showRejectForm ? (
          <>
            <Button variant="outline" onClick={() => setShowRejectForm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmitReject}>
              Submit
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Needs Changes
            </Button>
            <Button onClick={handleApprove} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
