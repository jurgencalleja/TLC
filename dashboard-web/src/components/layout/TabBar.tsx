import { NavLink, useLocation } from 'react-router-dom';

export interface Tab {
  id: string;
  label: string;
  path: string;
}

interface TabBarProps {
  tabs: Tab[];
  basePath: string;
}

export function TabBar({ tabs, basePath }: TabBarProps) {
  const location = useLocation();

  return (
    <nav
      data-testid="tab-bar"
      className="flex gap-1 px-6 py-2 border-b border-border bg-bg-secondary overflow-x-auto sticky top-0 z-10"
      role="tablist"
    >
      {tabs.map((tab) => {
        const fullPath = tab.path === '' ? basePath : `${basePath}/${tab.path}`;
        const isActive =
          tab.path === ''
            ? location.pathname === basePath || location.pathname === basePath + '/'
            : location.pathname.startsWith(fullPath);
        return (
          <NavLink
            key={tab.id}
            to={fullPath}
            role="tab"
            aria-selected={isActive}
            data-testid={`tab-${tab.id}`}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
