import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TeamPresence, TeamMember } from './TeamPresence';
import { ActivityFeed, ActivityItem } from './ActivityFeed';
import { EnvironmentBadge, Environment } from './EnvironmentBadge';
import { Skeleton } from '../ui/Skeleton';

export interface TeamPanelProps {
  members: TeamMember[];
  activities: ActivityItem[];
  environment?: Environment;
  mode?: 'local' | 'vps';
  loading?: boolean;
  connected?: boolean;
  collapsible?: boolean;
  className?: string;
}

export function TeamPanel({
  members,
  activities,
  environment = 'local',
  mode = 'vps',
  loading = false,
  connected = true,
  collapsible = false,
  className = '',
}: TeamPanelProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'activity'>('team');
  const [collapsed, setCollapsed] = useState(false);

  if (mode === 'local') {
    return null;
  }

  if (loading) {
    return (
      <div
        data-testid="team-panel"
        className={`bg-surface border border-border rounded-lg p-4 ${className}`}
      >
        <div data-testid="loading-skeleton">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="team-panel"
      className={`bg-surface border border-border rounded-lg ${collapsed ? 'collapsed' : ''} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Team</h3>
          <span
            data-testid="member-count"
            className="text-xs bg-muted px-1.5 py-0.5 rounded-full"
          >
            {members.length}
          </span>
          {environment !== 'local' && (
            <EnvironmentBadge environment={environment} size="sm" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="connection-status"
            className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-error'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
          {collapsible && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand team panel' : 'Collapse team panel'}
              className="p-1 hover:bg-muted rounded"
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-border" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'team'}
              onClick={() => setActiveTab('team')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'team'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Team
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Activity
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            {activeTab === 'team' ? (
              <TeamPresence members={members} mode="vps" />
            ) : (
              <ActivityFeed activities={activities} mode="vps" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
