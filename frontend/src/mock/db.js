import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_WALLETS,
  INITIAL_LEDGER_ACCOUNTS,
  INITIAL_WALLET_LIMITS,
  INITIAL_FEE_RULES,
  INITIAL_RISK_RULES,
  INITIAL_BENEFICIARIES,
} from './data.js';
import {
  toPaisa,
  fromPaisa,
  addMoney,
  subtractMoney,
  compareMoney,
  calculateFee,
} from '../lib/money.js';

// In-memory state
class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.roles = [...INITIAL_ROLES];
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.wallets = JSON.parse(JSON.stringify(INITIAL_WALLETS));
    this.ledgerAccounts = JSON.parse(JSON.stringify(INITIAL_LEDGER_ACCOUNTS));
    this.walletLimits = JSON.parse(JSON.stringify(INITIAL_WALLET_LIMITS));
    this.feeRules = JSON.parse(JSON.stringify(INITIAL_FEE_RULES));
    this.riskRules = JSON.parse(JSON.stringify(INITIAL_RISK_RULES));
    this.beneficiaries = JSON.parse(JSON.stringify(INITIAL_BENEFICIARIES));

    this.transactions = [];
    this.transferDetails = [];
    this.ledgerJournals = [];
    this.ledgerEntries = [];
    this.transactionStatusHistory = [];
    this.riskAlerts = [];
    this.fraudCases = [];
    this.caseEvents = [];
    this.auditLogs = [];

    this.nextTxId = 1;
    this.nextJournalId = 1;
    this.nextEntryId = 1;
    this.nextAlertId = 1;
    this.nextCaseId = 1;
    this.nextEventId = 1;
    this.nextAuditId = 1;

    this.seedStoryAndHistory();
  }

  // --- Seed Core Story & 60+ Transactions ---
  seedStoryAndHistory() {
    // 1. Initial Float Load: Settlement -> AG-DHK-001 (100,000.00)
    this.postTransferInternal({
      typeCode: 'FLOAT_LOAD',
      userId: 1, // Admin
      sourceRef: 'SETTLEMENT',
      destRef: 'AG-DHK-001',
      amount: '100000.00',
      fee: '0.00',
      note: 'Initial float load from settlement',
      customRef: 'TX-DEMO-001',
      date: '2026-10-25T10:00:00Z',
    });

    // 2. Cash In: AG-DHK-001 -> 01711111111 (5,000.00, fee 0.00)
    this.postTransferInternal({
      typeCode: 'CASH_IN',
      userId: 5, // Agent Anisur
      sourceRef: 'AG-DHK-001',
      destRef: '01711111111',
      amount: '5000.00',
      fee: '0.00',
      note: 'Cash in at outlet',
      customRef: 'TX-DEMO-002',
      date: '2026-10-25T11:30:00Z',
    });

    // 3. Send Money: 01711111111 -> 01722222222 (1,200.00, fee 5.00)
    this.postTransferInternal({
      typeCode: 'SEND_MONEY',
      userId: 3, // Kabir Ahmed
      sourceRef: '01711111111',
      destRef: '01722222222',
      amount: '1200.00',
      fee: '5.00',
      note: 'Rent share',
      customRef: 'TX-DEMO-003',
      date: '2026-10-25T12:15:00Z',
    });

    // 4. Deliberate Failure: 01722222222 -> 01711111111 (9,999.00) -> INSUFFICIENT_FUNDS
    this.recordFailedTransaction({
      typeCode: 'SEND_MONEY',
      userId: 4,
      sourceRef: '01722222222',
      destRef: '01711111111',
      amount: '9999.00',
      fee: '5.00',
      failureReason: 'INSUFFICIENT_FUNDS',
      note: 'Too much',
      customRef: 'TX-DEMO-004',
      date: '2026-10-25T14:00:00Z',
    });

    // At this checkpoint:
    // Agent 1: 95,000.00
    // Cust 1: 3,795.00
    // Cust 2: 1,200.00
    // Fee revenue: 5.00
    // Settlement: -100,000.00
    // Trial balance: 0.00

    // Load float for Agent 2
    this.postTransferInternal({
      typeCode: 'FLOAT_LOAD',
      userId: 1,
      sourceRef: 'SETTLEMENT',
      destRef: 'AG-CTG-002',
      amount: '80000.00',
      fee: '0.00',
      note: 'Chattogram float allocation',
      customRef: 'TX-CTG-001',
      date: '2026-10-26T08:00:00Z',
    });

    // Cash-in to Cust 3 (Sylhet)
    this.postTransferInternal({
      typeCode: 'CASH_IN',
      userId: 10,
      sourceRef: 'AG-CTG-002',
      destRef: '01744444444',
      amount: '35000.00',
      fee: '0.00',
      note: 'Cash in for business',
      date: '2026-10-26T09:30:00Z',
    });

    // Cash-in to Cust 4 (Khulna)
    this.postTransferInternal({
      typeCode: 'CASH_IN',
      userId: 10,
      sourceRef: 'AG-CTG-002',
      destRef: '01755555555',
      amount: '25000.00',
      fee: '0.00',
      note: 'Family support cash in',
      date: '2026-10-27T10:15:00Z',
    });

    // Cash-in to Cust 5 (Frozen account prior to freeze)
    this.postTransferInternal({
      typeCode: 'CASH_IN',
      userId: 10,
      sourceRef: 'AG-CTG-002',
      destRef: '01766666666',
      amount: '18000.00',
      fee: '0.00',
      note: 'Outlet cash in',
      date: '2026-10-28T11:00:00Z',
    });

    // Now seed ~55 more transactions among Cust 3, Cust 4, Cust 5, Cust 1's savings wallet, and Agent 2
    // keeping Cust 1 Main at 3,795.00, Cust 2 Main at 1,200.00, and Agent 1 at 95,000.00
    const txTemplates = [
      { from: '01744444444', to: '01755555555', type: 'SEND_MONEY', amount: '1500.00', fee: '5.00', note: 'Project supplies' },
      { from: '01755555555', to: '01711111111-2', type: 'SEND_MONEY', amount: '1000.00', fee: '5.00', note: 'Savings pool' },
      { from: '01744444444', to: '01766666666', type: 'SEND_MONEY', amount: '2200.00', fee: '5.00', note: 'Merchant settlement' },
      { from: '01755555555', to: 'AG-CTG-002', type: 'CASH_OUT', amount: '800.00', fee: '14.80', note: 'Cash out at counter' },
      { from: '01744444444', to: '01755555555', type: 'SEND_MONEY', amount: '1200.00', fee: '5.00', note: 'Book purchase' },
      { from: 'AG-CTG-002', to: '01744444444', type: 'CASH_IN', amount: '4000.00', fee: '0.00', note: 'Agent cash-in' },
      { from: '01766666666', to: '01744444444', type: 'SEND_MONEY', amount: '2000.00', fee: '5.00', note: 'Freelance fee' },
      { from: '01755555555', to: 'AG-CTG-002', type: 'CASH_OUT', amount: '3000.00', fee: '55.50', note: 'Cash out emergency' },
      { from: '01744444444', to: '01711111111-2', type: 'SEND_MONEY', amount: '600.00', fee: '5.00', note: 'Shared subscription' },
      { from: '01755555555', to: '01744444444', type: 'SEND_MONEY', amount: '2500.00', fee: '5.00', note: 'Equipment return' },
    ];

    let baseDay = 28;
    let baseMonth = 10;
    let hour = 9;

    for (let i = 0; i < 55; i++) {
      const template = txTemplates[i % txTemplates.length];
      hour = (hour + 2) % 24;
      if (hour < 8) hour = 8;
      if (i % 3 === 0) {
        baseDay++;
        if (baseDay > 30 && baseMonth === 10) {
          baseDay = 1;
          baseMonth = 11;
        }
      }

      const dayStr = String(baseDay).padStart(2, '0');
      const monthStr = String(baseMonth).padStart(2, '0');
      const hourStr = String(hour).padStart(2, '0');
      const minuteStr = String((i * 17) % 60).padStart(2, '0');
      const date = `2026-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00Z`;

      // Status variation
      if (i === 12 || i === 28 || i === 42) {
        // Failed transactions
        this.recordFailedTransaction({
          typeCode: template.type,
          userId: 3,
          sourceRef: template.from,
          destRef: template.to,
          amount: '30000.00', // exceeds limit
          fee: template.fee,
          failureReason: 'PER_TRANSACTION_LIMIT_EXCEEDED',
          note: template.note,
          date,
        });
      } else if (i === 35) {
        // Initiated transaction (pending)
        this.recordInitiatedTransaction({
          typeCode: template.type,
          userId: 7,
          sourceRef: template.from,
          destRef: template.to,
          amount: '1250.00',
          fee: template.fee,
          note: 'Pending verification',
          date,
        });
      } else {
        // Normal completed transaction
        const txn = this.postTransferInternal({
          typeCode: template.type,
          userId: 3,
          sourceRef: template.from,
          destRef: template.to,
          amount: template.amount,
          fee: template.fee,
          note: `${template.note} #${i + 1}`,
          date,
        });

        // Let transaction 18 be reversed!
        if (i === 18 && txn) {
          this.reverseTransactionInternal(
            txn.transaction_id,
            'Customer dispute - wrong recipient entered by sender',
            `2026-${monthStr}-${dayStr}T${hourStr + 1}:${minuteStr}:00Z`,
            1 // Admin
          );
        }
      }
    }

    // --- Seed 12 Risk Alerts across 3 rules and 3 severities ---
    const alertData = [
      { rule_code: 'VELOCITY', severity: 'MEDIUM', wallet_id: 1, wallet_no: '01711111111', status: 'CONFIRMED', case_id: 1, window: ['2026-11-05T10:00:00Z', '2026-11-05T10:10:00Z'], details: '6 outgoing transfers initiated within 10 minutes (threshold: 5).' },
      { rule_code: 'STRUCTURING', severity: 'HIGH', wallet_id: 4, wallet_no: '01744444444', status: 'IN_CASE', case_id: 4, window: ['2026-11-18T06:00:00Z', '2026-11-19T06:00:00Z'], details: '4 transfers of ৳ 24,000.00 just below ৳ 25,000.00 per-transaction limit.' },
      { rule_code: 'RAPID_IN_OUT', severity: 'HIGH', wallet_id: 5, wallet_no: '01755555555', status: 'CONFIRMED', case_id: 1, window: ['2026-11-06T14:00:00Z', '2026-11-06T14:30:00Z'], details: 'Received ৳ 15,000.00 via cash-in and disbursed 94% within 18 minutes.' },
      { rule_code: 'VELOCITY', severity: 'LOW', wallet_id: 3, wallet_no: '01722222222', status: 'DISMISSED', case_id: 2, window: ['2026-11-02T12:00:00Z', '2026-11-02T12:10:00Z'], details: '3 consecutive small transfers to verified family member.' },
      { rule_code: 'STRUCTURING', severity: 'MEDIUM', wallet_id: 1, wallet_no: '01711111111', status: 'DISMISSED', case_id: 2, window: ['2026-11-08T09:00:00Z', '2026-11-09T09:00:00Z'], details: 'Two transfers near limit during regular house rent payment.' },
      { rule_code: 'RAPID_IN_OUT', severity: 'HIGH', wallet_id: 6, wallet_no: '01766666666', status: 'CONFIRMED', case_id: 1, window: ['2026-11-10T16:00:00Z', '2026-11-10T16:30:00Z'], details: 'Immediate pass-through of cash-in funds across multiple accounts.' },
      { rule_code: 'VELOCITY', severity: 'HIGH', wallet_id: 4, wallet_no: '01744444444', status: 'OPEN', case_id: null, window: ['2026-11-19T08:00:00Z', '2026-11-19T08:10:00Z'], details: '7 transfers in 6 minutes to distinct unverified recipients.' },
      { rule_code: 'STRUCTURING', severity: 'HIGH', wallet_id: 5, wallet_no: '01755555555', status: 'OPEN', case_id: null, window: ['2026-11-19T11:00:00Z', '2026-11-20T11:00:00Z'], details: 'Repeated transactions of ৳ 24,500.00.' },
      { rule_code: 'RAPID_IN_OUT', severity: 'MEDIUM', wallet_id: 3, wallet_no: '01722222222', status: 'IN_CASE', case_id: 3, window: ['2026-11-12T13:00:00Z', '2026-11-12T13:30:00Z'], details: '85% outflow within 25 minutes of incoming transfer.' },
      { rule_code: 'VELOCITY', severity: 'LOW', wallet_id: 1, wallet_no: '01711111111', status: 'OPEN', case_id: null, window: ['2026-11-20T07:00:00Z', '2026-11-20T07:10:00Z'], details: '4 utility bill payments in quick succession.' },
      { rule_code: 'STRUCTURING', severity: 'LOW', wallet_id: 3, wallet_no: '01722222222', status: 'OPEN', case_id: null, window: ['2026-11-20T09:00:00Z', '2026-11-20T17:00:00Z'], details: 'Repeated amounts near threshold.' },
      { rule_code: 'RAPID_IN_OUT', severity: 'HIGH', wallet_id: 4, wallet_no: '01744444444', status: 'OPEN', case_id: null, window: ['2026-11-20T14:00:00Z', '2026-11-20T14:30:00Z'], details: 'Received ৳ 20,000.00 and sent ৳ 19,500.00 within 12 minutes.' },
    ];

    alertData.forEach((a, idx) => {
      const rule = this.riskRules.find((r) => r.rule_code === a.rule_code);
      this.riskAlerts.push({
        alert_id: this.nextAlertId++,
        rule_id: rule ? rule.rule_id : 1,
        rule_code: a.rule_code,
        severity: a.severity,
        wallet_id: a.wallet_id,
        wallet_no: a.wallet_no,
        window_start: a.window[0],
        window_end: a.window[1],
        status: a.status,
        case_id: a.case_id,
        details: a.details,
        created_at: a.window[1],
      });
    });

    // --- Seed 4 Cases (One per outcome: CONFIRMED_FRAUD, FALSE_POSITIVE, INCONCLUSIVE; + 1 INVESTIGATING) ---
    this.fraudCases = [
      {
        case_id: 1,
        case_no: 'CASE-2026-001',
        assigned_analyst_id: 2, // Farhana Yasmin
        status: 'CLOSED',
        outcome: 'CONFIRMED_FRAUD',
        opened_at: '2026-11-06T15:00:00Z',
        closed_at: '2026-11-11T12:00:00Z',
        alert_ids: [1, 3, 6],
        note: 'Pattern matches organized funnel mule account. Recommended freezing wallet 01766666666.',
      },
      {
        case_id: 2,
        case_no: 'CASE-2026-002',
        assigned_analyst_id: 2,
        status: 'CLOSED',
        outcome: 'FALSE_POSITIVE',
        opened_at: '2026-11-08T10:00:00Z',
        closed_at: '2026-11-09T16:00:00Z',
        alert_ids: [4, 5],
        note: 'Customer provided tenancy agreement matching repeated rent payments.',
      },
      {
        case_id: 3,
        case_no: 'CASE-2026-003',
        assigned_analyst_id: 2,
        status: 'CLOSED',
        outcome: 'INCONCLUSIVE',
        opened_at: '2026-11-13T09:00:00Z',
        closed_at: '2026-11-16T11:00:00Z',
        alert_ids: [9],
        note: 'Customer could not be reached by phone for verification. Kept under observation.',
      },
      {
        case_id: 4,
        case_no: 'CASE-2026-004',
        assigned_analyst_id: 2,
        status: 'INVESTIGATING',
        outcome: null,
        opened_at: '2026-11-19T07:30:00Z',
        closed_at: null,
        alert_ids: [2],
        note: 'Under active review by analyst. Correlating counterparty records in Sylhet region.',
      },
    ];

    // Case events
    this.caseEvents = [
      { event_id: 1, case_id: 1, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'ASSIGNED', body: 'Case auto-assigned to primary analyst.', created_at: '2026-11-06T15:00:00Z' },
      { event_id: 2, case_id: 1, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'NOTE', body: 'Cross-checked KYC documentation. ID submission matches fraudulent syndicate.', created_at: '2026-11-08T11:20:00Z' },
      { event_id: 3, case_id: 1, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'CLOSED', body: 'Outcome: CONFIRMED_FRAUD. Recommended freezing account.', created_at: '2026-11-11T12:00:00Z' },

      { event_id: 4, case_id: 2, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'ASSIGNED', body: 'Case opened from structuring alert.', created_at: '2026-11-08T10:00:00Z' },
      { event_id: 5, case_id: 2, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'CLOSED', body: 'Outcome: FALSE_POSITIVE. Verified legitimate tenancy transfers.', created_at: '2026-11-09T16:00:00Z' },

      { event_id: 6, case_id: 3, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'NOTE', body: 'Outflow within 25 mins flagged. Out of reach via cellular phone.', created_at: '2026-11-14T10:00:00Z' },
      { event_id: 7, case_id: 3, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'CLOSED', body: 'Outcome: INCONCLUSIVE. No definitive illicit activity confirmed.', created_at: '2026-11-16T11:00:00Z' },

      { event_id: 8, case_id: 4, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'ASSIGNED', body: 'Investigating structuring alert in Sylhet district.', created_at: '2026-11-19T07:30:00Z' },
      { event_id: 9, case_id: 4, actor_user_id: 2, actor: 'Farhana Yasmin', event_type: 'NOTE', body: 'Requesting statement breakdown for wallet 01744444444.', created_at: '2026-11-19T14:45:00Z' },
    ];

    // --- Seed 25 Audit Logs ---
    const auditTemplates = [
      { actor: 1, action: 'FLOAT_LOAD', entity: 'WALLET', entity_id: 7, old: null, new: { amount: '100000.00', dest: 'AG-DHK-001' }, time: '2026-10-25T10:00:00Z' },
      { actor: 1, action: 'CREATE_STAFF_USER', entity: 'USER', entity_id: 2, old: null, new: { role: 'FRAUD_ANALYST', email: 'analyst@sentinelpay.test' }, time: '2026-10-20T08:30:00Z' },
      { actor: 1, action: 'KYC_APPROVE', entity: 'ACCOUNT_HOLDER', entity_id: 3, old: { kyc: 'UNVERIFIED' }, new: { kyc: 'VERIFIED' }, time: '2026-10-22T05:00:00Z' },
      { actor: 1, action: 'KYC_APPROVE', entity: 'ACCOUNT_HOLDER', entity_id: 4, old: { kyc: 'UNVERIFIED' }, new: { kyc: 'VERIFIED' }, time: '2026-10-24T07:00:00Z' },
      { actor: 1, action: 'CREATE_AGENT', entity: 'AGENT_PROFILE', entity_id: 5, old: null, new: { code: 'AG-DHK-001', district: 'Dhaka' }, time: '2026-10-21T05:00:00Z' },
      { actor: 1, action: 'WALLET_FREEZE', entity: 'WALLET', entity_id: 6, old: { status: 'ACTIVE' }, new: { status: 'FROZEN', reason: 'Confirmed fraud case CASE-2026-001' }, time: '2026-11-11T14:30:00Z' },
      { actor: 1, action: 'KYC_REJECT', entity: 'ACCOUNT_HOLDER', entity_id: 9, old: { kyc: 'UNVERIFIED' }, new: { kyc: 'REJECTED', reason: 'Forged NID document' }, time: '2026-10-29T11:00:00Z' },
      { actor: 2, action: 'CREATE_CASE', entity: 'FRAUD_CASE', entity_id: 1, old: null, new: { case_no: 'CASE-2026-001', alert_count: 3 }, time: '2026-11-06T15:00:00Z' },
      { actor: 2, action: 'CLOSE_CASE', entity: 'FRAUD_CASE', entity_id: 1, old: { status: 'INVESTIGATING' }, new: { status: 'CLOSED', outcome: 'CONFIRMED_FRAUD' }, time: '2026-11-11T12:00:00Z' },
      { actor: 2, action: 'CREATE_CASE', entity: 'FRAUD_CASE', entity_id: 2, old: null, new: { case_no: 'CASE-2026-002', alert_count: 2 }, time: '2026-11-08T10:00:00Z' },
      { actor: 2, action: 'CLOSE_CASE', entity: 'FRAUD_CASE', entity_id: 2, old: { status: 'INVESTIGATING' }, new: { status: 'CLOSED', outcome: 'FALSE_POSITIVE' }, time: '2026-11-09T16:00:00Z' },
      { actor: 2, action: 'CREATE_CASE', entity: 'FRAUD_CASE', entity_id: 3, old: null, new: { case_no: 'CASE-2026-003', alert_count: 1 }, time: '2026-11-13T09:00:00Z' },
      { actor: 2, action: 'CLOSE_CASE', entity: 'FRAUD_CASE', entity_id: 3, old: { status: 'INVESTIGATING' }, new: { status: 'CLOSED', outcome: 'INCONCLUSIVE' }, time: '2026-11-16T11:00:00Z' },
      { actor: 1, action: 'REVERSE_TRANSACTION', entity: 'TRANSACTION', entity_id: 19, old: { status: 'COMPLETED' }, new: { status: 'REVERSED', reason: 'Customer dispute' }, time: '2026-11-03T10:00:00Z' },
      { actor: 1, action: 'UPDATE_RISK_RULE', entity: 'RISK_RULE', entity_id: 1, old: { severity: 'LOW' }, new: { severity: 'MEDIUM' }, time: '2026-10-23T11:00:00Z' },
      { actor: 1, action: 'SAVE_RISK_PARAMS', entity: 'RISK_RULE', entity_id: 2, old: { limit_fraction: '0.85' }, new: { limit_fraction: '0.90' }, time: '2026-10-23T11:30:00Z' },
      { actor: 1, action: 'UPDATE_FEE_RULE', entity: 'FEE_RULE', entity_id: 1, old: { fee_flat: '4.00' }, new: { fee_flat: '5.00' }, time: '2026-10-24T09:00:00Z' },
      { actor: 1, action: 'ADD_LIMIT', entity: 'WALLET_LIMIT', entity_id: 1, old: null, new: { type: 'DAILY', max: '50000.00' }, time: '2026-10-22T04:15:00Z' },
      { actor: 1, action: 'FLOAT_LOAD', entity: 'WALLET', entity_id: 8, old: null, new: { amount: '80000.00', dest: 'AG-CTG-002' }, time: '2026-10-26T08:00:00Z' },
      { actor: 2, action: 'DISMISS_ALERT', entity: 'RISK_ALERT', entity_id: 4, old: { status: 'OPEN' }, new: { status: 'DISMISSED', reason: 'Family transfer verified' }, time: '2026-11-02T14:00:00Z' },
      { actor: 1, action: 'CREATE_AGENT', entity: 'AGENT_PROFILE', entity_id: 10, old: null, new: { code: 'AG-CTG-002', district: 'Chattogram' }, time: '2026-10-22T06:00:00Z' },
      { actor: 1, action: 'UPDATE_USER_STATUS', entity: 'USER', entity_id: 8, old: { status: 'PENDING' }, new: { status: 'ACTIVE' }, time: '2026-11-10T11:25:00Z' },
      { actor: 2, action: 'CREATE_CASE', entity: 'FRAUD_CASE', entity_id: 4, old: null, new: { case_no: 'CASE-2026-004', alert_count: 1 }, time: '2026-11-19T07:30:00Z' },
      { actor: 1, action: 'ADD_CASE_NOTE', entity: 'FRAUD_CASE', entity_id: 4, old: null, new: { note: 'Correlating regional records' }, time: '2026-11-19T14:45:00Z' },
      { actor: 1, action: 'RUN_RISK_RULES', entity: 'SYSTEM', entity_id: 0, old: null, new: { alerts_created: 3 }, time: '2026-11-20T14:00:00Z' },
    ];

    auditTemplates.forEach((log) => {
      const user = this.users.find((u) => u.user_id === log.actor);
      this.auditLogs.push({
        audit_id: this.nextAuditId++,
        actor_user_id: log.actor,
        actor_name: user ? user.name : 'System',
        action: log.action,
        entity_type: log.entity,
        entity_id: log.entity_id,
        old_values: log.old,
        new_values: log.new,
        created_at: log.time,
      });
    });
  }

  // --- Internal Transfer / Ledger Posting ---
  postTransferInternal({
    typeCode,
    userId,
    sourceRef,
    destRef,
    amount,
    fee = '0.00',
    note = '',
    customRef = null,
    date = new Date().toISOString(),
  }) {
    const srcAcct = this.resolveAccount(sourceRef);
    const dstAcct = this.resolveAccount(destRef);

    if (!srcAcct || !dstAcct) return null;

    const txnId = this.nextTxId++;
    const referenceNo =
      customRef || `TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const totalDebit = addMoney(amount, fee);

    // Create completed transaction
    const txn = {
      transaction_id: txnId,
      reference_no: referenceNo,
      type_code: typeCode,
      initiated_by_user_id: userId,
      idempotency_key: `idem-${txnId}-${Date.now()}`,
      status: 'COMPLETED',
      amount,
      fee_amount: fee,
      failure_reason: null,
      reversal_of_transaction_id: null,
      created_at: date,
      completed_at: date,
    };
    this.transactions.push(txn);

    // Transfer details
    this.transferDetails.push({
      transaction_id: txnId,
      source_account_id: srcAcct.ledger_account_id,
      source_ref: sourceRef,
      destination_account_id: dstAcct.ledger_account_id,
      dest_ref: destRef,
      note,
    });

    // Balanced Journal
    const journalId = this.nextJournalId++;
    this.ledgerJournals.push({
      journal_id: journalId,
      transaction_id: txnId,
      status: 'POSTED',
      posted_at: date,
      description: `${typeCode} ${note || ''}`.trim(),
    });

    // Debit source (amount + fee)
    this.ledgerEntries.push({
      entry_id: this.nextEntryId++,
      journal_id: journalId,
      ledger_account_id: srcAcct.ledger_account_id,
      side: 'DEBIT',
      amount: totalDebit,
      created_at: date,
    });

    // Credit destination (amount)
    this.ledgerEntries.push({
      entry_id: this.nextEntryId++,
      journal_id: journalId,
      ledger_account_id: dstAcct.ledger_account_id,
      side: 'CREDIT',
      amount,
      created_at: date,
    });

    // If fee > 0: Credit FEE_REVENUE
    if (toPaisa(fee) > 0) {
      const feeAcct = this.ledgerAccounts.find((a) => a.system_code === 'FEE_REVENUE');
      if (feeAcct) {
        this.ledgerEntries.push({
          entry_id: this.nextEntryId++,
          journal_id: journalId,
          ledger_account_id: feeAcct.ledger_account_id,
          side: 'CREDIT',
          amount: fee,
          created_at: date,
        });
      }
    }

    // Status history
    this.transactionStatusHistory.push({
      history_id: this.transactionStatusHistory.length + 1,
      transaction_id: txnId,
      from_status: 'INITIATED',
      to_status: 'COMPLETED',
      changed_at: date,
      reason: 'Transaction posted successfully',
    });

    return txn;
  }

  recordFailedTransaction({
    typeCode,
    userId,
    sourceRef,
    destRef,
    amount,
    fee = '0.00',
    failureReason,
    note = '',
    customRef = null,
    date = new Date().toISOString(),
  }) {
    const txnId = this.nextTxId++;
    const referenceNo =
      customRef || `TX-FAIL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const srcAcct = this.resolveAccount(sourceRef);
    const dstAcct = this.resolveAccount(destRef);

    const txn = {
      transaction_id: txnId,
      reference_no: referenceNo,
      type_code: typeCode,
      initiated_by_user_id: userId,
      idempotency_key: `idem-${txnId}-${Date.now()}`,
      status: 'FAILED',
      amount,
      fee_amount: fee,
      failure_reason: failureReason,
      reversal_of_transaction_id: null,
      created_at: date,
      completed_at: null,
    };
    this.transactions.push(txn);

    if (srcAcct && dstAcct) {
      this.transferDetails.push({
        transaction_id: txnId,
        source_account_id: srcAcct.ledger_account_id,
        source_ref: sourceRef,
        destination_account_id: dstAcct.ledger_account_id,
        dest_ref: destRef,
        note,
      });
    }

    this.transactionStatusHistory.push({
      history_id: this.transactionStatusHistory.length + 1,
      transaction_id: txnId,
      from_status: 'INITIATED',
      to_status: 'FAILED',
      changed_at: date,
      reason: failureReason,
    });

    return txn;
  }

  recordInitiatedTransaction({
    typeCode,
    userId,
    sourceRef,
    destRef,
    amount,
    fee = '0.00',
    note = '',
    customRef = null,
    date = new Date().toISOString(),
  }) {
    const txnId = this.nextTxId++;
    const referenceNo =
      customRef || `TX-INIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const srcAcct = this.resolveAccount(sourceRef);
    const dstAcct = this.resolveAccount(destRef);

    const txn = {
      transaction_id: txnId,
      reference_no: referenceNo,
      type_code: typeCode,
      initiated_by_user_id: userId,
      idempotency_key: `idem-${txnId}-${Date.now()}`,
      status: 'INITIATED',
      amount,
      fee_amount: fee,
      failure_reason: null,
      reversal_of_transaction_id: null,
      created_at: date,
      completed_at: null,
    };
    this.transactions.push(txn);

    if (srcAcct && dstAcct) {
      this.transferDetails.push({
        transaction_id: txnId,
        source_account_id: srcAcct.ledger_account_id,
        source_ref: sourceRef,
        destination_account_id: dstAcct.ledger_account_id,
        dest_ref: destRef,
        note,
      });
    }

    this.transactionStatusHistory.push({
      history_id: this.transactionStatusHistory.length + 1,
      transaction_id: txnId,
      from_status: null,
      to_status: 'INITIATED',
      changed_at: date,
      reason: 'Transaction initiated',
    });

    return txn;
  }

  reverseTransactionInternal(originalTxId, reason, date = new Date().toISOString(), actorUserId = 1) {
    const originalTx = this.transactions.find((t) => t.transaction_id === originalTxId);
    if (!originalTx || originalTx.status !== 'COMPLETED') return null;

    const details = this.transferDetails.find((d) => d.transaction_id === originalTxId);
    if (!details) return null;

    // Create reversing transaction
    const reversalTxId = this.nextTxId++;
    const reversalRef = `TX-REV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const reversalTx = {
      transaction_id: reversalTxId,
      reference_no: reversalRef,
      type_code: 'REVERSAL',
      initiated_by_user_id: actorUserId,
      idempotency_key: `rev-idem-${reversalTxId}`,
      status: 'COMPLETED',
      amount: originalTx.amount,
      fee_amount: '0.00',
      failure_reason: null,
      reversal_of_transaction_id: originalTxId,
      created_at: date,
      completed_at: date,
    };
    this.transactions.push(reversalTx);

    // Swap parties: debit original destination, credit original source
    this.transferDetails.push({
      transaction_id: reversalTxId,
      source_account_id: details.destination_account_id,
      source_ref: details.dest_ref,
      destination_account_id: details.source_account_id,
      dest_ref: details.source_ref,
      note: `Reversal: ${reason}`,
    });

    // Journal
    const journalId = this.nextJournalId++;
    this.ledgerJournals.push({
      journal_id: journalId,
      transaction_id: reversalTxId,
      status: 'POSTED',
      posted_at: date,
      description: `REVERSAL of ${originalTx.reference_no}: ${reason}`,
    });

    // Balanced reversal entries
    this.ledgerEntries.push({
      entry_id: this.nextEntryId++,
      journal_id: journalId,
      ledger_account_id: details.destination_account_id,
      side: 'DEBIT',
      amount: originalTx.amount,
      created_at: date,
    });

    this.ledgerEntries.push({
      entry_id: this.nextEntryId++,
      journal_id: journalId,
      ledger_account_id: details.source_account_id,
      side: 'CREDIT',
      amount: originalTx.amount,
      created_at: date,
    });

    // Update original transaction
    originalTx.status = 'REVERSED';
    originalTx.reversal_of_transaction_id = reversalTxId;

    this.transactionStatusHistory.push({
      history_id: this.transactionStatusHistory.length + 1,
      transaction_id: originalTxId,
      from_status: 'COMPLETED',
      to_status: 'REVERSED',
      changed_at: date,
      reason,
    });

    return reversalTx;
  }

  // --- Account & Balance Resolvers ---
  resolveAccount(ref) {
    if (!ref) return null;
    const cleanRef = String(ref).trim();
    return this.ledgerAccounts.find(
      (a) => a.system_code === cleanRef || this.getWalletNoForAccount(a) === cleanRef
    );
  }

  getWalletNoForAccount(account) {
    if (account.account_kind !== 'WALLET' || !account.wallet_id) return null;
    const wallet = this.wallets.find((w) => w.wallet_id === account.wallet_id);
    return wallet ? wallet.wallet_no : null;
  }

  getAccountForWallet(walletId) {
    return this.ledgerAccounts.find((a) => a.wallet_id === walletId);
  }

  /**
   * Derives balance strictly from ledger_entries:
   * sum(CREDIT) - sum(DEBIT)
   */
  getAccountBalance(ledgerAccountId) {
    const entries = this.ledgerEntries.filter((e) => e.ledger_account_id === ledgerAccountId);
    let balancePaisa = 0;
    for (const entry of entries) {
      const entryPaisa = toPaisa(entry.amount);
      if (entry.side === 'CREDIT') {
        balancePaisa += entryPaisa;
      } else {
        balancePaisa -= entryPaisa;
      }
    }
    return fromPaisa(balancePaisa);
  }

  getWalletBalance(walletId) {
    const account = this.getAccountForWallet(walletId);
    if (!account) return '0.00';
    return this.getAccountBalance(account.ledger_account_id);
  }

  getWalletLimits(walletId) {
    const limits = this.walletLimits.filter((l) => l.wallet_id === walletId);
    const balance = this.getWalletBalance(walletId);

    // Calculate daily and monthly usage for this wallet
    const acct = this.getAccountForWallet(walletId);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStartStr = todayStr.slice(0, 7) + '-01';

    let dailyUsedPaisa = 0;
    let monthlyUsedPaisa = 0;

    if (acct) {
      const outgoingTxns = this.transferDetails
        .filter((td) => td.source_account_id === acct.ledger_account_id)
        .map((td) => this.transactions.find((t) => t.transaction_id === td.transaction_id))
        .filter((t) => t && t.status === 'COMPLETED');

      for (const t of outgoingTxns) {
        const txDate = (t.completed_at || t.created_at || '').slice(0, 10);
        const amtPaisa = toPaisa(t.amount);
        if (txDate === todayStr) {
          dailyUsedPaisa += amtPaisa;
        }
        if (txDate >= monthStartStr) {
          monthlyUsedPaisa += amtPaisa;
        }
      }
    }

    const perTxnLimit = limits.find((l) => l.limit_type === 'PER_TXN')?.max_amount || '25000.00';
    const dailyLimit = limits.find((l) => l.limit_type === 'DAILY')?.max_amount || '50000.00';
    const monthlyLimit = limits.find((l) => l.limit_type === 'MONTHLY')?.max_amount || '200000.00';

    const dailyUsed = fromPaisa(dailyUsedPaisa);
    const monthlyUsed = fromPaisa(monthlyUsedPaisa);

    const dailyRemaining = subtractMoney(dailyLimit, dailyUsed);
    const monthlyRemaining = subtractMoney(monthlyLimit, monthlyUsed);

    return {
      per_txn: { max: perTxnLimit, remaining: perTxnLimit },
      daily: {
        max: dailyLimit,
        used: dailyUsed,
        remaining: compareMoney(dailyRemaining, '0.00') < 0 ? '0.00' : dailyRemaining,
      },
      monthly: {
        max: monthlyLimit,
        used: monthlyUsed,
        remaining: compareMoney(monthlyRemaining, '0.00') < 0 ? '0.00' : monthlyRemaining,
      },
    };
  }

  getStatement(walletId, { from, to, page = 1, pageSize = 10 } = {}) {
    const acct = this.getAccountForWallet(walletId);
    if (!acct) return { items: [], page: 1, pageSize: 10, total: 0 };

    // All ledger entries for this account ordered by entry_id
    const entries = this.ledgerEntries
      .filter((e) => e.ledger_account_id === acct.ledger_account_id)
      .sort((a, b) => a.entry_id - b.entry_id);

    // Compute running balance window
    let runningPaisa = 0;
    const computedRows = entries.map((entry) => {
      const entryPaisa = toPaisa(entry.amount);
      if (entry.side === 'CREDIT') {
        runningPaisa += entryPaisa;
      } else {
        runningPaisa -= entryPaisa;
      }

      const journal = this.ledgerJournals.find((j) => j.journal_id === entry.journal_id);
      const txn = journal ? this.transactions.find((t) => t.transaction_id === journal.transaction_id) : null;
      const details = txn ? this.transferDetails.find((d) => d.transaction_id === txn.transaction_id) : null;

      const isCredit = entry.side === 'CREDIT';

      return {
        entry_id: entry.entry_id,
        posted_at: journal ? journal.posted_at : entry.created_at,
        reference_no: txn ? txn.reference_no : `JRN-${journal?.journal_id}`,
        transaction_id: txn ? txn.transaction_id : null,
        txn_type: txn ? txn.type_code : 'TRANSFER',
        description: journal ? journal.description : '',
        side: entry.side,
        debit: isCredit ? null : entry.amount,
        credit: isCredit ? entry.amount : null,
        counterparty: details
          ? isCredit
            ? details.source_ref
            : details.dest_ref
          : '—',
        running_balance: fromPaisa(runningPaisa),
      };
    });

    // Filter by dates if provided
    let filtered = computedRows;
    if (from) {
      filtered = filtered.filter((r) => r.posted_at.slice(0, 10) >= from);
    }
    if (to) {
      filtered = filtered.filter((r) => r.posted_at.slice(0, 10) <= to);
    }

    // Newest first for display
    const sorted = [...filtered].reverse();

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return { items, page, pageSize, total };
  }

  getTrialBalance() {
    let totalPaisa = 0;
    const accountsWithBalance = this.ledgerAccounts.map((acct) => {
      const balStr = this.getAccountBalance(acct.ledger_account_id);
      const balPaisa = toPaisa(balStr);
      totalPaisa += balPaisa;
      return {
        ledger_account_id: acct.ledger_account_id,
        account_kind: acct.account_kind,
        system_code: acct.system_code,
        name: acct.name,
        wallet_no: this.getWalletNoForAccount(acct),
        balance: balStr,
        allow_negative: acct.allow_negative,
      };
    });

    const trialBalanceStr = fromPaisa(totalPaisa);
    return {
      accounts: accountsWithBalance,
      trial_balance: trialBalanceStr,
      is_balanced: trialBalanceStr === '0.00' || Math.abs(totalPaisa) === 0,
    };
  }

  getJournalByReference(referenceNo) {
    const txn = this.transactions.find((t) => t.reference_no === referenceNo);
    if (!txn) return null;

    const journal = this.ledgerJournals.find((j) => j.transaction_id === txn.transaction_id);
    if (!journal) return null;

    const entries = this.ledgerEntries
      .filter((e) => e.journal_id === journal.journal_id)
      .map((entry) => {
        const acct = this.ledgerAccounts.find((a) => a.ledger_account_id === entry.ledger_account_id);
        return {
          entry_id: entry.entry_id,
          account_name: acct ? acct.name : `Account #${entry.ledger_account_id}`,
          account_ref: acct ? (acct.system_code || this.getWalletNoForAccount(acct)) : '—',
          side: entry.side,
          amount: entry.amount,
          debit: entry.side === 'DEBIT' ? entry.amount : null,
          credit: entry.side === 'CREDIT' ? entry.amount : null,
        };
      });

    let totalDebitPaisa = 0;
    let totalCreditPaisa = 0;
    entries.forEach((e) => {
      if (e.side === 'DEBIT') totalDebitPaisa += toPaisa(e.amount);
      if (e.side === 'CREDIT') totalCreditPaisa += toPaisa(e.amount);
    });

    return {
      journal_id: journal.journal_id,
      transaction_id: txn.transaction_id,
      reference_no: txn.reference_no,
      status: journal.status,
      posted_at: journal.posted_at,
      description: journal.description,
      entries,
      total_debit: fromPaisa(totalDebitPaisa),
      total_credit: fromPaisa(totalCreditPaisa),
      is_balanced: totalDebitPaisa === totalCreditPaisa,
    };
  }
}

export const db = new MockDatabase();
