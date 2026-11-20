import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-[6px] border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-subtle transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary flex items-center justify-center shrink-0 ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={16} className="text-warning" aria-hidden="true" />
      ) : (
        <Moon size={16} className="text-text-muted" aria-hidden="true" />
      )}
    </button>
  );
}
