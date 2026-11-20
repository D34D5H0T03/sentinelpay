import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';
import { me } from './auth';
import {
  toPaisa,
  fromPaisa,
  addMoney,
  subtractMoney,
  compareMoney,
  calculateFee,
} from '../lib/money';

export async function dashboard() {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    // Find agent's float wallet
    const floatWallet = db.wallets.find(
      (w) => w.user_id === currentUser.user_id && w.wallet_type === 'AGENT_FLOAT'
    );
    if (!floatWallet) {
      throw new Error('No agent float wallet assigned to this account.');
    }

    const floatBalance = db.getWalletBalance(floatWallet.wallet_id);

    // Today's metrics
    const today = new Date().toISOString().slice(0, 10);
    const floatAcct = db.getAccountForWallet(floatWallet.wallet_id);

    let cashInPaisa = 0;
    let cashOutPaisa = 0;
    let todayTxnCount = 0;

    const agentTxns = [];

    db.transactions.forEach((txn) => {
      const detail = db.transferDetails.find((d) => d.transaction_id === txn.transaction_id);
      if (!detail) return;

      const isFloatSource = detail.source_account_id === floatAcct?.ledger_account_id;
      const isFloatDest = detail.destination_account_id === floatAcct?.ledger_account_id;

      if (isFloatSource || isFloatDest) {
        agentTxns.push({
          ...txn,
          source_ref: detail.source_ref,
          dest_ref: detail.dest_ref,
          note: detail.note,
        });

        const txDate = (txn.completed_at || txn.created_at || '').slice(0, 10);
        if (txDate === today && txn.status === 'COMPLETED') {
          todayTxnCount++;
          if (txn.type_code === 'CASH_IN') {
            cashInPaisa += toPaisa(txn.amount);
          } else if (txn.type_code === 'CASH_OUT') {
            cashOutPaisa += toPaisa(txn.amount);
          }
        }
      }
    });

    agentTxns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      float_wallet: floatWallet,
      float_balance: floatBalance,
      today_cash_in: fromPaisa(cashInPaisa),
      today_cash_out: fromPaisa(cashOutPaisa),
      today_txn_count: todayTxnCount,
      recent_transactions: agentTxns.slice(0, 5),
    };
  }
  return request('GET', '/agent/dashboard');
}

export async function lookupCustomer(phone) {
  if (USE_MOCK) {
    await delay(200);
    const cleanPhone = String(phone).trim();
    const user = db.users.find((u) => u.phone === cleanPhone && u.roles.includes('CUSTOMER'));
    if (!user) {
      const err = new Error('Customer account not found for this phone number.');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const wallet = db.wallets.find((w) => w.user_id === user.user_id && w.label === 'Main') ||
                   db.wallets.find((w) => w.user_id === user.user_id);

    return {
      user_id: user.user_id,
      phone: user.phone,
      name: user.name,
      kyc_status: user.kyc_status,
      wallet_no: wallet ? wallet.wallet_no : user.phone,
      wallet_status: wallet ? wallet.status : 'ACTIVE',
      wallet_id: wallet?.wallet_id,
      balance: wallet ? db.getWalletBalance(wallet.wallet_id) : '0.00',
    };
  }
  return request('GET', `/agent/customer-lookup?phone=${encodeURIComponent(phone)}`);
}

export async function cashIn({ phone, amount, idempotencyKey }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    const floatWallet = db.wallets.find(
      (w) => w.user_id === currentUser.user_id && w.wallet_type === 'AGENT_FLOAT'
    );
    if (!floatWallet) throw new Error('Agent float wallet not found.');

    const cust = await lookupCustomer(phone);
    if (cust.wallet_status !== 'ACTIVE') {
      const err = new Error('Customer wallet is not active.');
      err.code = 'DESTINATION_WALLET_NOT_ACTIVE';
      throw err;
    }

    // Cash-in has no fee
    const fee = '0.00';
    const floatBalance = db.getWalletBalance(floatWallet.wallet_id);

    if (compareMoney(floatBalance, amount) < 0) {
      db.recordFailedTransaction({
        typeCode: 'CASH_IN',
        userId: currentUser.user_id,
        sourceRef: floatWallet.wallet_no,
        destRef: cust.wallet_no,
        amount,
        fee,
        failureReason: 'INSUFFICIENT_FUNDS',
        note: `Cash in for ${cust.name}`,
      });
      const err = new Error('Insufficient float balance in your agent wallet.');
      err.code = 'INSUFFICIENT_FUNDS';
      throw err;
    }

    const txn = db.postTransferInternal({
      typeCode: 'CASH_IN',
      userId: currentUser.user_id,
      sourceRef: floatWallet.wallet_no,
      destRef: cust.wallet_no,
      amount,
      fee,
      note: `Cash in for ${cust.name} (${phone})`,
    });

    const newFloatBalance = db.getWalletBalance(floatWallet.wallet_id);

    return {
      ...txn,
      float_after: newFloatBalance,
      customer_name: cust.name,
      customer_phone: cust.phone,
    };
  }
  return request('POST', '/agent/cash-in', { phone, amount, idempotencyKey });
}

export async function cashOut({ phone, amount, idempotencyKey }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    const floatWallet = db.wallets.find(
      (w) => w.user_id === currentUser.user_id && w.wallet_type === 'AGENT_FLOAT'
    );
    if (!floatWallet) throw new Error('Agent float wallet not found.');

    const cust = await lookupCustomer(phone);
    if (cust.wallet_status !== 'ACTIVE') {
      const err = new Error('Customer wallet is not active.');
      err.code = 'SOURCE_WALLET_NOT_ACTIVE';
      throw err;
    }

    // Cash out fee: 1.85%
    const feeRule = db.feeRules.find((r) => r.type_code === 'CASH_OUT');
    const fee = calculateFee(amount, feeRule?.fee_flat || '0.00', feeRule?.fee_percent || 0.01850);
    const totalDebit = addMoney(amount, fee);

    const custBalance = db.getWalletBalance(cust.wallet_id);
    if (compareMoney(custBalance, totalDebit) < 0) {
      db.recordFailedTransaction({
        typeCode: 'CASH_OUT',
        userId: currentUser.user_id,
        sourceRef: cust.wallet_no,
        destRef: floatWallet.wallet_no,
        amount,
        fee,
        failureReason: 'INSUFFICIENT_FUNDS',
        note: `Cash out from ${cust.name}`,
      });
      const err = new Error('Customer has insufficient funds to complete this cash-out.');
      err.code = 'INSUFFICIENT_FUNDS';
      throw err;
    }

    const txn = db.postTransferInternal({
      typeCode: 'CASH_OUT',
      userId: currentUser.user_id,
      sourceRef: cust.wallet_no,
      destRef: floatWallet.wallet_no,
      amount,
      fee,
      note: `Cash out from ${cust.name} (${phone})`,
    });

    const newFloatBalance = db.getWalletBalance(floatWallet.wallet_id);

    return {
      ...txn,
      float_after: newFloatBalance,
      customer_name: cust.name,
      customer_phone: cust.phone,
    };
  }
  return request('POST', '/agent/cash-out', { phone, amount, idempotencyKey });
}

export async function history(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    const floatWallet = db.wallets.find(
      (w) => w.user_id === currentUser.user_id && w.wallet_type === 'AGENT_FLOAT'
    );
    if (!floatWallet) return { items: [], page: 1, pageSize: 10, total: 0 };

    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    const floatAcct = db.getAccountForWallet(floatWallet.wallet_id);

    let txns = [];
    db.transactions.forEach((txn) => {
      const detail = db.transferDetails.find((d) => d.transaction_id === txn.transaction_id);
      if (!detail) return;
      if (
        detail.source_account_id === floatAcct?.ledger_account_id ||
        detail.destination_account_id === floatAcct?.ledger_account_id
      ) {
        txns.push({
          ...txn,
          source_ref: detail.source_ref,
          dest_ref: detail.dest_ref,
          note: detail.note,
        });
      }
    });

    if (filters.type) {
      txns = txns.filter((t) => t.type_code === filters.type);
    }
    if (filters.status) {
      txns = txns.filter((t) => t.status === filters.status);
    }
    if (filters.from) {
      txns = txns.filter((t) => (t.completed_at || t.created_at).slice(0, 10) >= filters.from);
    }
    if (filters.to) {
      txns = txns.filter((t) => (t.completed_at || t.created_at).slice(0, 10) <= filters.to);
    }

    txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = txns.length;
    const items = txns.slice((page - 1) * pageSize, page * pageSize);

    return { items, page, pageSize, total };
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/agent/history?${params.toString()}`);
}
