import { Sun, Moon, Monitor } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  showLabel?: boolean;
  className?: string;
}

const themeLabels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeToggle({
  theme,
  onToggle,
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const getAriaLabel = () => {
    if (theme === 'dark') return 'Switch to light mode';
    if (theme === 'light') return 'Switch to dark mode';
    return 'Switch theme';
  };

  return (
    <button
      data-testid="theme-toggle"
      onClick={onToggle}
      aria-label={getAriaLabel()}
      className={`
        flex items-center gap-2 p-2 rounded-md
        hover:bg-muted transition-colors
        ${className}
      `}
    >
      {theme === 'dark' && <Sun data-testid="sun-icon" className="w-5 h-5" />}
      {theme === 'light' && <Moon data-testid="moon-icon" className="w-5 h-5" />}
      {theme === 'system' && <Monitor data-testid="system-icon" className="w-5 h-5" />}
      {showLabel && <span className="text-sm">{themeLabels[theme]}</span>}
    </button>
  );
}
