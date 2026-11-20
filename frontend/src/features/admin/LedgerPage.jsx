import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Search, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatMoney, formatDate } from '../../lib/format';
import { toPaisa } from '../../lib/money';

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState('accounts');

  // Journal Lookup state
  const [journalRef, setJournalRef] = useState('TX-DEMO-003');
  const [journalData, setJournalData] = useState(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState('');

  // Load Accounts
  const {
    data: accounts,
    loading: accountsLoading,
    error: accountsError,
    reload: reloadAccounts,
  } = useAsync(() => adminApi.ledgerAccounts(), []);

  // Load Trial Balance
  const {
    data: tbData,
    loading: tbLoading,
    error: tbError,
    reload: reloadTb,
  } = useAsync(() => adminApi.trialBalance(), []);

  const handleJournalLookup = async (e) => {
    if (e) e.preventDefault();
    if (!journalRef.trim()) return;
    setJournalLoading(true);
    setJournalError('');
    setJournalData(null);
    try {
      const data = await adminApi.getJournal(journalRef.trim());
      if (!data) {
        setJournalError('No ledger journal found for this reference.');
      } else {
        setJournalData(data);
      }
    } catch (err) {
      setJournalError(err.message || 'Lookup failed.');
    } finally {
      setJournalLoading(false);
    }
  };

  // Perform initial lookup on mount if on lookup tab
  React.useEffect(() => {
    if (activeTab === 'journal' && !journalData && !journalLoading) {
      handleJournalLookup();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'accounts', label: 'Ledger accounts', count: accounts?.length },
    { id: 'trial_balance', label: 'Trial balance' },
    { id: 'journal', label: 'Journal lookup' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Double-entry general ledger"
        subtitle="Immutable append-only financial records underpinning all SentinelPay wallets"
      />

      {/* Mandatory Immutable Note */}
      <div className="p-3.5 rounded-[6px] bg-surface-subtle border border-border text-12 text-text flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-primary shrink-0" />
          <span className="font-medium">
            Ledger entries are append-only. They cannot be edited or deleted.
          </span>
        </div>
        <span className="text-text-muted">Database Trigger Enforced</span>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Accounts */}
      {activeTab === 'accounts' && (
        <Card title="Ledger chart of accounts">
          {accountsLoading ? (
            <Skeleton variant="table" rows={6} />
          ) : accountsError ? (
            <ErrorState error={accountsError} onRetry={reloadAccounts} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-14 border-collapse">
                <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Account ID</th>
                    <th className="px-4 py-2.5">Kind</th>
                    <th className="px-4 py-2.5">System code / Wallet</th>
                    <th className="px-4 py-2.5">Account name</th>
                    <th className="px-4 py-2.5 text-right">Derived balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts
                    ?.sort((a, b) => {
                      if (a.account_kind === 'SYSTEM' && b.account_kind !== 'SYSTEM') return -1;
                      if (b.account_kind === 'SYSTEM' && a.account_kind !== 'SYSTEM') return 1;
                      return a.ledger_account_id - b.ledger_account_id;
                    })
                    .map((acct) => (
                      <tr key={acct.ledger_account_id} className="hover:bg-surface-subtle">
                        <td className="px-4 py-3 font-mono text-12 text-text-muted">
                          #{acct.ledger_account_id}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-1.5 py-0.5 rounded-[4px] text-12 font-medium ${
                              acct.account_kind === 'SYSTEM'
                                ? 'bg-primary-subtle text-primary'
                                : 'bg-neutral-bg text-text-muted'
                            }`}
                          >
                            {acct.account_kind}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-12 text-text">
                          {acct.system_code || acct.wallet_no || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-text">{acct.name}</td>
                        <td className="px-4 py-3 text-right">
                          <MoneyText
                            amount={acct.balance}
                            side={toPaisa(acct.balance) < 0 ? 'DEBIT' : 'CREDIT'}
                            weight="semibold"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Trial Balance */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-4">
          <Card title="Trial balance verification">
            {tbLoading ? (
              <Skeleton variant="rect" height={160} />
            ) : tbError ? (
              <ErrorState error={tbError} onRetry={reloadTb} />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-surface-subtle border border-border rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
                      Net trial balance sum
                    </span>
                    <span className="text-28 font-semibold text-text tabular-nums mt-0.5 block">
                      {formatMoney(tbData?.trial_balance)}
                    </span>
                    <span className="text-12 text-text-muted">
                      Sum of all wallet and system account balances
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={tbData?.is_balanced ? 'BALANCED' : 'UNBALANCED'}
                      label={tbData?.is_balanced ? 'Ledger balanced' : 'Imbalance'}
                    />
                  </div>
                </div>

                {/* Individual balances in debit/credit breakdown */}
                <div className="overflow-x-auto border border-border rounded-[6px]">
                  <table className="w-full text-left text-14 border-collapse">
                    <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                      <tr>
                        <th className="px-4 py-2.5">Account</th>
                        <th className="px-4 py-2.5">Identifier</th>
                        <th className="px-4 py-2.5 text-right">Debit balance</th>
                        <th className="px-4 py-2.5 text-right">Credit balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tbData?.accounts?.map((acc) => {
                        const balPaisa = toPaisa(acc.balance);
                        const isDebit = balPaisa < 0;
                        const isCredit = balPaisa > 0;

                        return (
                          <tr key={acc.ledger_account_id} className="hover:bg-surface-subtle">
                            <td className="px-4 py-2.5 font-medium text-text">{acc.name}</td>
                            <td className="px-4 py-2.5 font-mono text-12 text-text-muted">
                              {acc.system_code || acc.wallet_no}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-text">
                              {isDebit ? formatMoney(acc.balance) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-success font-medium">
                              {isCredit ? formatMoney(acc.balance) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-surface-subtle border-t-2 border-border font-semibold text-text">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-14">
                          Net trial balance total
                        </td>
                        <td colSpan={2} className="px-4 py-3 text-right tabular-nums font-mono text-15">
                          {formatMoney(tbData?.trial_balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Journal Lookup */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <Card title="Journal transaction lookup">
            <form onSubmit={handleJournalLookup} className="flex items-end gap-3 max-w-md mb-6">
              <Input
                label="Transaction reference"
                value={journalRef}
                onChange={(e) => setJournalRef(e.target.value)}
                placeholder="TX-DEMO-001"
                className="flex-1"
                required
              />
              <Button
                type="submit"
                variant="primary"
                loading={journalLoading}
                loadingText="Searching..."
              >
                <Search size={14} />
                <span>Lookup</span>
              </Button>
            </form>

            {journalError && (
              <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{journalError}</span>
              </div>
            )}

            {journalData && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-15 font-semibold text-text">
                      Journal #{journalData.journal_id}: {journalData.description}
                    </h3>
                    <p className="text-12 text-text-muted mt-0.5">
                      Posted: {formatDate(journalData.posted_at)} · Ref: <span className="font-mono">{journalData.reference_no}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={journalData.is_balanced ? 'BALANCED' : 'UNBALANCED'}
                      label={journalData.is_balanced ? 'Journal balanced' : 'Unbalanced journal'}
                    />
                  </div>
                </div>

                <div className="border border-border rounded-[6px] overflow-hidden">
                  <table className="w-full text-left text-14 border-collapse">
                    <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                      <tr>
                        <th className="px-4 py-2.5">Account</th>
                        <th className="px-4 py-2.5">Identifier</th>
                        <th className="px-4 py-2.5 text-right">Debit (৳)</th>
                        <th className="px-4 py-2.5 text-right">Credit (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {journalData.entries?.map((entry) => (
                        <tr key={entry.entry_id} className="hover:bg-surface-subtle">
                          <td className="px-4 py-2.5 font-medium text-text">{entry.account_name}</td>
                          <td className="px-4 py-2.5 font-mono text-12 text-text-muted">{entry.account_ref}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-text">
                            {entry.debit ? formatMoney(entry.debit) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-success font-medium">
                            {entry.credit ? formatMoney(entry.credit) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-subtle border-t-2 border-border font-semibold text-text">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-14">
                          Totals
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                          {formatMoney(journalData.total_debit)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-mono text-success">
                          {formatMoney(journalData.total_credit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
