/**
 * Money utilities using integer paisa (1 Taka = 100 Paisa).
 * All persistent and API money values are string representations with 2 decimals (e.g. "1200.00").
 * Floating-point arithmetic is strictly avoided for money calculations.
 */

export function toPaisa(amountStr) {
  if (amountStr === null || amountStr === undefined || amountStr === '') {
    return 0;
  }
  const str = String(amountStr).trim();
  const isNegative = str.startsWith('-');
  const clean = isNegative ? str.slice(1) : str;

  const parts = clean.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const fractionStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  const fraction = parseInt(fractionStr, 10);

  const total = whole * 100 + fraction;
  return isNegative ? -total : total;
}

export function fromPaisa(paisa) {
  const isNegative = paisa < 0;
  const absPaisa = Math.abs(paisa);
  const whole = Math.floor(absPaisa / 100);
  const fraction = absPaisa % 100;
  const fractionStr = String(fraction).padStart(2, '0');
  const result = `${whole}.${fractionStr}`;
  return isNegative ? `-${result}` : result;
}

export function addMoney(a, b) {
  return fromPaisa(toPaisa(a) + toPaisa(b));
}

export function subtractMoney(a, b) {
  return fromPaisa(toPaisa(a) - toPaisa(b));
}

export function compareMoney(a, b) {
  return toPaisa(a) - toPaisa(b);
}

export function isGreaterThan(a, b) {
  return toPaisa(a) > toPaisa(b);
}

export function isLessThan(a, b) {
  return toPaisa(a) < toPaisa(b);
}

export function isPositive(a) {
  return toPaisa(a) > 0;
}

export function isZero(a) {
  return toPaisa(a) === 0;
}

/**
 * Calculates fee based on flat fee string and percentage number (e.g. 0.01850 for 1.85%).
 * Rounds to the nearest paisa.
 */
export function calculateFee(amountStr, flatFeeStr = '0.00', percentDecimal = 0) {
  const amountPaisa = toPaisa(amountStr);
  const flatPaisa = toPaisa(flatFeeStr);
  const variablePaisa = Math.round(amountPaisa * (Number(percentDecimal) || 0));
  return fromPaisa(flatPaisa + variablePaisa);
}
