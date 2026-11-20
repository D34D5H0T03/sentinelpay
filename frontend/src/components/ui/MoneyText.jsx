import React from 'react';
import { formatMoney } from '../../lib/format';

export default function MoneyText({
  amount,
  side, // 'CREDIT' | 'DEBIT' | undefined
  size = '14', // '12' | '14' | '15' | '20' | '28'
  weight = 'normal', // 'normal' | 'medium' | 'semibold'
  className = '',
}) {
  const isCredit = side === 'CREDIT';
  const isDebit = side === 'DEBIT';

  let colorClass = 'text-text';
  let prefix = '';

  if (isCredit) {
    colorClass = 'text-success';
    prefix = '+ ';
  } else if (isDebit) {
    colorClass = 'text-text'; // debits use normal text color with a -
    prefix = '- ';
  }

  const sizeClasses = {
    '12': 'text-12',
    '14': 'text-14',
    '15': 'text-15',
    '20': 'text-20 font-semibold',
    '28': 'text-28 font-semibold tracking-tight',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
  };

  const formatted = formatMoney(amount);

  return (
    <span
      className={`tabular-nums inline-block ${sizeClasses[size] || sizeClasses['14']} ${
        weightClasses[weight] || ''
      } ${colorClass} ${className}`}
    >
      {prefix}
      {formatted}
    </span>
  );
}
