import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Send,
  ArrowLeftRight,
  Users,
  User,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  FolderKanban,
  BarChart3,
  Store,
  Percent,
  BookOpen,
  ClipboardList,
  X,
} from 'lucide-react';
import { ROLES, ROLE_LABELS } from '../../lib/constants';

const NAV_ITEMS_BY_ROLE = {
  [ROLES.CUSTOMER]: [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Wallets', to: '/wallets', icon: Wallet },
    { label: 'Send money', to: '/send', icon: Send },
    { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
    { label: 'Beneficiaries', to: '/beneficiaries', icon: Users },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  [ROLES.AGENT]: [
    { label: 'Overview', to: '/agent', icon: LayoutDashboard },
    { label: 'Cash in', to: '/agent/cash-in', icon: ArrowDownRight },
    { label: 'Cash out', to: '/agent/cash-out', icon: ArrowUpRight },
    { label: 'History', to: '/agent/history', icon: ArrowLeftRight },
  ],
  [ROLES.FRAUD_ANALYST]: [
    { label: 'Alerts', to: '/fraud/alerts', icon: ShieldAlert },
    { label: 'Cases', to: '/fraud/cases', icon: FolderKanban },
    { label: 'Analytics', to: '/fraud/analytics', icon: BarChart3 },
  ],
  [ROLES.ADMIN]: [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Agents', to: '/admin/agents', icon: Store },
    { label: 'Wallets', to: '/admin/wallets', icon: Wallet },
    { label: 'Fees', to: '/admin/fees', icon: Percent },
    { label: 'Risk rules', to: '/admin/risk-rules', icon: ShieldAlert },
    { label: 'Transactions', to: '/admin/transactions', icon: ArrowLeftRight },
    { label: 'Ledger', to: '/admin/ledger', icon: BookOpen },
    { label: 'Audit log', to: '/admin/audit', icon: ClipboardList },
  ],
  [ROLES.AUDITOR]: [
    { label: 'Ledger', to: '/admin/ledger', icon: BookOpen },
    { label: 'Transactions', to: '/admin/transactions', icon: ArrowLeftRight },
    { label: 'Audit log', to: '/admin/audit', icon: ClipboardList },
  ],
};

export default function Sidebar({
  role,
  isOpen = false,
  onClose,
}) {
  const navItems = NAV_ITEMS_BY_ROLE[role] || [];
  const roleLabel = ROLE_LABELS[role] || role;

  const content = (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Brand & Role */}
      <div className="h-14 px-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-15 text-text tracking-tight">SentinelPay</span>
          <span className="text-12 px-1.5 py-0.5 rounded-[4px] bg-neutral-bg text-text-muted">
            {roleLabel}
          </span>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-1 text-text-muted hover:text-text rounded-[6px]"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              end={item.to === '/dashboard' || item.to === '/agent' || item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-14 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  isActive
                    ? 'bg-primary-subtle text-primary'
                    : 'text-text-muted hover:text-text hover:bg-surface-subtle'
                }`
              }
            >
              <Icon size={16} className="shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer simulation notice */}
      <div className="p-4 border-t border-border">
        <p className="text-12 text-text-muted/70 leading-normal">
          SentinelPay simulation mode
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-[240px] z-30">
        {content}
      </aside>

      {/* Mobile slide-over drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-[240px] shadow-modal z-50">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
