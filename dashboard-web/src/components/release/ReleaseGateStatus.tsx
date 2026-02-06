import {
  CheckCircle2,
  XCircle,
  Loader2,
  MinusCircle,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export type GateStatus = 'pass' | 'fail' | 'pending' | 'skipped';

export interface Gate {
  name: string;
  status: GateStatus;
  duration?: number;
  details?: string;
}

export interface ReleaseGateStatusProps {
  gates: Gate[];
  className?: string;
}

type OverallStatus = 'All Passed' | 'Some Failed' | 'In Progress';

const gateIcons: Record<GateStatus, { icon: React.ReactNode; testId: string; color: string }> = {
  pass: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    testId: 'gate-icon-pass',
    color: 'text-success',
  },
  fail: {
    icon: <XCircle className="w-4 h-4" />,
    testId: 'gate-icon-fail',
    color: 'text-danger',
  },
  pending: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    testId: 'gate-icon-pending',
    color: 'text-warning',
  },
  skipped: {
    icon: <MinusCircle className="w-4 h-4" />,
    testId: 'gate-icon-skipped',
    color: 'text-muted-foreground',
  },
};

const overallVariants: Record<OverallStatus, 'success' | 'danger' | 'warning'> = {
  'All Passed': 'success',
  'Some Failed': 'danger',
  'In Progress': 'warning',
};

function computeOverallStatus(gates: Gate[]): OverallStatus {
  const hasFail = gates.some((g) => g.status === 'fail');
  if (hasFail) return 'Some Failed';
  const hasPending = gates.some((g) => g.status === 'pending');
  if (hasPending) return 'In Progress';
  return 'All Passed';
}

/**
 * ReleaseGateStatus displays the status of each quality gate in a release pipeline,
 * along with an overall status indicator.
 */
export function ReleaseGateStatus({ gates, className = '' }: ReleaseGateStatusProps) {
  if (gates.length === 0) {
    return (
      <div
        data-testid="gate-status"
        className={`bg-surface border border-border rounded-lg p-6 ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No gates configured</p>
        </div>
      </div>
    );
  }

  const overall = computeOverallStatus(gates);

  return (
    <div
      data-testid="gate-status"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="font-semibold">Quality Gates</h3>
        </div>
        <Badge data-testid="overall-status" variant={overallVariants[overall]}>
          {overall}
        </Badge>
      </div>

      {/* Gate List */}
      <div className="divide-y divide-border">
        {gates.map((gate) => {
          const { icon, testId, color } = gateIcons[gate.status];

          return (
            <div key={gate.name} data-testid="gate-item" className="p-3 flex items-start gap-3">
              <div data-testid={testId} className={color}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{gate.name}</span>
                  {gate.duration !== undefined && (
                    <span className="text-xs text-muted-foreground">{gate.duration}s</span>
                  )}
                </div>
                {gate.details && (
                  <p className="text-xs text-muted-foreground mt-1">{gate.details}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
