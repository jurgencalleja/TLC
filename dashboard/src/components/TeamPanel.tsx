import React from 'react';
import { Box, Text, useInput } from 'ink';
import { TeamPresence, TeamMember } from './TeamPresence.js';
import { ActivityFeed, Activity } from './ActivityFeed.js';
import { Environment } from './EnvironmentBadge.js';

export interface TeamPanelProps {
  members: TeamMember[];
  activities: Activity[];
  environment: Environment;
  currentUserId?: string;
  connected?: boolean;
  activityLimit?: number;
  isActive?: boolean;
  onRefresh?: () => void;
  onReconnect?: () => void;
}

export function TeamPanel({
  members,
  activities,
  environment,
  currentUserId,
  connected = true,
  activityLimit = 10,
  isActive = true,
  onRefresh,
  onReconnect,
}: TeamPanelProps) {
  useInput(
    (input) => {
      if (!isActive) return;

      if (input === 'r') {
        if (!connected && onReconnect) {
          onReconnect();
        } else if (onRefresh) {
          onRefresh();
        }
      }
    },
    { isActive }
  );

  // Local mode - show minimal view
  if (environment === 'local') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>Team </Text>
          <Text color="green">[local]</Text>
        </Box>
        <Box>
          <Text dimColor>Solo mode - team features available on VPS</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:deploy for team collaboration</Text>
        </Box>
      </Box>
    );
  }

  const onlineCount = members.filter((m) => m.status === 'online').length;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Team </Text>
        <Text color="cyan">[{environment}]</Text>

        {/* Connection status */}
        {connected ? (
          <Text color="green"> ● connected</Text>
        ) : (
          <Text color="red"> ○ disconnected</Text>
        )}
      </Box>

      {/* Disconnected warning */}
      {!connected && (
        <Box
          marginBottom={1}
          borderStyle="single"
          borderColor="red"
          paddingX={1}
        >
          <Text color="red">Connection lost - press r to reconnect</Text>
        </Box>
      )}

      {/* Team Presence */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
      >
        {members.length === 0 ? (
          <Box flexDirection="column">
            <Text bold>Team Members</Text>
            <Text dimColor>No team members online (solo mode)</Text>
          </Box>
        ) : (
          <TeamPresence
            members={members}
            currentUserId={currentUserId}
            compact={true}
          />
        )}
      </Box>

      {/* Activity Feed */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
      >
        {activities.length === 0 ? (
          <Box flexDirection="column">
            <Text bold>Activity</Text>
            <Text dimColor>No activity yet - it's quiet here</Text>
          </Box>
        ) : (
          <ActivityFeed
            activities={activities}
            limit={activityLimit}
            compact={true}
          />
        )}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>
          r {connected ? 'refresh' : 'reconnect'}
        </Text>
      </Box>
    </Box>
  );
}
