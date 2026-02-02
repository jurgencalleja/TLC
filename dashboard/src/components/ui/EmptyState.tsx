import { Box, Text } from 'ink';

export type EmptyStateType = 'tasks' | 'bugs' | 'agents' | 'logs' | 'projects' | 'health' | 'router' | 'generic';

interface EmptyStateInfo {
  icon: string;
  defaultTitle: string;
  defaultSubtitle: string;
}

const EMPTY_STATE_INFO: Record<EmptyStateType, EmptyStateInfo> = {
  tasks: {
    icon: '[]',
    defaultTitle: 'No tasks yet',
    defaultSubtitle: 'Run /tlc:plan to create tasks',
  },
  bugs: {
    icon: '[]',
    defaultTitle: 'No bugs reported',
    defaultSubtitle: 'Run /tlc:bug to report an issue',
  },
  agents: {
    icon: '[]',
    defaultTitle: 'No agents running',
    defaultSubtitle: 'Agents will appear when spawned',
  },
  logs: {
    icon: '[]',
    defaultTitle: 'No logs yet',
    defaultSubtitle: 'Logs will appear when activity starts',
  },
  projects: {
    icon: '[]',
    defaultTitle: 'No projects',
    defaultSubtitle: 'Run tlc init to create a project',
  },
  health: {
    icon: '[]',
    defaultTitle: 'No health data',
    defaultSubtitle: 'Run /tlc:security to audit',
  },
  router: {
    icon: '[]',
    defaultTitle: 'No router configured',
    defaultSubtitle: 'Configure providers in .tlc.json',
  },
  generic: {
    icon: '[]',
    defaultTitle: 'Nothing here',
    defaultSubtitle: 'No items to display',
  },
};

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  subtitle?: string;
  action?: string;
  compact?: boolean;
}

/**
 * Renders a friendly empty state with contextual messaging.
 * Uses sensible defaults based on the type prop.
 */
export function EmptyState({
  type = 'generic',
  title,
  subtitle,
  action,
  compact = false,
}: EmptyStateProps) {
  const info = EMPTY_STATE_INFO[type];
  const displayTitle = title || info.defaultTitle;
  const displaySubtitle = subtitle || info.defaultSubtitle;

  if (compact) {
    return (
      <Box>
        <Text dimColor>{displayTitle}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      {/* Icon */}
      <Box marginBottom={1}>
        <Text dimColor>{info.icon}</Text>
      </Box>

      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{displayTitle}</Text>
      </Box>

      {/* Subtitle */}
      <Box marginBottom={1}>
        <Text color="gray">{displaySubtitle}</Text>
      </Box>

      {/* Action hint */}
      {action && (
        <Box
          marginTop={1}
          paddingX={1}
          borderStyle="single"
          borderColor="gray"
        >
          <Text color="cyan">{action}</Text>
        </Box>
      )}
    </Box>
  );
}

export default EmptyState;
