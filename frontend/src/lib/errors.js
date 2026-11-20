export const ERROR_MESSAGES = {
  INSUFFICIENT_FUNDS: 'Not enough balance in this wallet. Add money or send a smaller amount.',
  PER_TRANSACTION_LIMIT_EXCEEDED: 'This amount exceeds the per-transaction limit for this wallet.',
  DAILY_LIMIT_EXCEEDED: 'This transfer exceeds the remaining daily limit for this wallet.',
  MONTHLY_LIMIT_EXCEEDED: 'This transfer exceeds the remaining monthly limit for this wallet.',
  SOURCE_WALLET_NOT_ACTIVE: 'The source wallet is not active.',
  DESTINATION_WALLET_NOT_ACTIVE: 'The recipient wallet is not active.',
  DESTINATION_NOT_FOUND: 'Recipient wallet not found. Check the wallet number and try again.',
  SOURCE_AND_DESTINATION_ARE_THE_SAME: 'Source and destination wallets must be different.',
  INVALID_AMOUNT: 'Enter a valid amount greater than zero.',
  SOURCE_NOT_FOUND: 'Source wallet or account could not be found.',
  UNKNOWN_TRANSACTION_TYPE: 'Unsupported transaction type.',
  UNAUTHORIZED: 'You must be signed in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  USER_NOT_FOUND: 'No user found with the provided credentials.',
  INVALID_CREDENTIALS: 'Incorrect phone number or password.',
  PHONE_ALREADY_EXISTS: 'An account with this phone number already exists.',
  WALLET_ALREADY_EXISTS: 'A wallet with this identifier already exists.',
  TRANSACTION_ALREADY_REVERSED: 'This transaction has already been reversed.',
  CASE_ALREADY_CLOSED: 'This case has already been closed.',
};

export function getErrorMessage(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';
  if (typeof err === 'string') {
    return ERROR_MESSAGES[err] || err;
  }
  if (err.code && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }
  return err.message || 'An unexpected error occurred. Please try again.';
}
