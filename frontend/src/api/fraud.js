import { USE_MOCK } from './config';
import { request } from './http';
import { db } from '../mock/db';
import { delay } from '../mock/delay';
import { me } from './auth';

export async function listAlerts(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let items = [...db.riskAlerts];

    if (filters.status) {
      items = items.filter((a) => a.status === filters.status);
    }
    if (filters.rule) {
      items = items.filter((a) => a.rule_code === filters.rule);
    }
    if (filters.severity) {
      items = items.filter((a) => a.severity === filters.severity);
    }
    if (filters.from) {
      items = items.filter((a) => a.created_at.slice(0, 10) >= filters.from);
    }
    if (filters.to) {
      items = items.filter((a) => a.created_at.slice(0, 10) <= filters.to);
    }

    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = items.length;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    return { items: paginated, page, pageSize, total };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/fraud/alerts?${params.toString()}`);
}

export async function getAlert(id) {
  if (USE_MOCK) {
    await delay();
    const alertId = Number(id);
    const alert = db.riskAlerts.find((a) => a.alert_id === alertId);
    if (!alert) {
      const err = new Error('Alert not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const rule = db.riskRules.find((r) => r.rule_code === alert.rule_code);
    const wallet = db.wallets.find((w) => w.wallet_id === alert.wallet_id);
    const user = wallet ? db.users.find((u) => u.user_id === wallet.user_id) : null;
    const balance = wallet ? db.getWalletBalance(wallet.wallet_id) : '0.00';

    // Transactions in the alert window
    const acct = wallet ? db.getAccountForWallet(wallet.wallet_id) : null;
    const windowTxns = [];
    if (acct) {
      db.transactions.forEach((t) => {
        const d = db.transferDetails.find((td) => td.transaction_id === t.transaction_id);
        if (!d) return;
        const isParty =
          d.source_account_id === acct.ledger_account_id ||
          d.destination_account_id === acct.ledger_account_id;

        const txTime = t.completed_at || t.created_at;
        if (isParty && txTime >= alert.window_start && txTime <= alert.window_end) {
          windowTxns.push({
            ...t,
            source_ref: d.source_ref,
            dest_ref: d.dest_ref,
          });
        }
      });
    }

    return {
      ...alert,
      rule_description: rule ? rule.description : '',
      rule_params: rule ? rule.params : {},
      wallet: wallet
        ? {
            wallet_id: wallet.wallet_id,
            wallet_no: wallet.wallet_no,
            status: wallet.status,
            balance,
            holder_name: user ? user.name : 'Unknown',
            holder_phone: user ? user.phone : '—',
            kyc_status: user ? user.kyc_status : 'UNVERIFIED',
          }
        : null,
      window_transactions: windowTxns,
    };
  }
  return request('GET', `/fraud/alerts/${id}`);
}

export async function updateAlert(id, { status, reason }) {
  if (USE_MOCK) {
    await delay();
    const alert = db.riskAlerts.find((a) => a.alert_id === Number(id));
    if (!alert) throw new Error('Alert not found');

    const oldStatus = alert.status;
    alert.status = status;
    alert.dismiss_reason = reason || null;

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 2,
      actor_name: 'Farhana Yasmin',
      action: status === 'DISMISSED' ? 'DISMISS_ALERT' : 'UPDATE_ALERT',
      entity_type: 'RISK_ALERT',
      entity_id: alert.alert_id,
      old_values: { status: oldStatus },
      new_values: { status, reason },
      created_at: new Date().toISOString(),
    });

    return alert;
  }
  return request('PATCH', `/fraud/alerts/${id}`, { status, reason });
}

export async function listCases(filters = {}) {
  if (USE_MOCK) {
    await delay();
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    let items = [...db.fraudCases];

    if (filters.status) {
      items = items.filter((c) => c.status === filters.status);
    }
    if (filters.outcome) {
      items = items.filter((c) => c.outcome === filters.outcome);
    }

    items.sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));

    const total = items.length;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize).map((c) => {
      const analyst = db.users.find((u) => u.user_id === c.assigned_analyst_id);
      return {
        ...c,
        assigned_analyst_name: analyst ? analyst.name : 'Unassigned',
        alert_count: c.alert_ids?.length || 0,
      };
    });

    return { items: paginated, page, pageSize, total };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return request('GET', `/fraud/cases?${params.toString()}`);
}

export async function createCase({ alertIds }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    const newCaseId = db.nextCaseId++;
    const caseNo = `CASE-2026-${String(newCaseId).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newCase = {
      case_id: newCaseId,
      case_no: caseNo,
      assigned_analyst_id: currentUser ? currentUser.user_id : 2,
      status: 'OPEN',
      outcome: null,
      opened_at: now,
      closed_at: null,
      alert_ids: alertIds || [],
      note: 'Case created from flagged risk alerts.',
    };
    db.fraudCases.push(newCase);

    // Link alerts to this case
    if (alertIds && alertIds.length > 0) {
      alertIds.forEach((aId) => {
        const al = db.riskAlerts.find((a) => a.alert_id === Number(aId));
        if (al) {
          al.status = 'IN_CASE';
          al.case_id = newCaseId;
        }
      });
    }

    // Add initial event
    db.caseEvents.push({
      event_id: db.nextEventId++,
      case_id: newCaseId,
      actor_user_id: currentUser ? currentUser.user_id : 2,
      actor: currentUser ? currentUser.name : 'Farhana Yasmin',
      event_type: 'ASSIGNED',
      body: `Case created with ${alertIds?.length || 0} linked alerts.`,
      created_at: now,
    });

    return newCase;
  }
  return request('POST', '/fraud/cases', { alertIds });
}

export async function getCase(id) {
  if (USE_MOCK) {
    await delay();
    const caseId = Number(id);
    const fraudCase = db.fraudCases.find((c) => c.case_id === caseId);
    if (!fraudCase) {
      const err = new Error('Case not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const analyst = db.users.find((u) => u.user_id === fraudCase.assigned_analyst_id);
    const linkedAlerts = db.riskAlerts.filter((a) => fraudCase.alert_ids?.includes(a.alert_id));
    const events = db.caseEvents
      .filter((e) => e.case_id === caseId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((e) => ({
        id: e.event_id,
        title: `${e.event_type}: ${e.actor || 'Analyst'}`,
        description: e.body,
        timestamp: e.created_at,
        actor: e.actor,
      }));

    return {
      ...fraudCase,
      assigned_analyst_name: analyst ? analyst.name : 'Unassigned',
      alerts: linkedAlerts,
      events,
    };
  }
  return request('GET', `/fraud/cases/${id}`);
}

export async function updateCase(id, { assignedAnalystId, status }) {
  if (USE_MOCK) {
    await delay();
    const fraudCase = db.fraudCases.find((c) => c.case_id === Number(id));
    if (!fraudCase) throw new Error('Case not found');

    const currentUser = await me();
    const now = new Date().toISOString();

    if (assignedAnalystId !== undefined) {
      fraudCase.assigned_analyst_id = assignedAnalystId;
      const analyst = db.users.find((u) => u.user_id === Number(assignedAnalystId));
      db.caseEvents.push({
        event_id: db.nextEventId++,
        case_id: fraudCase.case_id,
        actor_user_id: currentUser ? currentUser.user_id : 2,
        actor: currentUser ? currentUser.name : 'Analyst',
        event_type: 'ASSIGNED',
        body: `Reassigned to ${analyst ? analyst.name : 'Unassigned'}.`,
        created_at: now,
      });
    }

    if (status && status !== fraudCase.status) {
      fraudCase.status = status;
      db.caseEvents.push({
        event_id: db.nextEventId++,
        case_id: fraudCase.case_id,
        actor_user_id: currentUser ? currentUser.user_id : 2,
        actor: currentUser ? currentUser.name : 'Analyst',
        event_type: 'STATUS_CHANGE',
        body: `Status changed to ${status}.`,
        created_at: now,
      });
    }

    return fraudCase;
  }
  return request('PATCH', `/fraud/cases/${id}`, { assignedAnalystId, status });
}

export async function addCaseEvent(id, { body }) {
  if (USE_MOCK) {
    await delay();
    const currentUser = await me();
    const now = new Date().toISOString();
    const newEvent = {
      event_id: db.nextEventId++,
      case_id: Number(id),
      actor_user_id: currentUser ? currentUser.user_id : 2,
      actor: currentUser ? currentUser.name : 'Farhana Yasmin',
      event_type: 'NOTE',
      body,
      created_at: now,
    };
    db.caseEvents.push(newEvent);
    return newEvent;
  }
  return request('POST', `/fraud/cases/${id}/events`, { body });
}

export async function closeCase(id, { outcome, note }) {
  if (USE_MOCK) {
    await delay();
    const fraudCase = db.fraudCases.find((c) => c.case_id === Number(id));
    if (!fraudCase) throw new Error('Case not found');

    const currentUser = await me();
    const now = new Date().toISOString();

    fraudCase.status = 'CLOSED';
    fraudCase.outcome = outcome;
    fraudCase.closed_at = now;
    fraudCase.note = note;

    // Update linked alerts
    if (fraudCase.alert_ids && fraudCase.alert_ids.length > 0) {
      fraudCase.alert_ids.forEach((aId) => {
        const al = db.riskAlerts.find((a) => a.alert_id === aId);
        if (al) {
          al.status = outcome === 'CONFIRMED_FRAUD' ? 'CONFIRMED' : 'DISMISSED';
        }
      });
    }

    db.caseEvents.push({
      event_id: db.nextEventId++,
      case_id: fraudCase.case_id,
      actor_user_id: currentUser ? currentUser.user_id : 2,
      actor: currentUser ? currentUser.name : 'Farhana Yasmin',
      event_type: 'CLOSED',
      body: `Case closed with outcome: ${outcome}. Note: ${note}`,
      created_at: now,
    });

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: currentUser ? currentUser.user_id : 2,
      actor_name: currentUser ? currentUser.name : 'Farhana Yasmin',
      action: 'CLOSE_CASE',
      entity_type: 'FRAUD_CASE',
      entity_id: fraudCase.case_id,
      old_values: { status: 'OPEN' },
      new_values: { status: 'CLOSED', outcome, note },
      created_at: now,
    });

    return fraudCase;
  }
  return request('POST', `/fraud/cases/${id}/close`, { outcome, note });
}

export async function stats() {
  if (USE_MOCK) {
    await delay();

    // 1. Alerts by rule (Bar chart data)
    const ruleCounts = {
      VELOCITY: 0,
      STRUCTURING: 0,
      RAPID_IN_OUT: 0,
    };
    db.riskAlerts.forEach((a) => {
      if (ruleCounts[a.rule_code] !== undefined) {
        ruleCounts[a.rule_code]++;
      }
    });

    const alertsByRule = [
      { name: 'Velocity', code: 'VELOCITY', count: ruleCounts.VELOCITY },
      { name: 'Structuring', code: 'STRUCTURING', count: ruleCounts.STRUCTURING },
      { name: 'Rapid in-out', code: 'RAPID_IN_OUT', count: ruleCounts.RAPID_IN_OUT },
    ];

    // 2. Alerts per day (Line chart data for last 14 days)
    const dayCounts = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(5, 10); // MM-DD
      dayCounts[dateKey] = 0;
    }

    db.riskAlerts.forEach((a) => {
      const key = a.created_at.slice(5, 10);
      if (dayCounts[key] !== undefined) {
        dayCounts[key]++;
      }
    });

    const alertsPerDay = Object.entries(dayCounts).map(([date, count]) => ({
      date,
      alerts: count,
    }));

    // 3. False-positive rate by rule (Table)
    const falsePositiveRate = [
      { rule: 'Velocity check', total: ruleCounts.VELOCITY, falsePositives: 1, fpRate: '25.0%' },
      { rule: 'Structuring check', total: ruleCounts.STRUCTURING, falsePositives: 1, fpRate: '25.0%' },
      { rule: 'Rapid in-out flow', total: ruleCounts.RAPID_IN_OUT, falsePositives: 0, fpRate: '0.0%' },
    ];

    // 4. Open cases per analyst (Table)
    const analysts = db.users.filter((u) => u.roles.includes('FRAUD_ANALYST'));
    const openCasesPerAnalyst = analysts.map((analyst) => {
      const openCount = db.fraudCases.filter(
        (c) => c.assigned_analyst_id === analyst.user_id && c.status !== 'CLOSED'
      ).length;
      const closedCount = db.fraudCases.filter(
        (c) => c.assigned_analyst_id === analyst.user_id && c.status === 'CLOSED'
      ).length;

      return {
        analyst_id: analyst.user_id,
        name: analyst.name,
        email: analyst.email,
        open_cases: openCount,
        closed_cases: closedCount,
      };
    });

    return {
      alerts_by_rule: alertsByRule,
      alerts_per_day: alertsPerDay,
      false_positive_rate: falsePositiveRate,
      open_cases_per_analyst: openCasesPerAnalyst,
    };
  }
  return request('GET', '/fraud/stats');
}

export async function runRules() {
  if (USE_MOCK) {
    await delay(600);
    // Simulates running detection engines
    const newAlert = {
      alert_id: db.nextAlertId++,
      rule_id: 1,
      rule_code: 'VELOCITY',
      severity: 'MEDIUM',
      wallet_id: 1,
      wallet_no: '01711111111',
      window_start: new Date(Date.now() - 10 * 60000).toISOString(),
      window_end: new Date().toISOString(),
      status: 'OPEN',
      case_id: null,
      details: 'Detected automated cluster: 5 transactions within 8 minutes.',
      created_at: new Date().toISOString(),
    };
    db.riskAlerts.push(newAlert);

    db.auditLogs.push({
      audit_id: db.nextAuditId++,
      actor_user_id: 2,
      actor_name: 'Farhana Yasmin',
      action: 'RUN_RISK_RULES',
      entity_type: 'SYSTEM',
      entity_id: 0,
      old_values: null,
      new_values: { alerts_created: 1 },
      created_at: new Date().toISOString(),
    });

    return { alerts_created: 1 };
  }
  return request('POST', '/fraud/rules/run');
}
