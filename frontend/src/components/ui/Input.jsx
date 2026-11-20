import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    value,
    defaultValue,
    onChange,
    onBlur,
    placeholder,
    error,
    hint,
    required = false,
    disabled = false,
    readOnly = false,
    className = '',
    prefix,
    suffix,
    ...props
  },
  ref
) {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-12 font-medium text-text flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
          </span>
          {hint && <span className="text-text-muted font-normal">{hint}</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 pointer-events-none text-text-muted text-14 select-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full h-9 bg-surface border text-14 text-text placeholder:text-text-muted/60 rounded-[6px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed ${
            prefix ? 'pl-8' : 'px-3'
          } ${suffix ? 'pr-8' : 'px-3'} ${
            error ? 'border-danger focus-visible:outline-danger' : 'border-border-strong hover:border-text-muted'
          }`}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 flex items-center text-text-muted text-14">
            {suffix}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-12 text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
