import React from 'react';

export default function Skeleton({
  variant = 'text', // 'text' | 'rect' | 'circle' | 'table'
  width,
  height,
  rows = 3,
  className = '',
}) {
  const baseClasses = 'bg-border/60 animate-pulse rounded-[4px]';

  if (variant === 'circle') {
    return (
      <div
        className={`${baseClasses} rounded-full ${className}`}
        style={{ width: width || 40, height: height || 40 }}
      />
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 p-4 bg-surface border border-border rounded-[8px] ${className}`}>
        <div className="h-4 bg-border/80 w-1/4 rounded-[4px] animate-pulse" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-8 bg-border/40 rounded-[4px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'rect') {
    return (
      <div
        className={`${baseClasses} ${className}`}
        style={{ width: width || '100%', height: height || 80 }}
      />
    );
  }

  // text lines
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} h-4 ${i === rows - 1 ? 'w-3/5' : 'w-full'}`}
          style={{ width: i === 0 && width ? width : undefined, height }}
        />
      ))}
    </div>
  );
}
