import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select(
  {
    label,
    id,
    name,
    value,
    defaultValue,
    onChange,
    onBlur,
    options = [],
    placeholder,
    error,
    hint,
    required = false,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const selectId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
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
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={`w-full h-9 bg-surface border text-14 text-text appearance-none pl-3 pr-8 rounded-[6px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed ${
            error ? 'border-danger focus-visible:outline-danger' : 'border-border-strong hover:border-text-muted'
          }`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-2.5 pointer-events-none text-text-muted"
          aria-hidden="true"
        />
      </div>

      {error && (
        <p id={`${selectId}-error`} className="text-12 text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
