import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../lib/constants';
import ThemeToggle from '../ui/ThemeToggle';

export default function Topbar({
  pageTitle,
  onOpenMobileMenu,
}) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const primaryRole = user?.roles?.[0] || 'CUSTOMER';
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole;

  return (
    <header className="sticky top-0 z-20 h-14 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 -ml-1 text-text-muted hover:text-text rounded-[6px] hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-15 font-semibold text-text md:hidden">SentinelPay</span>
      </div>

      {/* Right controls: Theme toggle button immediately left of account details */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* User profile dropdown menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-[6px] text-14 text-text hover:bg-surface-subtle transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-7 h-7 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-medium text-12">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-14 font-medium text-text leading-tight">{user?.name || user?.phone}</span>
              <span className="text-12 text-text-muted leading-tight">{roleLabel}</span>
            </div>
            <ChevronDown size={14} className="text-text-muted" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-1.5 w-52 bg-surface border border-border rounded-[6px] shadow-dropdown py-1 z-30 animate-fadeIn"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-border sm:hidden">
                <p className="text-14 font-medium text-text">{user?.name || user?.phone}</p>
                <p className="text-12 text-text-muted">{roleLabel}</p>
              </div>

              {primaryRole === 'CUSTOMER' && (
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-14 text-text hover:bg-surface-subtle transition-colors"
                  role="menuitem"
                >
                  <User size={16} className="text-text-muted" />
                  <span>Profile</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-14 text-danger hover:bg-surface-subtle transition-colors text-left"
                role="menuitem"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
