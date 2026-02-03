import { forwardRef, type HTMLAttributes } from 'react';
import { Search, Sun, Moon, Menu, User } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  theme?: 'dark' | 'light';
  onThemeToggle?: () => void;
  onMobileMenuToggle?: () => void;
  onSearchClick?: () => void;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  (
    {
      title,
      breadcrumbs = [],
      theme = 'dark',
      onThemeToggle,
      onMobileMenuToggle,
      onSearchClick,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        data-testid="header"
        className={`
          h-14
          bg-bg-secondary
          border-b border-border
          flex items-center justify-between
          px-4
          ${className}
        `}
        {...props}
      >
        {/* Left: Mobile menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            aria-label="Open menu"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.length > 0 ? (
                breadcrumbs.map((crumb, index) => (
                  <li key={crumb.label} className="flex items-center gap-2">
                    {index > 0 && (
                      <span className="text-text-muted">/</span>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-text-secondary hover:text-text-primary"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-text-primary font-medium">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))
              ) : title ? (
                <li className="text-text-primary font-medium">{title}</li>
              ) : null}
            </ol>
          </nav>
        </div>

        {/* Right: Search + Theme + User */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            onClick={onSearchClick}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            aria-label="Search"
            data-testid="search-button"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* User menu */}
          <Button variant="ghost" className="p-2" aria-label="User menu">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
