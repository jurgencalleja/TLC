import { useEffect, useState } from 'react';
import { TeamPanel } from '../components/team/TeamPanel';
import { useUIStore } from '../stores';
import type { TeamMember } from '../components/team/TeamPresence';
import type { ActivityItem } from '../components/team/ActivityFeed';

// Mock data - will be replaced with API/WebSocket
const mockMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Alice',
    email: 'alice@example.com',
    status: 'online',
    statusMessage: 'Working on Phase 62',
  },
  {
    id: '2',
    name: 'Bob',
    email: 'bob@example.com',
    status: 'away',
    lastSeen: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: '3',
    name: 'Charlie',
    email: 'charlie@example.com',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'commit',
    user: 'Alice',
    message: 'feat(62): implement state management stores',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'task_complete',
    user: 'Alice',
    message: 'Completed: Implement Zustand stores',
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: '3',
    type: 'task_claim',
    user: 'Bob',
    message: 'Claimed: Fix TypeScript errors',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
  },
];

export function TeamPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [members] = useState<TeamMember[]>(mockMembers);
  const [activities] = useState<ActivityItem[]>(mockActivities);

  useEffect(() => {
    setActiveView('team');
  }, [setActiveView]);

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
        connected={true}
      />
    </div>
  );
}
