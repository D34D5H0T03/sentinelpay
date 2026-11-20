import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';
import { me } from './auth';
import { maskName } from '../lib/format';

export async function listWallets() {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) return [];

    const userWallets = db.wallets.filter((w) => w.user_id === currentUser.user_id);
    return userWallets.map((w) => ({
      ...w,
      balance: db.getWalletBalance(w.wallet_id),
    }));
  }
  return request('GET', '/wallets');
}

export async function getWallet(id) {
  if (USE_MOCK) {
    await delay();
    const walletId = Number(id);
    const wallet = db.wallets.find((w) => w.wallet_id === walletId);
    if (!wallet) {
      const err = new Error('Wallet not found');
      err.code = 'WALLET_NOT_FOUND';
      throw err;
    }
    const balance = db.getWalletBalance(walletId);
    const limits = db.getWalletLimits(walletId);
    const user = db.users.find((u) => u.user_id === wallet.user_id);

    return {
      ...wallet,
      balance,
      limits,
      holder: user ? { name: user.name, phone: user.phone, kyc_status: user.kyc_status } : null,
    };
  }
  return request('GET', `/wallets/${id}`);
}

export async function getStatement(id, filters = {}) {
  if (USE_MOCK) {
    await delay();
    return db.getStatement(Number(id), filters);
  }
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page) params.set('page', filters.page);
  if (filters.pageSize) params.set('pageSize', filters.pageSize);
  return request('GET', `/wallets/${id}/statement?${params.toString()}`);
}

export async function lookupWallet(walletNo) {
  if (USE_MOCK) {
    await delay(200);
    const cleanNo = String(walletNo).trim();
    const wallet = db.wallets.find((w) => w.wallet_no === cleanNo);
    if (!wallet) {
      const err = new Error('Recipient wallet not found.');
      err.code = 'DESTINATION_NOT_FOUND';
      throw err;
    }
    const user = db.users.find((u) => u.user_id === wallet.user_id);
    const holderName = user ? user.name : 'Unknown';

    return {
      wallet_id: wallet.wallet_id,
      wallet_no: wallet.wallet_no,
      status: wallet.status,
      holder_name: holderName,
      masked_name: maskName(holderName),
    };
  }
  return request('GET', `/wallets/lookup?walletNo=${encodeURIComponent(walletNo)}`);
}

export async function openWallet({ label }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    const userWallets = db.wallets.filter((w) => w.user_id === currentUser.user_id);
    const newIndex = userWallets.length + 1;
    const walletNo = `${currentUser.phone}-${newIndex}`;

    const newWalletId = db.wallets.length + 1;
    const now = new Date().toISOString();
    const newWallet = {
      wallet_id: newWalletId,
      user_id: currentUser.user_id,
      wallet_no: walletNo,
      label: label || `Wallet ${newIndex}`,
      status: 'ACTIVE',
      wallet_type: 'PERSONAL',
      opened_at: now,
    };
    db.wallets.push(newWallet);

    const newAcctId = db.ledgerAccounts.length + 1;
    db.ledgerAccounts.push({
      ledger_account_id: newAcctId,
      account_kind: 'WALLET',
      wallet_id: newWalletId,
      system_code: null,
      name: `Customer Wallet ${walletNo} (${label || 'Secondary'})`,
      allow_negative: false,
    });

    // Default limits
    db.walletLimits.push(
      { wallet_id: newWalletId, limit_type: 'PER_TXN', max_amount: '25000.00', effective_from: now.slice(0, 10), effective_to: null },
      { wallet_id: newWalletId, limit_type: 'DAILY', max_amount: '50000.00', effective_from: now.slice(0, 10), effective_to: null },
      { wallet_id: newWalletId, limit_type: 'MONTHLY', max_amount: '200000.00', effective_from: now.slice(0, 10), effective_to: null }
    );

    return {
      ...newWallet,
      balance: '0.00',
    };
  }
  return request('POST', '/wallets/open', { label });
}
