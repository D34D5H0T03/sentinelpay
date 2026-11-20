import React, { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  {
    label,
    id,
    name,
    value,
    defaultValue,
    onChange,
    onBlur,
    placeholder,
    rows = 3,
    error,
    hint,
    required = false,
    disabled = false,
    className = '',
    ...props
  },
  ref
) {
  const textareaId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-12 font-medium text-text flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
          </span>
          {hint && <span className="text-text-muted font-normal">{hint}</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={`w-full p-2.5 bg-surface border text-14 text-text placeholder:text-text-muted/60 rounded-[6px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed ${
          error ? 'border-danger focus-visible:outline-danger' : 'border-border-strong hover:border-text-muted'
        }`}
        {...props}
      />

      {error && (
        <p id={`${textareaId}-error`} className="text-12 text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
});

export default Textarea;
