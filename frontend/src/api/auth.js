import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';

const SESSION_KEY = 'sentinelpay_mock_user_id';

export async function login(phone, password) {
  if (USE_MOCK) {
    await delay();
    const user = db.users.find((u) => u.phone === String(phone).trim());
    if (!user) {
      const err = new Error('Incorrect phone number or password.');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }
    if (user.status !== 'ACTIVE') {
      const err = new Error(`Account is ${user.status.toLowerCase()}. Please contact support.`);
      err.code = 'USER_NOT_ACTIVE';
      throw err;
    }
    localStorage.setItem(SESSION_KEY, String(user.user_id));
    return user;
  }
  return request('POST', '/auth/login', { phone, password });
}

export async function register(payload) {
  if (USE_MOCK) {
    await delay();
    const existing = db.users.find((u) => u.phone === String(payload.phone).trim());
    if (existing) {
      const err = new Error('An account with this phone number already exists.');
      err.code = 'PHONE_ALREADY_EXISTS';
      throw err;
    }

    const newUserId = db.users.length + 1;
    const now = new Date().toISOString();
    const newUser = {
      user_id: newUserId,
      phone: payload.phone,
      email: payload.email || null,
      name: payload.name,
      roles: ['CUSTOMER'],
      status: 'ACTIVE',
      date_of_birth: payload.date_of_birth,
      address: payload.address,
      kyc_status: 'UNVERIFIED',
      created_at: now,
      last_login_at: now,
    };
    db.users.push(newUser);

    // Auto-create customer wallet
    const newWalletId = db.wallets.length + 1;
    const newWallet = {
      wallet_id: newWalletId,
      user_id: newUserId,
      wallet_no: payload.phone,
      label: 'Main',
      status: 'ACTIVE',
      wallet_type: 'PERSONAL',
      opened_at: now,
    };
    db.wallets.push(newWallet);

    // Auto-create ledger account
    const newAcctId = db.ledgerAccounts.length + 1;
    db.ledgerAccounts.push({
      ledger_account_id: newAcctId,
      account_kind: 'WALLET',
      wallet_id: newWalletId,
      system_code: null,
      name: `Customer Wallet ${payload.phone} (Main)`,
      allow_negative: false,
    });

    // Default limits
    db.walletLimits.push(
      { wallet_id: newWalletId, limit_type: 'PER_TXN', max_amount: '25000.00', effective_from: now.slice(0, 10), effective_to: null },
      { wallet_id: newWalletId, limit_type: 'DAILY', max_amount: '50000.00', effective_from: now.slice(0, 10), effective_to: null },
      { wallet_id: newWalletId, limit_type: 'MONTHLY', max_amount: '200000.00', effective_from: now.slice(0, 10), effective_to: null }
    );

    return newUser;
  }
  return request('POST', '/auth/register', payload);
}

export async function logout() {
  if (USE_MOCK) {
    await delay(100);
    localStorage.removeItem(SESSION_KEY);
    return { success: true };
  }
  return request('POST', '/auth/logout');
}

export async function me() {
  if (USE_MOCK) {
    await delay(150);
    const storedId = localStorage.getItem(SESSION_KEY);
    if (!storedId) {
      return null;
    }
    const user = db.users.find((u) => u.user_id === Number(storedId));
    return user || null;
  }
  return request('GET', '/auth/me');
}
