import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  loadingText,
  onClick,
  className = '',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-[6px] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:hover:bg-primary',
    secondary:
      'bg-surface border border-border-strong text-text hover:bg-surface-subtle active:bg-surface-subtle disabled:hover:bg-surface',
    danger:
      'bg-danger text-white hover:opacity-90 active:opacity-95 disabled:hover:opacity-100 disabled:hover:bg-danger',
    ghost:
      'text-text-muted hover:text-text hover:bg-surface-subtle active:bg-surface-subtle',
    link:
      'text-primary hover:underline p-0 h-auto font-normal',
  };

  const sizes = {
    sm: 'text-12 h-8 px-3 gap-1.5',
    md: 'text-14 h-9 px-4 gap-2',
    lg: 'text-15 h-10 px-5 gap-2',
  };

  const currentSize = variant === 'link' ? '' : sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${currentSize} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5"
            aria-hidden="true"
          />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
