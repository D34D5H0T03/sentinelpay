import React from 'react';
import Button from './Button';

export default function FilterBar({
  children,
  onReset,
  className = '',
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-[8px] p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1">{children}</div>
      {onReset && (
        <div className="shrink-0">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}
