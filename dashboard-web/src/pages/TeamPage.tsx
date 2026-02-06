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
      // Get current user from project info (git user)
      const project = await api.project.getProject();
      const currentUser: TeamMember = {
        id: 'current',
        name: project.name ? `${project.name} Developer` : 'Developer',
        email: '',
        status: wsStatus === 'connected' ? 'online' : 'away',
      };
      setMembers([currentUser]);

      // Get activity from changelog
      const changelog = await api.project.getChangelog();
      const items: ActivityItem[] = (changelog || []).slice(0, 10).map((commit: { hash?: string; message?: string; time?: string; author?: string }, i: number) => ({
        id: commit.hash || String(i),
        type: 'commit' as const,
        user: commit.author || 'Developer',
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
