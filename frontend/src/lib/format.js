/**
 * Formatting utilities for SentinelPay.
 * Adheres to Bangladesh banking format standards (Taka currency sign, en-IN number grouping, Asia/Dhaka timezone).
 */

export function formatMoney(amountStr, options = {}) {
  if (amountStr === null || amountStr === undefined || amountStr === '') {
    return '৳ 0.00';
  }

  const str = String(amountStr).trim();
  const isNegative = str.startsWith('-');
  const clean = isNegative ? str.slice(1) : str;

  const parts = clean.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const fractionStr = (parts[1] || '00').padEnd(2, '0').slice(0, 2);

  // en-IN grouping (e.g. 1,20,000)
  const formattedWhole = new Intl.NumberFormat('en-IN').format(whole);
  const formattedAmount = `${formattedWhole}.${fractionStr}`;

  if (options.showSign) {
    if (isNegative) {
      return `- ৳ ${formattedAmount}`;
    }
    if (options.sign === '+') {
      return `+ ৳ ${formattedAmount}`;
    }
  }

  return isNegative ? `- ৳ ${formattedAmount}` : `৳ ${formattedAmount}`;
}

export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(date);

  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dhaka',
  }).format(date);

  return `${dayMonthYear}, ${time}`;
}

export function formatShortDate(dateInput) {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(date);
}

export function maskName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((word) => {
      if (word.length <= 2) return word + '***';
      return word.slice(0, 2) + '***';
    })
    .join(' ');
}
