import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as agentApi from '../../api/agent';
import { formatDate } from '../../lib/format';

export default function AgentDashboardPage() {
  const navigate = useNavigate();

  const {
    data: dashData,
    loading,
    error,
    reload,
  } = useAsync(() => agentApi.dashboard());

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={130} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
        </div>
        <Skeleton variant="table" rows={4} />
      </div>
    );
  }

  if (error || !dashData) {
    return (
      <ErrorState
        error={error}
        title="Could not load agent dashboard"
        onRetry={reload}
      />
    );
  }

  const txColumns = [
    {
      key: 'created_at',
      header: 'Date & Time',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'reference_no',
      header: 'Reference',
      render: (r) => (
        <span className="font-mono text-12 font-medium text-text">{r.reference_no}</span>
      ),
    },
    {
      key: 'type_code',
      header: 'Operation',
      render: (r) => (
        <span className="font-medium text-text">
          {r.type_code === 'CASH_IN' ? 'Cash in' : r.type_code === 'CASH_OUT' ? 'Cash out' : r.type_code}
        </span>
      ),
    },
    {
      key: 'counterparty',
      header: 'Customer',
      render: (r) => {
        const counterparty = r.type_code === 'CASH_IN' ? r.dest_ref : r.source_ref;
        return <span className="font-mono text-12 text-text-muted">{counterparty}</span>;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <MoneyText
          amount={r.amount}
          side={r.type_code === 'CASH_OUT' ? 'CREDIT' : 'DEBIT'}
          weight="medium"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent outlet counter"
        subtitle={`Outlet: ${dashData.float_wallet?.wallet_no} — Float balance management`}
      />

      {/* Primary Float Balance Card with Action Buttons */}
      <Card padding={false} className="p-6 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
              Available agent float
            </span>
            <div className="mt-1">
              <MoneyText amount={dashData.float_balance} size="28" weight="semibold" />
            </div>
            <p className="text-12 text-text-muted mt-1">
              Float is debited for cash-in and credited during cash-out
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/agent/cash-in">
              <Button variant="primary" size="md">
                <ArrowDownRight size={16} />
                <span>Cash in</span>
              </Button>
            </Link>
            <Link to="/agent/cash-out">
              <Button variant="secondary" size="md">
                <ArrowUpRight size={16} />
                <span>Cash out</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Today's Metrics (Max 4 stat cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Today cash in
          </span>
          <div className="mt-1">
            <MoneyText amount={dashData.today_cash_in} size="20" weight="semibold" />
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">Disbursed to customers</span>
        </Card>

        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Today cash out
          </span>
          <div className="mt-1">
            <MoneyText amount={dashData.today_cash_out} size="20" weight="semibold" />
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">Received into float</span>
        </Card>

        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Today operations
          </span>
          <div className="mt-1 text-20 font-semibold text-text tabular-nums">
            {dashData.today_txn_count}
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">Completed transfers</span>
        </Card>
      </div>

      {/* Recent Counter Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-15 font-semibold text-text">Recent outlet transactions</h2>
          <Link
            to="/agent/history"
            className="text-12 font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>Full history</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <DataTable
          columns={txColumns}
          data={dashData.recent_transactions || []}
          keyField="transaction_id"
          onRowClick={(row) => navigate(`/transactions/${row.transaction_id}`)}
          emptyMessage="No recent transactions at this outlet."
        />
      </div>
    </div>
  );
}
