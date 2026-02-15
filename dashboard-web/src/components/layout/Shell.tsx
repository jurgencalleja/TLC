import { forwardRef, useState, type HTMLAttributes } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '../../stores';

interface ShellProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Shell = forwardRef<HTMLDivElement, ShellProps>(
  ({ children, className = '', ...props }, ref) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const theme = useUIStore((s) => s.theme);
    const toggleTheme = useUIStore((s) => s.toggleTheme);

    const handleSidebarToggle = () => {
      setSidebarCollapsed(!sidebarCollapsed);
    };

    const handleMobileMenuToggle = () => {
      setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
      <div
        ref={ref}
        className={`flex h-screen bg-bg-primary ${className}`}
        {...props}
      >
        {/* Skip link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            data-testid="mobile-overlay"
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 md:hidden
            transform transition-transform duration-300
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          data-testid="mobile-sidebar"
        >
          <Sidebar onToggle={() => setMobileMenuOpen(false)} />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            theme={theme}
            onThemeToggle={toggleTheme}
            onMobileMenuToggle={handleMobileMenuToggle}
          />

          <main
            id="main-content"
            className="flex-1 overflow-auto bg-bg-primary"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    );
  }
);

Shell.displayName = 'Shell';
