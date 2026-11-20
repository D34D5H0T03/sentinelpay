import React from 'react';

const STATUS_CONFIGS = {
  // Transaction
  INITIATED: { label: 'Initiated', tone: 'neutral' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REVERSED: { label: 'Reversed', tone: 'neutral' },

  // Wallet
  ACTIVE: { label: 'Active', tone: 'success' },
  FROZEN: { label: 'Frozen', tone: 'danger' },
  CLOSED: { label: 'Closed', tone: 'neutral' },

  // KYC
  UNVERIFIED: { label: 'Unverified', tone: 'warning' },
  VERIFIED: { label: 'Verified', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },

  // Risk Severity
  LOW: { label: 'Low', tone: 'neutral' },
  MEDIUM: { label: 'Medium', tone: 'warning' },
  HIGH: { label: 'High', tone: 'danger' },

  // Alert
  OPEN: { label: 'Open', tone: 'warning' },
  IN_CASE: { label: 'In case', tone: 'info' },
  DISMISSED: { label: 'Dismissed', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmed', tone: 'danger' },

  // Case
  INVESTIGATING: { label: 'Investigating', tone: 'info' },

  // User
  LOCKED: { label: 'Locked', tone: 'danger' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },

  // General fallback
  BALANCED: { label: 'Balanced', tone: 'success' },
  UNBALANCED: { label: 'Unbalanced', tone: 'danger' },
};

const TONES = {
  success: {
    bg: 'bg-success-bg',
    text: 'text-success',
    dot: 'bg-success',
  },
  warning: {
    bg: 'bg-warning-bg',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  danger: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    dot: 'bg-danger',
  },
  info: {
    bg: 'bg-info-bg',
    text: 'text-info',
    dot: 'bg-info',
  },
  neutral: {
    bg: 'bg-neutral-bg',
    text: 'text-neutral',
    dot: 'bg-neutral',
  },
};

export default function StatusBadge({ status, label, tone, className = '' }) {
  const normalizedKey = status ? String(status).toUpperCase() : '';
  const defaultConfig = STATUS_CONFIGS[normalizedKey] || {
    label: label || status || 'Unknown',
    tone: tone || 'neutral',
  };

  const finalTone = tone || defaultConfig.tone;
  const currentTone = TONES[finalTone] || TONES.neutral;
  const displayLabel = label || defaultConfig.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-12 font-medium leading-none ${currentTone.bg} ${currentTone.text} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${currentTone.dot}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}
