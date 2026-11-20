import { toPaisa } from './money';

export function isValidPhone(phone) {
  if (!phone) return false;
  return /^01[3-9]\d{8}$/.test(String(phone).trim());
}

export function isValidAmount(amount) {
  if (!amount) return false;
  const str = String(amount).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return false;
  return toPaisa(str) > 0;
}

export function validateRequired(value, label = 'This field') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} is required.`;
  }
  return null;
}
