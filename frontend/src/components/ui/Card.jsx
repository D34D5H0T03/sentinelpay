import React from 'react';

export default function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  padding = true,
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-[8px] overflow-hidden ${className}`}
    >
      {(title || action || subtitle) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-15 font-semibold text-text">{title}</h2>}
            {subtitle && <p className="text-12 text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
