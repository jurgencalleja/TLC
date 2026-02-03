import { useState } from 'react';
import { GitCommit, CheckCircle2, MessageSquare, Eye, User, Activity } from 'lucide-react';
import { Dropdown, DropdownItem } from '../ui/Dropdown';

export type ActivityType = 'commit' | 'task_claim' | 'task_complete' | 'comment' | 'review';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  user: string;
  message: string;
  timestamp: string;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  showFilters?: boolean;
  pageSize?: number;
  mode?: 'local' | 'vps';
  className?: string;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  commit: <GitCommit className="w-4 h-4" data-testid="icon-commit" />,
  task_claim: <User className="w-4 h-4" data-testid="icon-task_claim" />,
  task_complete: <CheckCircle2 className="w-4 h-4" data-testid="icon-task_complete" />,
  comment: <MessageSquare className="w-4 h-4" data-testid="icon-comment" />,
  review: <Eye className="w-4 h-4" data-testid="icon-review" />,
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (activityDate.getTime() === today.getTime()) return 'Today';
  if (activityDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
}

function groupByDate(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};

  activities.forEach((activity) => {
    const group = getDateGroup(activity.timestamp);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(activity);
  });

  return groups;
}

export function ActivityFeed({
  activities,
  showFilters = false,
  pageSize = 20,
  mode = 'vps',
  className = '',
}: ActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  if (mode === 'local') {
    return null;
  }

  const filteredActivities = activities.filter((activity) => {
    if (typeFilter && activity.type !== typeFilter) return false;
    if (userFilter && activity.user !== userFilter) return false;
    return true;
  });

  const visibleActivities = filteredActivities.slice(0, visibleCount);
  const groupedActivities = groupByDate(visibleActivities);
  const hasMore = filteredActivities.length > visibleCount;

  const uniqueUsers = [...new Set(activities.map((a) => a.user))];
  const userItems: DropdownItem[] = uniqueUsers.map((user) => ({
    id: user,
    label: user,
  }));

  if (activities.length === 0) {
    return (
      <div
        data-testid="activity-feed"
        className={`bg-surface border border-border rounded-lg p-4 ${className}`}
      >
        <div data-testid="empty-state" className="text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="activity-feed"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <button
            data-testid="filter-commit"
            onClick={() => setTypeFilter(typeFilter === 'commit' ? null : 'commit')}
            className={`px-2 py-1 text-xs rounded ${
              typeFilter === 'commit' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Commits
          </button>
          <button
            data-testid="filter-task_claim"
            onClick={() => setTypeFilter(typeFilter === 'task_claim' ? null : 'task_claim')}
            className={`px-2 py-1 text-xs rounded ${
              typeFilter === 'task_claim' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Claims
          </button>
          <div data-testid="filter-user">
            <Dropdown
              items={userItems}
              onSelect={(item) => setUserFilter(userFilter === item.id ? null : item.id)}
              trigger={<span className="text-xs">User</span>}
            />
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="p-3 space-y-4">
        {['Today', 'Yesterday', 'Earlier'].map((group) => {
          const groupActivities = groupedActivities[group];
          if (!groupActivities || groupActivities.length === 0) return null;

          return (
            <div key={group}>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                {group}
              </h4>
              <div className="space-y-2">
                {groupActivities.map((activity) => (
                  <div
                    key={activity.id}
                    data-testid="activity-item"
                    className="flex items-start gap-3"
                  >
                    <div className="text-muted-foreground mt-0.5">
                      {activityIcons[activity.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{activity.user}</span>
                        <span className="text-muted-foreground ml-1">{activity.message}</span>
                      </p>
                      <span
                        data-testid="activity-time"
                        className="text-xs text-muted-foreground"
                      >
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setVisibleCount((prev) => prev + pageSize)}
            className="w-full text-sm text-primary hover:underline"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
