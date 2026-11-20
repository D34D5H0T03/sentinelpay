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

export async function quote({ type, amount }) {
  if (USE_MOCK) {
    await delay(100);
    const typeCode = type || 'SEND_MONEY';
    const feeRule = db.feeRules.find((r) => r.type_code === typeCode);

    let fee = '0.00';
    if (feeRule) {
      fee = calculateFee(amount, feeRule.fee_flat, feeRule.fee_percent);
    }
    const totalDebit = addMoney(amount, fee);

    return {
      type: typeCode,
      amount,
      fee,
      total_debit: totalDebit,
    };
  }
  return request('POST', '/transactions/quote', { type, amount });
}

export async function send({ fromWalletId, toWalletNo, amount, note, idempotencyKey }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    if (!currentUser) throw new Error('Unauthorized');

    // Validate idempotency
    const existingTx = db.transactions.find(
      (t) => t.initiated_by_user_id === currentUser.user_id && t.idempotency_key === idempotencyKey
    );
    if (existingTx) {
      return existingTx;
    }

    const fromWallet = db.wallets.find((w) => w.wallet_id === Number(fromWalletId));
    if (!fromWallet) {
      const err = new Error('Source wallet not found');
      err.code = 'SOURCE_NOT_FOUND';
      throw err;
    }

    if (fromWallet.status !== 'ACTIVE') {
      const err = new Error('The source wallet is not active.');
      err.code = 'SOURCE_WALLET_NOT_ACTIVE';
      throw err;
    }

    const cleanToWalletNo = String(toWalletNo).trim();
    const toWallet = db.wallets.find((w) => w.wallet_no === cleanToWalletNo);
    if (!toWallet) {
      const err = new Error('Recipient wallet not found. Check the wallet number and try again.');
      err.code = 'DESTINATION_NOT_FOUND';
      throw err;
    }

    if (toWallet.status !== 'ACTIVE') {
      const err = new Error('The recipient wallet is not active.');
      err.code = 'DESTINATION_WALLET_NOT_ACTIVE';
      throw err;
    }

    if (fromWallet.wallet_no === toWallet.wallet_no) {
      const err = new Error('Source and destination wallets must be different.');
      err.code = 'SOURCE_AND_DESTINATION_ARE_THE_SAME';
      throw err;
    }

    // Fee calculation
    const quoteRes = await quote({ type: 'SEND_MONEY', amount });
    const fee = quoteRes.fee;
    const totalDebit = quoteRes.total_debit;

    // Check balance
    const currentBalance = db.getWalletBalance(fromWallet.wallet_id);
    if (compareMoney(currentBalance, totalDebit) < 0) {
      // Record failed transaction attempt
      db.recordFailedTransaction({
        typeCode: 'SEND_MONEY',
        userId: currentUser.user_id,
        sourceRef: fromWallet.wallet_no,
        destRef: toWallet.wallet_no,
        amount,
        fee,
        failureReason: 'INSUFFICIENT_FUNDS',
        note,
      });

      const err = new Error('Not enough balance in this wallet. Add money or send a smaller amount.');
      err.code = 'INSUFFICIENT_FUNDS';
      throw err;
    }

    // Check limits
    const limits = db.getWalletLimits(fromWallet.wallet_id);
    if (compareMoney(amount, limits.per_txn.max) > 0) {
      db.recordFailedTransaction({
        typeCode: 'SEND_MONEY',
        userId: currentUser.user_id,
        sourceRef: fromWallet.wallet_no,
        destRef: toWallet.wallet_no,
        amount,
        fee,
        failureReason: 'PER_TRANSACTION_LIMIT_EXCEEDED',
        note,
      });
      const err = new Error('This amount exceeds the per-transaction limit for this wallet.');
      err.code = 'PER_TRANSACTION_LIMIT_EXCEEDED';
      throw err;
    }

    if (compareMoney(amount, limits.daily.remaining) > 0) {
      db.recordFailedTransaction({
        typeCode: 'SEND_MONEY',
        userId: currentUser.user_id,
        sourceRef: fromWallet.wallet_no,
        destRef: toWallet.wallet_no,
        amount,
        fee,
        failureReason: 'DAILY_LIMIT_EXCEEDED',
        note,
      });
      const err = new Error('This transfer exceeds the remaining daily limit for this wallet.');
      err.code = 'DAILY_LIMIT_EXCEEDED';
      throw err;
    }

    if (compareMoney(amount, limits.monthly.remaining) > 0) {
      db.recordFailedTransaction({
        typeCode: 'SEND_MONEY',
        userId: currentUser.user_id,
        sourceRef: fromWallet.wallet_no,
        destRef: toWallet.wallet_no,
        amount,
        fee,
        failureReason: 'MONTHLY_LIMIT_EXCEEDED',
        note,
      });
      const err = new Error('This transfer exceeds the remaining monthly limit for this wallet.');
      err.code = 'MONTHLY_LIMIT_EXCEEDED';
      throw err;
    }

    // Post transfer successfully
    const txn = db.postTransferInternal({
      typeCode: 'SEND_MONEY',
      userId: currentUser.user_id,
      sourceRef: fromWallet.wallet_no,
      destRef: toWallet.wallet_no,
      amount,
      fee,
      note,
    });

    return txn;
  }
  return request('POST', '/transactions/send', {
    fromWalletId,
    toWalletNo,
    amount,
    note,
    idempotencyKey,
  });
}

export async function list(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let txns = [...db.transactions];

    // If user is customer, filter by user's wallets
    if (currentUser && currentUser.roles.includes('CUSTOMER') && !currentUser.roles.includes('ADMIN')) {
      const userWalletNos = db.wallets
        .filter((w) => w.user_id === currentUser.user_id)
        .map((w) => w.wallet_no);

      txns = txns.filter((t) => {
        const detail = db.transferDetails.find((d) => d.transaction_id === t.transaction_id);
        if (!detail) return false;
        return (
          userWalletNos.includes(detail.source_ref) ||
          userWalletNos.includes(detail.dest_ref) ||
          t.initiated_by_user_id === currentUser.user_id
        );
      });
    }

    // Filter by specific walletId
    if (filters.walletId) {
      const wallet = db.wallets.find((w) => w.wallet_id === Number(filters.walletId));
      if (wallet) {
        txns = txns.filter((t) => {
          const detail = db.transferDetails.find((d) => d.transaction_id === t.transaction_id);
          return detail && (detail.source_ref === wallet.wallet_no || detail.dest_ref === wallet.wallet_no);
        });
      }
    }

    // Filter by type
    if (filters.type) {
      txns = txns.filter((t) => t.type_code === filters.type);
    }

    // Filter by status
    if (filters.status) {
      txns = txns.filter((t) => t.status === filters.status);
    }

    // Filter by date
    if (filters.from) {
      txns = txns.filter((t) => (t.completed_at || t.created_at).slice(0, 10) >= filters.from);
    }
    if (filters.to) {
      txns = txns.filter((t) => (t.completed_at || t.created_at).slice(0, 10) <= filters.to);
    }

    // Search reference or counterparty
    if (filters.search) {
      const q = filters.search.toLowerCase();
      txns = txns.filter((t) => {
        const detail = db.transferDetails.find((d) => d.transaction_id === t.transaction_id);
        return (
          t.reference_no.toLowerCase().includes(q) ||
          (detail && (detail.source_ref.toLowerCase().includes(q) || detail.dest_ref.toLowerCase().includes(q)))
        );
      });
    }

    // Sort newest first
    txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = txns.length;
    const items = txns.slice((page - 1) * pageSize, page * pageSize).map((t) => {
      const detail = db.transferDetails.find((d) => d.transaction_id === t.transaction_id);
      return {
        ...t,
        source_ref: detail ? detail.source_ref : '—',
        dest_ref: detail ? detail.dest_ref : '—',
        note: detail ? detail.note : '',
      };
    });

    return { items, page, pageSize, total };
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/transactions?${params.toString()}`);
}

export async function get(id) {
  if (USE_MOCK) {
    await delay();
    const txnId = Number(id);
    const txn = db.transactions.find((t) => t.transaction_id === txnId);
    if (!txn) {
      const err = new Error('Transaction not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const detail = db.transferDetails.find((d) => d.transaction_id === txnId);
    const history = db.transactionStatusHistory
      .filter((h) => h.transaction_id === txnId)
      .map((h) => ({
        id: h.history_id,
        title: `Status: ${h.to_status}`,
        description: h.reason || '',
        timestamp: h.changed_at,
      }));

    // Find holders for parties
    const srcWallet = detail ? db.wallets.find((w) => w.wallet_no === detail.source_ref) : null;
    const srcUser = srcWallet ? db.users.find((u) => u.user_id === srcWallet.user_id) : null;

    const dstWallet = detail ? db.wallets.find((w) => w.wallet_no === detail.dest_ref) : null;
    const dstUser = dstWallet ? db.users.find((u) => u.user_id === dstWallet.user_id) : null;

    // Check if this was reversed or is a reversal
    let reversalTx = null;
    if (txn.status === 'REVERSED') {
      reversalTx = db.transactions.find((t) => t.reversal_of_transaction_id === txnId);
    } else if (txn.type_code === 'REVERSAL' && txn.reversal_of_transaction_id) {
      reversalTx = db.transactions.find((t) => t.transaction_id === txn.reversal_of_transaction_id);
    }

    return {
      ...txn,
      source_ref: detail ? detail.source_ref : '—',
      source_holder: srcUser ? srcUser.name : detail?.source_ref === 'SETTLEMENT' ? 'System Settlement' : '—',
      dest_ref: detail ? detail.dest_ref : '—',
      dest_holder: dstUser ? dstUser.name : detail?.dest_ref === 'SETTLEMENT' ? 'System Settlement' : '—',
      note: detail ? detail.note : '',
      history,
      reversal_transaction: reversalTx
        ? { transaction_id: reversalTx.transaction_id, reference_no: reversalTx.reference_no }
        : null,
    };
  }
  return request('GET', `/transactions/${id}`);
}
