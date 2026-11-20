import React from 'react';
import Button from './Button';
import { getErrorMessage } from '../../lib/errors';

export default function ErrorState({
  error,
  title = 'Could not load data',
  onRetry,
  className = '',
}) {
  const message = error ? getErrorMessage(error) : 'An error occurred while loading this view.';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border border-danger/30 rounded-[8px] ${className}`}
      role="alert"
    >
      <h3 className="text-15 font-semibold text-danger">{title}</h3>
      <p className="text-14 text-text-muted mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
