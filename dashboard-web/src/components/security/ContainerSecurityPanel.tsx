import { useState, useMemo } from 'react';
import { RefreshCw, Shield, AlertTriangle, CheckCircle, ChevronDown, ExternalLink } from 'lucide-react';

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  service?: string;
  cis?: string;
  rule?: string;
  fix?: string;
  source?: string;
}

export interface SecurityAuditResult {
  overall: {
    score: number;
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    findings: SecurityFinding[];
  };
  dockerfile?: {
    score: number;
    findings: SecurityFinding[];
  };
  compose?: {
    score: number;
    findings: SecurityFinding[];
  };
}

interface ContainerSecurityPanelProps {
  auditResult: SecurityAuditResult;
  onRefresh?: () => void;
  onFix?: () => void;
  isLoading?: boolean;
  showCisLinks?: boolean;
  className?: string;
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type SourceFilter = 'all' | 'dockerfile' | 'compose';

const severityColors: Record<string, string> = {
  critical: 'bg-error text-error-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-info text-info-foreground',
  low: 'bg-muted text-muted-foreground',
};

const severityBadgeColors: Record<string, string> = {
  critical: 'bg-error/10 text-error border-error/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  medium: 'bg-info/10 text-info border-info/20',
  low: 'bg-muted/50 text-muted-foreground border-muted',
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-error';
}

function CISLink({ cis, showLink }: { cis: string; showLink?: boolean }) {
  const url = `https://www.cisecurity.org/benchmark/docker`;

  if (showLink) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        CIS {cis}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return <span className="text-xs text-muted-foreground">CIS {cis}</span>;
}

export function ContainerSecurityPanel({
  auditResult,
  onRefresh,
  onFix,
  isLoading = false,
  showCisLinks = false,
  className = '',
}: ContainerSecurityPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  const filteredFindings = useMemo(() => {
    let findings = auditResult.overall.findings;

    if (severityFilter !== 'all') {
      findings = findings.filter(f => f.severity === severityFilter);
    }

    if (sourceFilter === 'dockerfile' && auditResult.dockerfile) {
      findings = auditResult.dockerfile.findings;
    } else if (sourceFilter === 'compose' && auditResult.compose) {
      findings = auditResult.compose.findings;
    }

    return findings;
  }, [auditResult, severityFilter, sourceFilter]);

  const { score, summary } = auditResult.overall;
  const hasFindings = auditResult.overall.findings.length > 0;

  return (
    <div
      role="region"
      aria-label="Container Security"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Container Security</h2>
        </div>
        <div className="flex items-center gap-2">
          {onFix && hasFindings && (
            <button
              onClick={onFix}
              aria-label="Fix security issues"
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Fix Issues
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refresh security audit"
              disabled={isLoading}
              className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div data-testid="loading-indicator" className="p-4 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Scanning...</span>
        </div>
      )}

      {/* Score and Summary */}
      {!isLoading && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-6">
            {/* Score */}
            <div className="text-center">
              <div
                data-testid="security-score"
                className={`text-4xl font-bold ${getScoreColor(score)}`}
              >
                {score}
              </div>
              <div className="text-xs text-muted-foreground">Security Score</div>
            </div>

            {/* Summary Badges */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                aria-label="Filter by critical severity"
                className={`px-2 py-1 text-xs rounded border ${
                  severityFilter === 'critical' ? 'ring-2 ring-primary' : ''
                } ${severityBadgeColors.critical}`}
              >
                {summary.critical} Critical
              </button>
              <button
                onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
                aria-label="Filter by high severity"
                className={`px-2 py-1 text-xs rounded border ${
                  severityFilter === 'high' ? 'ring-2 ring-primary' : ''
                } ${severityBadgeColors.high}`}
              >
                {summary.high} High
              </button>
              <button
                onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
                aria-label="Filter by medium severity"
                className={`px-2 py-1 text-xs rounded border ${
                  severityFilter === 'medium' ? 'ring-2 ring-primary' : ''
                } ${severityBadgeColors.medium}`}
              >
                {summary.medium} Medium
              </button>
              <button
                onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
                aria-label="Filter by low severity"
                className={`px-2 py-1 text-xs rounded border ${
                  severityFilter === 'low' ? 'ring-2 ring-primary' : ''
                } ${severityBadgeColors.low}`}
              >
                {summary.low} Low
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Tabs */}
      {!isLoading && (
        <div className="flex border-b border-border" role="tablist">
          <button
            role="tab"
            aria-selected={sourceFilter === 'all'}
            onClick={() => setSourceFilter('all')}
            className={`px-4 py-2 text-sm ${
              sourceFilter === 'all'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {auditResult.dockerfile && (
            <button
              role="tab"
              aria-label="Dockerfile findings"
              aria-selected={sourceFilter === 'dockerfile'}
              onClick={() => setSourceFilter('dockerfile')}
              className={`px-4 py-2 text-sm ${
                sourceFilter === 'dockerfile'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dockerfile ({auditResult.dockerfile.findings.length})
            </button>
          )}
          {auditResult.compose && (
            <button
              role="tab"
              aria-label="Compose findings"
              aria-selected={sourceFilter === 'compose'}
              onClick={() => setSourceFilter('compose')}
              className={`px-4 py-2 text-sm ${
                sourceFilter === 'compose'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Compose ({auditResult.compose.findings.length})
            </button>
          )}
        </div>
      )}

      {/* Findings List */}
      {!isLoading && (
        <div className="p-4">
          {!hasFindings ? (
            <div className="flex items-center justify-center gap-2 py-8 text-success">
              <CheckCircle className="w-5 h-5" />
              <span>No security issues found!</span>
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No findings match the current filter
            </div>
          ) : (
            <ul
              role="list"
              aria-label="Security findings"
              className="space-y-2"
            >
              {filteredFindings.map((finding, index) => (
                <li
                  key={index}
                  data-testid="finding-item"
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFinding(expandedFinding === index ? null : index)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${severityColors[finding.severity]}`}
                    >
                      {finding.severity}
                    </span>
                    <span className="flex-1 text-left text-sm">{finding.message}</span>
                    {finding.service && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {finding.service}
                      </span>
                    )}
                    {finding.cis && <CISLink cis={finding.cis} showLink={showCisLinks} />}
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        expandedFinding === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFinding === index && finding.fix && (
                    <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/30">
                      <div className="text-xs text-muted-foreground mt-2">Recommendation:</div>
                      <div className="text-sm mt-1">{finding.fix}</div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
