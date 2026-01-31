import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

export type MemberStatus = 'online' | 'away' | 'offline';

export interface TeamMember {
  id: string;
  name: string;
  status: MemberStatus;
  activity?: string;
  avatar?: string;
}

export interface TeamPresenceProps {
  members: TeamMember[];
  currentUserId?: string;
  compact?: boolean;
}

const statusIndicators: Record<MemberStatus, { icon: string; color: string }> = {
  online: { icon: '●', color: 'green' },
  away: { icon: '◐', color: 'yellow' },
  offline: { icon: '○', color: 'gray' },
};

const statusOrder: Record<MemberStatus, number> = {
  online: 0,
  away: 1,
  offline: 2,
};

export function TeamPresence({
  members,
  currentUserId,
  compact = false,
}: TeamPresenceProps) {
  // Sort members: online first, then away, then offline
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [members]);

  const onlineCount = members.filter((m) => m.status === 'online').length;

  // Empty state
  if (members.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Team</Text>
        <Box marginTop={1}>
          <Text dimColor>No team members (solo mode)</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Team </Text>
        <Text dimColor>
          ({onlineCount} online of {members.length})
        </Text>
      </Box>

      {/* Member list */}
      {sortedMembers.map((member) => {
        const { icon, color } = statusIndicators[member.status];
        const isCurrentUser = member.id === currentUserId;

        return (
          <Box
            key={member.id}
            marginBottom={compact ? 0 : 1}
            flexDirection={compact ? 'row' : 'column'}
          >
            {/* Main row */}
            <Box>
              {/* Status indicator */}
              <Text color={color as any}>{icon} </Text>

              {/* Avatar */}
              {member.avatar && (
                <Text color="magenta">[{member.avatar}] </Text>
              )}

              {/* Name */}
              <Text bold={isCurrentUser} color={isCurrentUser ? 'cyan' : 'white'}>
                {member.name}
              </Text>

              {/* Current user indicator */}
              {isCurrentUser && (
                <Text dimColor> (you)</Text>
              )}

              {/* Activity in compact mode */}
              {compact && member.activity && member.status !== 'offline' && (
                <Text dimColor> - {member.activity.slice(0, 30)}</Text>
              )}
            </Box>

            {/* Activity in expanded mode */}
            {!compact && member.activity && (
              <Box marginLeft={3}>
                <Text dimColor>{member.activity}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
