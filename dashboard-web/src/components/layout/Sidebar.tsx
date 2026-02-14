import { forwardRef, useMemo, type HTMLAttributes } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  TestTube,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';

interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ collapsed = false, onToggle, className = '', ...props }, ref) => {
    const pid = useWorkspaceStore((s) => s.selectedProjectId);
    const sidebarWidth = collapsed ? 'w-16' : 'w-60';

    const navItems: NavItem[] = useMemo(() => [
      { path: pid ? `/projects/${pid}` : '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { path: '/projects', label: 'Projects', icon: <FolderKanban className="h-5 w-5" /> },
      { path: pid ? `/projects/${pid}/tasks` : '/tasks', label: 'Tasks', icon: <CheckSquare className="h-5 w-5" /> },
      { path: pid ? `/projects/${pid}/test-suite` : '/test-suite', label: 'Tests', icon: <TestTube className="h-5 w-5" /> },
      { path: pid ? `/projects/${pid}/logs` : '/logs', label: 'Logs', icon: <ScrollText className="h-5 w-5" /> },
      { path: pid ? `/projects/${pid}/preview` : '/preview', label: 'Preview', icon: <Eye className="h-5 w-5" /> },
      { path: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    ], [pid]);

    return (
      <aside
        ref={ref}
        data-testid="sidebar"
        className={`
          ${sidebarWidth}
          h-screen
          bg-bg-secondary
          border-r border-border
          flex flex-col
          transition-all duration-300
          ${collapsed ? 'collapsed' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold">
              T
            </div>
            {!collapsed && (
              <span className="font-semibold text-text-primary">TLC</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors
                    ${
                      isActive
                        ? 'bg-accent text-white active'
                        : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                    }
                    ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-border">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';
