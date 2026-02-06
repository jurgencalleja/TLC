import {
  Plus,
  ShieldCheck,
  Rocket,
  CheckCircle2,
  XCircle,
  User,
  Clock,
} from 'lucide-react';

export type TimelineEventType = 'created' | 'gates' | 'deployed' | 'accepted' | 'rejected';

export interface GateResult {
  name: string;
  status: 'pass' | 'fail';
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  user: string;
  description: string;
  gateResults?: GateResult[];
  rejectionReason?: string;
}

export interface ReleaseTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const eventIcons: Record<TimelineEventType, { icon: React.ReactNode; color: string }> = {
  created: { icon: <Plus className="w-4 h-4" />, color: 'text-info' },
  gates: { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-warning' },
  deployed: { icon: <Rocket className="w-4 h-4" />, color: 'text-primary' },
  accepted: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-success' },
  rejected: { icon: <XCircle className="w-4 h-4" />, color: 'text-danger' },
};

/**
 * ReleaseTimeline displays a chronological list of release pipeline events
 * including creation, gate results, deployments, and QA decisions.
 */
export function ReleaseTimeline({ events, className = '' }: ReleaseTimelineProps) {
  if (events.length === 0) {
    return (
      <div
        data-testid="release-timeline"
        className={`bg-surface border border-border rounded-lg p-6 overflow-y-auto ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No events</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="release-timeline"
      className={`bg-surface border border-border rounded-lg p-4 overflow-y-auto max-h-96 ${className}`}
    >
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {events.map((event, index) => {
            const isLatest = index === events.length - 1;
            const { icon, color } = eventIcons[event.type];

            return (
              <div
                key={event.id}
                data-testid="timeline-event"
                data-latest={isLatest ? 'true' : 'false'}
                className={`relative pl-10 ${isLatest ? 'font-semibold' : ''}`}
              >
                {/* Icon */}
                <div
                  data-testid={`icon-${event.type}`}
                  className={`absolute left-1.5 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center ${color}`}
                >
                  {icon}
                </div>

                {/* Content */}
                <div className={`pb-2 ${isLatest ? 'bg-muted/30 rounded-md p-2 -ml-2' : ''}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground">{event.description}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {event.user}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Gate results */}
                  {event.gateResults && event.gateResults.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {event.gateResults.map((gate) => (
                        <span
                          key={gate.name}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                            gate.status === 'pass'
                              ? 'text-success border-success/20 bg-success/10'
                              : 'text-danger border-danger/20 bg-danger/10'
                          }`}
                        >
                          {gate.status === 'pass' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {gate.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rejection reason */}
                  {event.rejectionReason && (
                    <div className="mt-2 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md p-2">
                      {event.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
