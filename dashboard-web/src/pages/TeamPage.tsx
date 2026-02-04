import { useEffect } from 'react';
import { TeamPanel } from '../components/team/TeamPanel';
import { useUIStore } from '../stores';

export function TeamPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('team');
  }, [setActiveView]);

  return (
    <div className="h-full overflow-auto">
      <TeamPanel />
    </div>
  );
}
