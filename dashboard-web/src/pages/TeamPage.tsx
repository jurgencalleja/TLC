import { useEffect, useState, useCallback } from 'react';
import { TeamPanel } from '../components/team/TeamPanel';
import { useUIStore } from '../stores';
import { useWebSocketStore } from '../stores/websocket.store';
import { api } from '../api';
import { Skeleton } from '../components/ui/Skeleton';
import type { TeamMember } from '../components/team/TeamPresence';
import type { ActivityItem } from '../components/team/ActivityFeed';

export function TeamPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const wsStatus = useWebSocketStore((state) => state.status);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      // Get activity from changelog
      const changelog = await api.project.getChangelog();
      const commits = (changelog || []).slice(0, 20);

      // Extract unique authors from git changelog (real data, not fabricated)
      const authorMap = new Map<string, { name: string; lastSeen: string }>();
      for (const commit of commits) {
        if (commit.author && !authorMap.has(commit.author)) {
          authorMap.set(commit.author, {
            name: commit.author,
            lastSeen: commit.time || new Date().toISOString(),
          });
        }
      }

      if (authorMap.size > 0) {
        const teamMembers: TeamMember[] = Array.from(authorMap.entries()).map(
          ([, info], index) => ({
            id: `author-${index}`,
            name: info.name,
            email: '',
            status: (index === 0 && wsStatus === 'connected' ? 'online' : 'offline') as TeamMember['status'],
            lastSeen: info.lastSeen,
          })
        );
        setMembers(teamMembers);
      } else {
        setMembers([]);
      }

      const items: ActivityItem[] = commits.slice(0, 10).map((commit: { hash?: string; message?: string; time?: string; author?: string }, i: number) => ({
        id: commit.hash || String(i),
        type: 'commit' as const,
        user: commit.author || 'Unknown',
        message: commit.message || '',
        timestamp: commit.time || new Date().toISOString(),
      }));
      setActivities(items);
    } catch {
      setMembers([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [wsStatus]);

  useEffect(() => {
    setActiveView('team');
    fetchTeamData();
  }, [setActiveView, fetchTeamData]);

  if (loading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Team</h1>
          <p className="text-text-secondary mt-1">Team presence and activity</p>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Team</h1>
        <p className="text-text-secondary mt-1">Team presence and activity</p>
      </div>

      <TeamPanel
        members={members}
        activities={activities}
        mode="vps"
        connected={wsStatus === 'connected'}
      />
    </div>
  );
}
