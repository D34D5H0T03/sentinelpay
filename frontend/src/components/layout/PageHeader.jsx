import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel,
  action,
  className = '',
}) {
  return (
    <div className={`mb-6 pb-2 ${className}`}>
      {backTo && (
        <div className="mb-2">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-12 font-medium text-text-muted hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowLeft size={14} />
            <span>{backLabel || 'Back'}</span>
          </Link>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-20 font-semibold text-text">{title}</h1>
          {subtitle && (
            <p className="text-14 text-text-muted mt-1 leading-normal">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
      </div>
    </div>
  );
}
