import React from 'react';
import Button from './Button';

export default function EmptyState({
  title = 'No records found',
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border border-dashed border-border rounded-[8px] ${className}`}
    >
      <h3 className="text-15 font-semibold text-text">{title}</h3>
      {description && (
        <p className="text-14 text-text-muted mt-1 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
