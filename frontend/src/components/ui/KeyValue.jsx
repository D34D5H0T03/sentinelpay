import React from 'react';

export function KeyValueRow({
  label,
  value,
  action,
  mono = false,
  className = '',
}) {
  return (
    <div
      className={`py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 border-b border-border last:border-b-0 ${className}`}
    >
      <dt className="text-12 sm:text-14 font-medium text-text-muted shrink-0 sm:w-48">
        {label}
      </dt>
      <dd
        className={`text-14 text-text break-all sm:text-right flex-1 flex items-center justify-start sm:justify-end gap-2 ${
          mono ? 'font-mono' : ''
        }`}
      >
        <span>{value !== undefined && value !== null ? value : '—'}</span>
        {action && <span>{action}</span>}
      </dd>
    </div>
  );
}

export default function KeyValue({ children, className = '' }) {
  return (
    <dl className={`divide-y divide-border ${className}`}>
      {children}
    </dl>
  );
}
