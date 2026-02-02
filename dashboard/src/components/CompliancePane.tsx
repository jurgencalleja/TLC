import { Box, Text, useInput } from 'ink';

export interface CategoryScore {
  name: string;
  score: number;
  gapCount: number;
}

export interface EvidenceItem {
  id: string;
  name: string;
  collectedAt: string;
  status: 'valid' | 'expired' | 'pending';
}

export interface Gap {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  status: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  event: string;
  status: 'upcoming' | 'completed' | 'in-progress';
}

export interface CompliancePaneProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categories: CategoryScore[];
  evidence: EvidenceItem[];
  gaps: Gap[];
  lastReportDate?: string;
  auditTimeline?: TimelineEvent[];
  onDownloadReport?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  isActive?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'high':
      return 'red';
    case 'critical':
      return 'magenta';
    default:
      return 'gray';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high':
      return 'red';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'green';
    default:
      return 'gray';
  }
}

function ScoreDisplay({ score, riskLevel }: { score: number; riskLevel: string }) {
  const barLength = 20;
  const filledLength = Math.round((score / 100) * barLength);
  const bar = '\u2588'.repeat(filledLength) + '\u2591'.repeat(barLength - filledLength);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>Score: </Text>
        <Text color={getScoreColor(score) as any}>{score}%</Text>
        <Text dimColor> | Risk: </Text>
        <Text color={getRiskColor(riskLevel) as any}>{riskLevel.toUpperCase()}</Text>
      </Box>
      <Box>
        <Text color={getScoreColor(score) as any}>[{bar}]</Text>
      </Box>
    </Box>
  );
}

function CategoryBreakdown({ categories }: { categories: CategoryScore[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Categories:</Text>
      {categories.map((category) => (
        <Box key={category.name}>
          <Text>  {category.name}: </Text>
          <Text color={getScoreColor(category.score) as any}>{category.score}%</Text>
          {category.gapCount > 0 && (
            <Text dimColor> ({category.gapCount} gaps)</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Recent Evidence:</Text>
      {evidence.slice(0, 5).map((item) => {
        const statusColor = item.status === 'valid' ? 'green' : item.status === 'expired' ? 'red' : 'yellow';
        return (
          <Box key={item.id}>
            <Text>  </Text>
            <Text>{item.name}</Text>
            <Text dimColor> - </Text>
            <Text color={statusColor as any}>{item.status}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function GapsList({ gaps }: { gaps: Gap[] }) {
  if (gaps.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold dimColor>Gaps:</Text>
        <Text color="green">  No compliance gaps</Text>
      </Box>
    );
  }

  const highCount = gaps.filter((g) => g.severity === 'high').length;
  const mediumCount = gaps.filter((g) => g.severity === 'medium').length;
  const lowCount = gaps.filter((g) => g.severity === 'low').length;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Gaps ({gaps.length} total):</Text>
      <Box>
        <Text dimColor>  Summary: </Text>
        {highCount > 0 && <Text color="red">{highCount} high </Text>}
        {mediumCount > 0 && <Text color="yellow">{mediumCount} medium </Text>}
        {lowCount > 0 && <Text color="green">{lowCount} low</Text>}
      </Box>
      {gaps.slice(0, 5).map((gap) => (
        <Box key={gap.id}>
          <Text>  </Text>
          <Text color={getSeverityColor(gap.severity) as any}>[{gap.severity}]</Text>
          <Text> {gap.name}</Text>
          <Text dimColor> ({gap.status})</Text>
        </Box>
      ))}
    </Box>
  );
}

function AuditTimeline({ timeline }: { timeline: TimelineEvent[] }) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Audit Timeline:</Text>
      {timeline.map((event) => {
        const statusColor = event.status === 'completed' ? 'green' : event.status === 'upcoming' ? 'cyan' : 'yellow';
        return (
          <Box key={event.id}>
            <Text dimColor>  {event.date} </Text>
            <Text>{event.event}</Text>
            <Text color={statusColor as any}> [{event.status}]</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function LoadingIndicator() {
  return (
    <Box marginTop={1}>
      <Text color="cyan">Loading compliance data...</Text>
    </Box>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>Error</Text>
      <Text color="red">{error}</Text>
    </Box>
  );
}

export function CompliancePane({
  score,
  riskLevel,
  categories,
  evidence,
  gaps,
  lastReportDate,
  auditTimeline,
  onDownloadReport,
  onRefresh,
  loading = false,
  error = null,
  isActive = false,
}: CompliancePaneProps) {
  useInput(
    (input, _key) => {
      if (!isActive) return;

      // Download report with 'd'
      if (input === 'd' && onDownloadReport) {
        onDownloadReport();
      }

      // Refresh with 'r'
      if (input === 'r' && onRefresh) {
        onRefresh();
      }
    },
    { isActive }
  );

  return (
    <Box padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Compliance Overview</Text>
        {lastReportDate && (
          <Text dimColor> (Last report: {lastReportDate})</Text>
        )}
      </Box>

      {/* Loading State */}
      {loading && <LoadingIndicator />}

      {/* Error State */}
      {error && <ErrorDisplay error={error} />}

      {/* Main Content (only when not loading) */}
      {!loading && (
        <>
          {/* Score and Risk */}
          <ScoreDisplay score={score} riskLevel={riskLevel} />

          {/* Category Breakdown */}
          <CategoryBreakdown categories={categories} />

          {/* Evidence Collections */}
          <EvidenceList evidence={evidence} />

          {/* Gaps */}
          <GapsList gaps={gaps} />

          {/* Audit Timeline */}
          <AuditTimeline timeline={auditTimeline || []} />
        </>
      )}

      {/* Controls */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            {onDownloadReport && '[d] Download report  '}
            {onRefresh && '[r] Refresh'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default CompliancePane;
