import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          let bgClass = 'bg-surface border-border text-text';
          let Icon = Info;
          let iconClass = 'text-info';

          if (toast.type === 'success') {
            bgClass = 'bg-surface border-success/30 text-text';
            Icon = CheckCircle2;
            iconClass = 'text-success';
          } else if (toast.type === 'error') {
            bgClass = 'bg-surface border-danger/30 text-text';
            Icon = AlertCircle;
            iconClass = 'text-danger';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-[6px] border shadow-dropdown ${bgClass} transition-all duration-150`}
              role="status"
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconClass}`} />
              <div className="flex-1 text-14 leading-tight">{toast.message}</div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-text-muted hover:text-text p-0.5 -mr-1 -mt-0.5 rounded-[4px] focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
