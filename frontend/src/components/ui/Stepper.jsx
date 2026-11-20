import React from 'react';
import { Check } from 'lucide-react';

export default function Stepper({
  steps = [],
  currentStep = 0,
  className = '',
}) {
  return (
    <div className={`w-full py-3 ${className}`}>
      <ol className="flex items-center w-full">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <li
              key={step.title || idx}
              className={`flex items-center ${
                idx < steps.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-12 font-medium transition-colors ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : isCurrent
                      ? 'border-2 border-primary text-primary bg-surface'
                      : 'border border-border-strong text-text-muted bg-surface'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? <Check size={14} /> : idx + 1}
                </span>
                <span
                  className={`text-12 sm:text-14 font-medium ${
                    isCurrent
                      ? 'text-text'
                      : isCompleted
                      ? 'text-text-muted'
                      : 'text-text-muted/70'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 mx-3 sm:mx-4 h-px ${
                    idx < currentStep ? 'bg-primary' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
