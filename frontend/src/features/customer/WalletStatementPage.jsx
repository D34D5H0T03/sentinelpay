import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import * as walletsApi from '../../api/wallets';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { formatDate, formatMoney } from '../../lib/format';
import { toPaisa } from '../../lib/money';

export default function WalletStatementPage() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const {
    data: wallet,
    loading: walletLoading,
    error: walletError,
    reload: reloadWallet,
  } = useAsync(() => walletsApi.getWallet(id), [id]);

  const {
    data: statement,
    loading: statementLoading,
    error: statementError,
    reload: reloadStatement,
  } = useAsync(
    () => walletsApi.getStatement(id, { from, to, page, pageSize: 10 }),
    [id, page, from, to]
  );

  const loading = walletLoading || statementLoading;
  const error = walletError || statementError;

  if (loading && !statement) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={140} />
        <Skeleton variant="table" rows={6} />
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <ErrorState
        error={error}
        title="Could not load wallet statement"
        onRetry={() => {
          reloadWallet();
          reloadStatement();
        }}
      />
    );
  }

  const limits = wallet?.limits;
  const dailyPct = limits
    ? Math.min(100, Math.round((toPaisa(limits.daily.used) / toPaisa(limits.daily.max)) * 100))
    : 0;
  const monthlyPct = limits
    ? Math.min(100, Math.round((toPaisa(limits.monthly.used) / toPaisa(limits.monthly.max)) * 100))
    : 0;

  const columns = [
    {
      key: 'posted_at',
      header: 'Date & Time',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.posted_at)}</span>,
    },
    {
      key: 'reference_no',
      header: 'Reference',
      render: (r) => (
        <Link
          to={r.transaction_id ? `/transactions/${r.transaction_id}` : '#'}
          className="font-mono text-12 text-primary hover:underline font-medium"
        >
          {r.reference_no}
        </Link>
      ),
    },
    {
      key: 'txn_type',
      header: 'Type',
      render: (r) => <span className="capitalize">{r.txn_type?.replace('_', ' ').toLowerCase()}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => <span className="text-14 text-text">{r.description || '—'}</span>,
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      render: (r) => r.debit ? <MoneyText amount={r.debit} side="DEBIT" /> : '—',
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      render: (r) => r.credit ? <MoneyText amount={r.credit} side="CREDIT" /> : '—',
    },
    {
      key: 'running_balance',
      header: 'Running balance',
      align: 'right',
      render: (r) => <MoneyText amount={r.running_balance} weight="medium" />,
    },
  ];

  const handleResetFilters = () => {
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${wallet?.label || 'Wallet'} statement`}
        subtitle="Historical running statement derived strictly from double-entry ledger entries"
        backTo="/dashboard"
        backLabel="Back to Overview"
      />

      {/* Header Info & Limits Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wallet Key Data Card */}
        <Card className="lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
                {wallet?.label}
              </span>
              <span className="text-14 font-mono text-text block mt-0.5">{wallet?.wallet_no}</span>
            </div>
            <StatusBadge status={wallet?.status} />
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <span className="text-12 text-text-muted block">Current derived balance</span>
            <MoneyText amount={wallet?.balance} size="28" weight="semibold" className="mt-1" />
          </div>
        </Card>

        {/* Limits Summary Card with simple thin bars */}
        <Card title="Wallet limits" subtitle="Limits set by verification tier" className="lg:col-span-2">
          {limits && (
            <div className="space-y-3.5">
              {/* Per transaction */}
              <div>
                <div className="flex items-center justify-between text-12 mb-1">
                  <span className="font-medium text-text">Per-transaction limit</span>
                  <span className="text-text-muted tabular-nums">Max {formatMoney(limits.per_txn.max)}</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Daily limit */}
              <div>
                <div className="flex items-center justify-between text-12 mb-1">
                  <span className="font-medium text-text">Daily limit</span>
                  <span className="text-text-muted tabular-nums">
                    Used {formatMoney(limits.daily.used)} of {formatMoney(limits.daily.max)} ({limits.daily.remaining} remaining)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-150" style={{ width: `${dailyPct}%` }} />
                </div>
              </div>

              {/* Monthly limit */}
              <div>
                <div className="flex items-center justify-between text-12 mb-1">
                  <span className="font-medium text-text">Monthly limit</span>
                  <span className="text-text-muted tabular-nums">
                    Used {formatMoney(limits.monthly.used)} of {formatMoney(limits.monthly.max)} ({limits.monthly.remaining} remaining)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-150" style={{ width: `${monthlyPct}%` }} />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Filter Bar */}
      <FilterBar onReset={handleResetFilters}>
        <div className="flex items-center gap-2">
          <Input
            label="From date"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="w-36"
          />
          <Input
            label="To date"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-36"
          />
        </div>
      </FilterBar>

      {/* Statement Table */}
      <DataTable
        columns={columns}
        data={statement?.items || []}
        keyField="entry_id"
        pagination={statement}
        onPageChange={(newPage) => setPage(newPage)}
        emptyMessage="No statement entries found for the selected period."
      />
    </div>
  );
}
