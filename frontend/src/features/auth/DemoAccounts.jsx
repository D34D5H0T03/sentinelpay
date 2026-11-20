import React from 'react';

const DEMO_USERS = [
  { role: 'Customer', phone: '01711111111', label: 'Customer (Kabir)' },
  { role: 'Agent', phone: '01733333333', label: 'Agent (Anisur)' },
  { role: 'Analyst', phone: '01700000001', label: 'Fraud Analyst (Farhana)' },
  { role: 'Admin', phone: '01700000000', label: 'Admin (Tariqul)' },
  { role: 'Auditor', phone: '01788888888', label: 'Auditor (Zahidul)' },
];

export default function DemoAccounts({ onSelect }) {
  return (
    <div className="pt-4 mt-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-12 font-medium text-text-muted uppercase tracking-wider">
          Demo accounts
        </span>
        <span className="text-12 text-text-muted">Click to fill</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DEMO_USERS.map((demo) => (
          <button
            key={demo.phone}
            type="button"
            onClick={() => onSelect(demo.phone, 'demo1234')}
            className="text-left px-2.5 py-1.5 rounded-[6px] border border-border bg-surface-subtle hover:bg-surface hover:border-border-strong text-12 transition-colors flex items-center justify-between"
          >
            <span className="font-medium text-text">{demo.role}</span>
            <span className="text-text-muted font-mono">{demo.phone}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
