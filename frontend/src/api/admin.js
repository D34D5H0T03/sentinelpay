import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';
import { me } from './auth';
import { toPaisa, fromPaisa, addMoney } from '../lib/money';

export async function dashboard() {
  if (USE_MOCK) {
    await delay();

    const activeUsers = db.users.filter((u) => u.status === 'ACTIVE').length;
    const openAlerts = db.riskAlerts.filter((a) => a.status === 'OPEN').length;

    const todayStr = new Date().toISOString().slice(0, 10);
    let todayVolumePaisa = 0;
    let todayFeesPaisa = 0;

    // Daily volume for last 14 days
    const dailyVolumeMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      dailyVolumeMap[key] = 0;
    }

    db.transactions.forEach((t) => {
      if (t.status === 'COMPLETED') {
        const txDate = (t.completed_at || t.created_at || '').slice(0, 10);
        const amtPaisa = toPaisa(t.amount);
        const feePaisa = toPaisa(t.fee_amount);

        if (txDate === todayStr) {
          todayVolumePaisa += amtPaisa;
          todayFeesPaisa += feePaisa;
        }

        const chartKey = txDate.slice(5, 10);
        if (dailyVolumeMap[chartKey] !== undefined) {
          dailyVolumeMap[chartKey] += amtPaisa;
        }
      }
    });

    const dailyVolume = Object.entries(dailyVolumeMap).map(([date, paisa]) => ({
      date,
      volume: parseFloat(fromPaisa(paisa)),
    }));

    const tb = db.getTrialBalance();
    const latestAudit = [...db.auditLogs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return {
      stats: {
        active_users: activeUsers,
        today_volume: fromPaisa(todayVolumePaisa),
        today_fees: fromPaisa(todayFeesPaisa),
        open_alerts: openAlerts,
      },
      daily_volume: dailyVolume,
      ledger_balanced: tb.is_balanced,
      trial_balance: tb.trial_balance,
      latest_audit: latestAudit,
    };
  }
  return request('GET', '/admin/dashboard');
}

export async function listUsers(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let list = [...db.users];

    if (filters.role) {
      list = list.filter((u) => u.roles.includes(filters.role));
    }
    if (filters.status) {
      list = list.filter((u) => u.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, page, pageSize, total };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/admin/users?${params.toString()}`);
}

export async function getUser(id) {
  if (USE_MOCK) {
    await delay();
    const userId = Number(id);
    const user = db.users.find((u) => u.user_id === userId);
    if (!user) throw new Error('User not found');

    const wallets = db.wallets
      .filter((w) => w.user_id === userId)
      .map((w) => ({
        ...w,
        balance: db.getWalletBalance(w.wallet_id),
      }));

    const userWalletNos = wallets.map((w) => w.wallet_no);
    const txns = db.transactions
      .filter((t) => {
        const detail = db.transferDetails.find((d) => d.transaction_id === t.transaction_id);
        return (
          detail &&
          (userWalletNos.includes(detail.source_ref) ||
            userWalletNos.includes(detail.dest_ref) ||
            t.initiated_by_user_id === userId)
        );
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return {
      ...user,
      wallets,
      recent_transactions: txns,
    };
  }
  return request('GET', `/admin/users/${id}`);
}

export async function updateUserStatus(id, status) {
  if (USE_MOCK) {
    await delay();
    const user = db.users.find((u) => u.user_id === Number(id));
    if (!user) throw new Error('User not found');

    const oldStatus = user.status;
    user.status = status;

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'UPDATE_USER_STATUS',
      entity_type: 'USER',
      entity_id: user.user_id,
      old_values: { status: oldStatus },
      new_values: { status },
      created_at: new Date().toISOString(),
    });

    return user;
  }
  return request('PATCH', `/admin/users/${id}/status`, { status });
}

export async function updateUserRoles(id, roles) {
  if (USE_MOCK) {
    await delay();
    const user = db.users.find((u) => u.user_id === Number(id));
    if (!user) throw new Error('User not found');

    const oldRoles = user.roles;
    user.roles = roles;

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'UPDATE_USER_ROLES',
      entity_type: 'USER',
      entity_id: user.user_id,
      old_values: { roles: oldRoles },
      new_values: { roles },
      created_at: new Date().toISOString(),
    });

    return user;
  }
  return request('PATCH', `/admin/users/${id}/roles`, { roles });
}

export async function createStaff(payload) {
  if (USE_MOCK) {
    await delay();
    const existing = db.users.find((u) => u.phone === payload.phone);
    if (existing) throw new Error('User with this phone number already exists.');

    const newUserId = db.users.length + 1;
    const now = new Date().toISOString();
    const newUser = {
      user_id: newUserId,
      phone: payload.phone,
      email: payload.email,
      name: payload.name,
      roles: payload.roles || ['FRAUD_ANALYST'],
      status: 'ACTIVE',
      created_at: now,
      last_login_at: null,
    };
    db.users.push(newUser);

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'CREATE_STAFF_USER',
      entity_type: 'USER',
      entity_id: newUserId,
      old_values: null,
      new_values: { phone: payload.phone, name: payload.name, roles: payload.roles },
      created_at: now,
    });

    return newUser;
  }
  return request('POST', '/admin/staff', payload);
}

export async function updateKyc(holderId, status) {
  if (USE_MOCK) {
    await delay();
    const user = db.users.find((u) => u.user_id === Number(holderId));
    if (!user) throw new Error('User not found');

    const oldKyc = user.kyc_status;
    user.kyc_status = status;

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: status === 'VERIFIED' ? 'KYC_APPROVE' : 'KYC_REJECT',
      entity_type: 'ACCOUNT_HOLDER',
      entity_id: user.user_id,
      old_values: { kyc_status: oldKyc },
      new_values: { kyc_status: status },
      created_at: new Date().toISOString(),
    });

    return user;
  }
  return request('PATCH', `/admin/kyc/${holderId}`, { status });
}

export async function listAgents() {
  if (USE_MOCK) {
    await delay();
    const agents = db.users.filter((u) => u.roles.includes('AGENT'));
    return agents.map((a) => {
      const floatWallet = db.wallets.find((w) => w.user_id === a.user_id && w.wallet_type === 'AGENT_FLOAT');
      return {
        ...a,
        wallet_no: floatWallet ? floatWallet.wallet_no : a.agent_profile?.agent_code,
        wallet_status: floatWallet ? floatWallet.status : 'ACTIVE',
        balance: floatWallet ? db.getWalletBalance(floatWallet.wallet_id) : '0.00',
      };
    });
  }
  return request('GET', '/admin/agents');
}

export async function createAgent(payload) {
  if (USE_MOCK) {
    await delay();
    const newUserId = db.users.length + 1;
    const now = new Date().toISOString();
    const newAgent = {
      user_id: newUserId,
      phone: payload.phone,
      email: payload.email || null,
      name: payload.name,
      roles: ['AGENT'],
      status: 'ACTIVE',
      date_of_birth: payload.date_of_birth || '1990-01-01',
      address: payload.district || 'Dhaka',
      kyc_status: 'VERIFIED',
      agent_profile: {
        agent_code: payload.agent_code,
        outlet_name: payload.outlet_name,
        district: payload.district,
        commission_rate: parseFloat(payload.commission_rate) || 0.0040,
      },
      created_at: now,
      last_login_at: null,
    };
    db.users.push(newAgent);

    // Create float wallet
    const newWalletId = db.wallets.length + 1;
    const newWallet = {
      wallet_id: newWalletId,
      user_id: newUserId,
      wallet_no: payload.agent_code,
      label: 'Float',
      status: 'ACTIVE',
      wallet_type: 'AGENT_FLOAT',
      opened_at: now,
    };
    db.wallets.push(newWallet);

    const newAcctId = db.ledgerAccounts.length + 1;
    db.ledgerAccounts.push({
      ledger_account_id: newAcctId,
      account_kind: 'WALLET',
      wallet_id: newWalletId,
      system_code: null,
      name: `Agent Float Wallet ${payload.agent_code}`,
      allow_negative: false,
    });

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'CREATE_AGENT',
      entity_type: 'AGENT_PROFILE',
      entity_id: newUserId,
      old_values: null,
      new_values: { agent_code: payload.agent_code, outlet: payload.outlet_name },
      created_at: now,
    });

    return newAgent;
  }
  return request('POST', '/admin/agents', payload);
}

export async function loadFloat({ agentWalletNo, amount }) {
  if (USE_MOCK) {
    await delay();
    const wallet = db.wallets.find((w) => w.wallet_no === agentWalletNo);
    if (!wallet) throw new Error('Agent wallet not found');

    const txn = db.postTransferInternal({
      typeCode: 'FLOAT_LOAD',
      userId: 1,
      sourceRef: 'SETTLEMENT',
      destRef: agentWalletNo,
      amount,
      fee: '0.00',
      note: 'Admin float allocation',
    });

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'FLOAT_LOAD',
      entity_type: 'WALLET',
      entity_id: wallet.wallet_id,
      old_values: null,
      new_values: { amount, dest: agentWalletNo },
      created_at: new Date().toISOString(),
    });

    return txn;
  }
  return request('POST', '/admin/float-load', { agentWalletNo, amount });
}

export async function listWallets(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let list = db.wallets.map((w) => {
      const user = db.users.find((u) => u.user_id === w.user_id);
      return {
        ...w,
        holder_name: user ? user.name : 'Unknown',
        holder_phone: user ? user.phone : '—',
        balance: db.getWalletBalance(w.wallet_id),
      };
    });

    if (filters.status) {
      list = list.filter((w) => w.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (w) =>
          w.wallet_no.toLowerCase().includes(q) ||
          w.label.toLowerCase().includes(q) ||
          w.holder_name.toLowerCase().includes(q) ||
          w.holder_phone.includes(q)
      );
    }

    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, page, pageSize, total };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/admin/wallets?${params.toString()}`);
}

export async function setWalletStatus(id, status) {
  if (USE_MOCK) {
    await delay();
    const wallet = db.wallets.find((w) => w.wallet_id === Number(id));
    if (!wallet) throw new Error('Wallet not found');

    const oldStatus = wallet.status;
    wallet.status = status;

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: status === 'FROZEN' ? 'WALLET_FREEZE' : status === 'ACTIVE' ? 'WALLET_UNFREEZE' : 'WALLET_CLOSE',
      entity_type: 'WALLET',
      entity_id: wallet.wallet_id,
      old_values: { status: oldStatus },
      new_values: { status },
      created_at: new Date().toISOString(),
    });

    return wallet;
  }
  return request('PATCH', `/admin/wallets/${id}/status`, { status });
}

export async function listLimits(walletId) {
  if (USE_MOCK) {
    await delay();
    return db.walletLimits.filter((l) => l.wallet_id === Number(walletId));
  }
  return request('GET', `/admin/wallets/${walletId}/limits`);
}

export async function addLimit(walletId, payload) {
  if (USE_MOCK) {
    await delay();
    const newLimit = {
      wallet_id: Number(walletId),
      limit_type: payload.limit_type,
      max_amount: payload.max_amount,
      effective_from: payload.effective_from || new Date().toISOString().slice(0, 10),
      effective_to: payload.effective_to || null,
    };
    db.walletLimits.push(newLimit);

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'ADD_LIMIT',
      entity_type: 'WALLET_LIMIT',
      entity_id: Number(walletId),
      old_values: null,
      new_values: newLimit,
      created_at: new Date().toISOString(),
    });

    return newLimit;
  }
  return request('POST', `/admin/wallets/${walletId}/limits`, payload);
}

export async function endLimit(walletId, type, from) {
  if (USE_MOCK) {
    await delay();
    const limit = db.walletLimits.find(
      (l) => l.wallet_id === Number(walletId) && l.limit_type === type && l.effective_from === from
    );
    if (limit) {
      limit.effective_to = new Date().toISOString().slice(0, 10);
    }
    return { success: true };
  }
  return request('POST', `/admin/wallets/${walletId}/limits/end`, { type, from });
}

export async function listFeeRules() {
  if (USE_MOCK) {
    await delay();
    return [...db.feeRules];
  }
  return request('GET', '/admin/fee-rules');
}

export async function createFeeRule(payload) {
  if (USE_MOCK) {
    await delay();
    const newId = db.feeRules.length + 1;
    const rule = {
      fee_rule_id: newId,
      type_code: payload.type_code,
      min_amount: payload.min_amount,
      max_amount: payload.max_amount,
      fee_flat: payload.fee_flat || '0.00',
      fee_percent: parseFloat(payload.fee_percent) || 0,
      effective_from: payload.effective_from,
      effective_to: payload.effective_to || null,
    };
    db.feeRules.push(rule);
    return rule;
  }
  return request('POST', '/admin/fee-rules', payload);
}

export async function updateFeeRule(id, payload) {
  if (USE_MOCK) {
    await delay();
    const rule = db.feeRules.find((r) => r.fee_rule_id === Number(id));
    if (!rule) throw new Error('Fee rule not found');
    Object.assign(rule, payload);
    return rule;
  }
  return request('PUT', `/admin/fee-rules/${id}`, payload);
}

export async function deleteFeeRule(id) {
  if (USE_MOCK) {
    await delay();
    const idx = db.feeRules.findIndex((r) => r.fee_rule_id === Number(id));
    if (idx !== -1) db.feeRules.splice(idx, 1);
    return { success: true };
  }
  return request('DELETE', `/admin/fee-rules/${id}`);
}

export async function listRiskRules() {
  if (USE_MOCK) {
    await delay();
    return [...db.riskRules];
  }
  return request('GET', '/admin/risk-rules');
}

export async function updateRiskRule(id, payload) {
  if (USE_MOCK) {
    await delay();
    const rule = db.riskRules.find((r) => r.rule_id === Number(id));
    if (!rule) throw new Error('Risk rule not found');
    if (payload.is_active !== undefined) rule.is_active = payload.is_active;
    if (payload.severity) rule.severity = payload.severity;
    return rule;
  }
  return request('PATCH', `/admin/risk-rules/${id}`, payload);
}

export async function getRiskParams(id) {
  if (USE_MOCK) {
    await delay();
    const rule = db.riskRules.find((r) => r.rule_id === Number(id));
    return rule ? rule.params : {};
  }
  return request('GET', `/admin/risk-rules/${id}/params`);
}

export async function saveRiskParams(id, params) {
  if (USE_MOCK) {
    await delay();
    const rule = db.riskRules.find((r) => r.rule_id === Number(id));
    if (!rule) throw new Error('Risk rule not found');
    const oldParams = { ...rule.params };
    rule.params = { ...rule.params, ...params };

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 1,
      actor_name: 'Tariqul Islam',
      action: 'SAVE_RISK_PARAMS',
      entity_type: 'RISK_RULE',
      entity_id: rule.rule_id,
      old_values: oldParams,
      new_values: params,
      created_at: new Date().toISOString(),
    });

    return rule.params;
  }
  return request('PUT', `/admin/risk-rules/${id}/params`, { params });
}

export async function listAllTransactions(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let txns = [...db.transactions];

    if (filters.status) txns = txns.filter((t) => t.status === filters.status);
    if (filters.type) txns = txns.filter((t) => t.type_code === filters.type);
    if (filters.from) txns = txns.filter((t) => (t.completed_at || t.created_at).slice(0, 10) >= filters.from);
    if (filters.to) txns = txns.filter((t) => (t.completed_at || t.created_at).slice(0, 10) <= filters.to);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      txns = txns.filter((t) => {
        const d = db.transferDetails.find((td) => td.transaction_id === t.transaction_id);
        return (
          t.reference_no.toLowerCase().includes(q) ||
          (d && (d.source_ref.toLowerCase().includes(q) || d.dest_ref.toLowerCase().includes(q)))
        );
      });
    }

    txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = txns.length;
    const items = txns.slice((page - 1) * pageSize, page * pageSize).map((t) => {
      const d = db.transferDetails.find((td) => td.transaction_id === t.transaction_id);
      return {
        ...t,
        source_ref: d ? d.source_ref : '—',
        dest_ref: d ? d.dest_ref : '—',
        note: d ? d.note : '',
      };
    });

    return { items, page, pageSize, total };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/admin/transactions?${params.toString()}`);
}

export async function reverseTransaction(id, { reason }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    const txn = db.transactions.find((t) => t.transaction_id === Number(id));
    if (!txn) throw new Error('Transaction not found');
    if (txn.status !== 'COMPLETED') {
      throw new Error('Only completed transactions may be reversed.');
    }
    if (txn.reversal_of_transaction_id) {
      const err = new Error('This transaction has already been reversed.');
      err.code = 'TRANSACTION_ALREADY_REVERSED';
      throw err;
    }

    const reversal = db.reverseTransactionInternal(
      txn.transaction_id,
      reason,
      new Date().toISOString(),
      currentUser ? currentUser.user_id : 1
    );

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: currentUser ? currentUser.user_id : 1,
      actor_name: currentUser ? currentUser.name : 'Administrator',
      action: 'REVERSE_TRANSACTION',
      entity_type: 'TRANSACTION',
      entity_id: txn.transaction_id,
      old_values: { status: 'COMPLETED' },
      new_values: { status: 'REVERSED', reversal_id: reversal.transaction_id, reason },
      created_at: new Date().toISOString(),
    });

    return reversal;
  }
  return request('POST', `/admin/transactions/${id}/reverse`, { reason });
}

export async function ledgerAccounts() {
  if (USE_MOCK) {
    await delay();
    return db.ledgerAccounts.map((a) => ({
      ...a,
      wallet_no: db.getWalletNoForAccount(a),
      balance: db.getAccountBalance(a.ledger_account_id),
    }));
  }
  return request('GET', '/admin/ledger/accounts');
}

export async function trialBalance() {
  if (USE_MOCK) {
    await delay();
    return db.getTrialBalance();
  }
  return request('GET', '/admin/ledger/trial-balance');
}

export async function getJournal(reference) {
  if (USE_MOCK) {
    await delay();
    return db.getJournalByReference(reference);
  }
  return request('GET', `/admin/ledger/journal?reference=${encodeURIComponent(reference)}`);
}

export async function auditLogs(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let logs = [...db.auditLogs];

    if (filters.action) {
      logs = logs.filter((l) => l.action === filters.action);
    }
    if (filters.entity_type) {
      logs = logs.filter((l) => l.entity_type === filters.entity_type);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.entity_type.toLowerCase().includes(q) ||
          l.actor_name.toLowerCase().includes(q)
      );
    }

    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = logs.length;
    const items = logs.slice((page - 1) * pageSize, page * pageSize);

    return { items, page, pageSize, total };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/admin/audit?${params.toString()}`);
}
