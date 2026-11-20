export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  FRAUD_ANALYST: 'FRAUD_ANALYST',
  ADMIN: 'ADMIN',
  AUDITOR: 'AUDITOR',
};

export const ROLE_LABELS = {
  CUSTOMER: 'Customer',
  AGENT: 'Agent',
  FRAUD_ANALYST: 'Fraud Analyst',
  ADMIN: 'Administrator',
  AUDITOR: 'Auditor',
};

export const ROLE_HOME = {
  CUSTOMER: '/dashboard',
  AGENT: '/agent',
  FRAUD_ANALYST: '/fraud/alerts',
  ADMIN: '/admin',
  AUDITOR: '/admin/ledger',
};

export const TRANSACTION_STATUSES = {
  INITIATED: 'INITIATED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
};

export const WALLET_STATUSES = {
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  CLOSED: 'CLOSED',
};

export const KYC_STATUSES = {
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
};

export const RISK_SEVERITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const ALERT_STATUSES = {
  OPEN: 'OPEN',
  IN_CASE: 'IN_CASE',
  DISMISSED: 'DISMISSED',
  CONFIRMED: 'CONFIRMED',
};

export const CASE_STATUSES = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  CLOSED: 'CLOSED',
};

export const CASE_OUTCOMES = {
  CONFIRMED_FRAUD: 'CONFIRMED_FRAUD',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  INCONCLUSIVE: 'INCONCLUSIVE',
};

export const CASE_OUTCOME_LABELS = {
  CONFIRMED_FRAUD: 'Confirmed fraud',
  FALSE_POSITIVE: 'False positive',
  INCONCLUSIVE: 'Inconclusive',
};

export const TRANSACTION_TYPES = {
  SEND_MONEY: 'SEND_MONEY',
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT',
  FLOAT_LOAD: 'FLOAT_LOAD',
  REVERSAL: 'REVERSAL',
};

export const TRANSACTION_TYPE_LABELS = {
  SEND_MONEY: 'Send money',
  CASH_IN: 'Cash in',
  CASH_OUT: 'Cash out',
  FLOAT_LOAD: 'Float load',
  REVERSAL: 'Reversal',
};

export const RISK_RULES = {
  VELOCITY: 'VELOCITY',
  STRUCTURING: 'STRUCTURING',
  RAPID_IN_OUT: 'RAPID_IN_OUT',
};

export const RISK_RULE_LABELS = {
  VELOCITY: 'Velocity check',
  STRUCTURING: 'Structuring check',
  RAPID_IN_OUT: 'Rapid in-out flow',
};

export const LIMIT_TYPES = {
  PER_TXN: 'PER_TXN',
  DAILY: 'DAILY',
  MONTHLY: 'MONTHLY',
};

export const LIMIT_TYPE_LABELS = {
  PER_TXN: 'Per transaction',
  DAILY: 'Daily',
  MONTHLY: 'Monthly',
};
