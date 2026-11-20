import React from 'react';
import { formatDate } from '../../lib/format';

export default function Timeline({
  events = [],
  className = '',
}) {
  if (!events || events.length === 0) {
    return <p className="text-14 text-text-muted py-2">No recorded timeline events.</p>;
  }

  return (
    <div className={`relative pl-4 space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border ${className}`}>
      {events.map((evt, idx) => (
        <div key={evt.id || idx} className="relative flex items-start gap-3">
          <div
            className="absolute -left-4 mt-1.5 w-2.5 h-2.5 rounded-full border-2 border-surface bg-primary"
            aria-hidden="true"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-14 font-medium text-text">{evt.title}</span>
              <span className="text-12 text-text-muted tabular-nums">
                {formatDate(evt.timestamp || evt.changed_at || evt.created_at)}
              </span>
            </div>
            {evt.description && (
              <p className="text-14 text-text-muted mt-0.5 whitespace-pre-wrap">{evt.description}</p>
            )}
            {evt.actor && (
              <p className="text-12 text-text-muted/80 mt-1">By: {evt.actor}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
