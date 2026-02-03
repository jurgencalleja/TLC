import { Users } from 'lucide-react';

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  avatar?: string;
  lastSeen?: string;
  statusMessage?: string;
}

export interface TeamPresenceProps {
  members: TeamMember[];
  mode?: 'local' | 'vps';
  compact?: boolean;
  className?: string;
}

const statusColors: Record<UserStatus, string> = {
  online: 'bg-success',
  offline: 'bg-muted',
  away: 'bg-warning',
  busy: 'bg-error',
};

const statusOrder: Record<UserStatus, number> = {
  online: 0,
  busy: 1,
  away: 2,
  offline: 3,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TeamPresence({
  members,
  mode = 'vps',
  compact = false,
  className = '',
}: TeamPresenceProps) {
  if (mode === 'local') {
    return null;
  }

  const sortedMembers = [...members].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  const onlineCount = members.filter((m) => m.status === 'online').length;

  if (members.length === 0) {
    return (
      <div
        data-testid="team-presence"
        className={`bg-surface border border-border rounded-lg p-4 ${className}`}
      >
        <div data-testid="empty-state" className="text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No team members</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="team-presence"
      className={`bg-surface border border-border rounded-lg ${compact ? 'compact p-2' : 'p-4'} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Team</h3>
        <span data-testid="online-count" className="text-sm text-muted-foreground">
          {onlineCount} online
        </span>
      </div>

      <div className={`space-y-${compact ? '1' : '2'}`}>
        {sortedMembers.map((member) => (
          <div
            key={member.id}
            data-testid="team-member"
            className="flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="relative">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {getInitials(member.name)}
                </div>
              )}
              <span
                data-testid={`status-${member.id}`}
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${statusColors[member.status]}`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.name}
              </p>
              {member.statusMessage ? (
                <p className="text-xs text-muted-foreground truncate">
                  {member.statusMessage}
                </p>
              ) : member.lastSeen && member.status !== 'online' ? (
                <p className="text-xs text-muted-foreground">{member.lastSeen}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
