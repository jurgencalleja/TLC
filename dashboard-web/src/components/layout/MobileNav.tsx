import { LayoutDashboard, CheckSquare, ScrollText, Settings } from 'lucide-react';

export type NavItem = 'dashboard' | 'tasks' | 'logs' | 'settings';

export interface MobileNavProps {
  activeItem?: NavItem;
  onNavigate?: (item: NavItem) => void;
  notifications?: Partial<Record<NavItem, number>>;
  className?: string;
}

const navItems: { id: NavItem; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileNav({
  activeItem = 'dashboard',
  onNavigate,
  notifications = {},
  className = '',
}: MobileNavProps) {
  const formatBadgeCount = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  return (
    <nav
      data-testid="mobile-nav"
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-surface border-t border-border
        pb-safe md:hidden
        ${className}
      `}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeItem === id;
          const notificationCount = notifications[id] || 0;

          return (
            <button
              key={id}
              onClick={() => onNavigate?.(id)}
              aria-label={label}
              className={`
                flex flex-col items-center justify-center
                w-full h-full
                transition-colors
                ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <div className="relative">
                <Icon
                  data-testid={`icon-${id}`}
                  className="w-6 h-6"
                />
                {notificationCount > 0 && (
                  <span
                    data-testid="notification-badge"
                    className="
                      absolute -top-1 -right-2
                      min-w-[18px] h-[18px]
                      flex items-center justify-center
                      text-xs font-medium
                      bg-error text-white
                      rounded-full px-1
                    "
                  >
                    {formatBadgeCount(notificationCount)}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
