import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

export type ActivityType = 'commit' | 'claim' | 'complete' | 'review' | 'comment' | 'release';

export interface Activity {
  id: string;
  type: ActivityType;
  user: string;
  message: string;
  timestamp: string;
  ref?: string;
}

export interface ActivityFeedProps {
  activities: Activity[];
  filterUser?: string;
  filterType?: ActivityType;
  limit?: number;
  compact?: boolean;
}

const typeIcons: Record<ActivityType, { icon: string; color: string }> = {
  commit: { icon: '⊕', color: 'green' },
  claim: { icon: '◉', color: 'cyan' },
  complete: { icon: '✓', color: 'green' },
  review: { icon: '⬡', color: 'magenta' },
  comment: { icon: '◇', color: 'yellow' },
  release: { icon: '○', color: 'gray' },
};

export function ActivityFeed({
  activities,
  filterUser,
  filterType,
  limit,
  compact = false,
}: ActivityFeedProps) {
  // Filter activities
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (filterUser) {
      result = result.filter((a) => a.user === filterUser);
    }

    if (filterType) {
      result = result.filter((a) => a.type === filterType);
    }

    return result;
  }, [activities, filterUser, filterType]);

  // Apply limit
  const displayActivities = limit
    ? filteredActivities.slice(0, limit)
    : filteredActivities;
  const hasMore = limit && filteredActivities.length > limit;
  const remainingCount = filteredActivities.length - (limit || 0);

  // Empty state
  if (activities.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Activity</Text>
        <Box marginTop={1}>
          <Text dimColor>No activity yet - it's quiet here</Text>
        </Box>
      </Box>
    );
  }

  // No matches
  if (filteredActivities.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>Activity</Text>
          {filterUser && <Text dimColor> - @{filterUser}</Text>}
          {filterType && <Text dimColor> - {filterType}</Text>}
        </Box>
        <Box>
          <Text dimColor>No matching activity</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Activity </Text>
        <Text dimColor>({filteredActivities.length})</Text>
        {filterUser && <Text color="cyan"> @{filterUser}</Text>}
        {filterType && <Text color="magenta"> [{filterType}]</Text>}
      </Box>

      {/* Activity list */}
      {displayActivities.map((activity) => {
        const { icon, color } = typeIcons[activity.type];

        return (
          <Box
            key={activity.id}
            marginBottom={compact ? 0 : 1}
            flexDirection={compact ? 'row' : 'column'}
          >
            {/* Main row */}
            <Box>
              {/* Type icon */}
              <Text color={color as any}>{icon} </Text>

              {/* User */}
              <Text color="cyan">@{activity.user}</Text>

              {/* Message (truncated in compact) */}
              <Text>
                {' '}{compact ? activity.message.slice(0, 40) : activity.message}
                {compact && activity.message.length > 40 && '...'}
              </Text>
            </Box>

            {/* Details row (expanded mode) */}
            {!compact && (
              <Box marginLeft={2}>
                <Text dimColor>{activity.timestamp}</Text>
                {activity.ref && (
                  <Text dimColor> • {activity.ref}</Text>
                )}
              </Box>
            )}

            {/* Timestamp inline (compact mode) */}
            {compact && (
              <Text dimColor> ({activity.timestamp})</Text>
            )}
          </Box>
        );
      })}

      {/* More indicator */}
      {hasMore && (
        <Box marginTop={1}>
          <Text dimColor>+{remainingCount} more activities...</Text>
        </Box>
      )}
    </Box>
  );
}
