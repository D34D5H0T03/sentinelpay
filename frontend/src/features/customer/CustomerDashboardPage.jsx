import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send, ArrowRight, ExternalLink } from 'lucide-react';
import { useAsync } from '../../lib/useAsync';
import * as walletsApi from '../../api/wallets';
import * as txApi from '../../api/transactions';
import { toPaisa, fromPaisa } from '../../lib/money';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { formatDate } from '../../lib/format';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();

  const {
    data: wallets,
    loading: walletsLoading,
    error: walletsError,
    reload: reloadWallets,
  } = useAsync(() => walletsApi.listWallets());

  const {
    data: transactionsData,
    loading: txLoading,
    error: txError,
    reload: reloadTx,
  } = useAsync(() => txApi.list({ pageSize: 5 }));

  const loading = walletsLoading || txLoading;
  const error = walletsError || txError;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={110} />
        <Skeleton variant="table" rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        title="Could not load overview"
        onRetry={() => {
          reloadWallets();
          reloadTx();
        }}
      />
    );
  }

  // Derive total balance across all user wallets
  let totalPaisa = 0;
  if (wallets && wallets.length > 0) {
    wallets.forEach((w) => {
      totalPaisa += toPaisa(w.balance);
    });
  }
  const totalBalance = fromPaisa(totalPaisa);

  const txColumns = [
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => (
        <span className="text-12 text-text-muted">{formatDate(r.created_at)}</span>
      ),
    },
    {
      key: 'reference_no',
      header: 'Reference',
      render: (r) => (
        <span className="font-mono text-12 text-text font-medium">{r.reference_no}</span>
      ),
    },
    {
      key: 'type_code',
      header: 'Type',
      render: (r) => <span className="capitalize">{r.type_code?.replace('_', ' ').toLowerCase()}</span>,
    },
    {
      key: 'counterparty',
      header: 'Counterparty',
      render: (r) => {
        const isSender = wallets?.some((w) => w.wallet_no === r.source_ref);
        return (
          <span className="font-mono text-12 text-text-muted">
            {isSender ? r.dest_ref : r.source_ref}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => {
        const isSender = wallets?.some((w) => w.wallet_no === r.source_ref);
        return (
          <MoneyText
            amount={r.amount}
            side={isSender ? 'DEBIT' : 'CREDIT'}
            weight="medium"
          />
        );
      },
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
      {/* Top Banner: Total Balance + Send Money Primary Action */}
      <Card padding={false} className="p-6 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-12 font-medium text-text-muted uppercase tracking-wider">
              Total available balance
            </p>
            <div className="mt-1">
              <MoneyText amount={totalBalance} size="28" weight="semibold" />
            </div>
            <p className="text-12 text-text-muted mt-1">
              Derived from {wallets?.length || 0} active {wallets?.length === 1 ? 'wallet' : 'wallets'}
            </p>
          </div>

          <div className="shrink-0">
            <Link to="/send">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <Send size={16} />
                <span>Send money</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Wallets Compact List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-15 font-semibold text-text">Your wallets</h2>
          <Link
            to="/wallets"
            className="text-12 font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>Manage wallets</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets && wallets.map((wallet) => (
            <Card key={wallet.wallet_id} className="hover:border-border-strong transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-14 font-semibold text-text block">{wallet.label}</span>
                  <span className="text-12 font-mono text-text-muted mt-0.5 block">{wallet.wallet_no}</span>
                </div>
                <StatusBadge status={wallet.status} />
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-baseline justify-between">
                <div>
                  <span className="text-12 text-text-muted block">Balance</span>
                  <MoneyText amount={wallet.balance} size="20" weight="semibold" />
                </div>
                <Link
                  to={`/wallets/${wallet.wallet_id}`}
                  className="text-12 font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Statement</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-15 font-semibold text-text">Recent transactions</h2>
          <Link
            to="/transactions"
            className="text-12 font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <DataTable
          columns={txColumns}
          data={transactionsData?.items || []}
          keyField="transaction_id"
          onRowClick={(row) => navigate(`/transactions/${row.transaction_id}`)}
          emptyMessage="No recent transactions found."
        />
      </div>
    </div>
  );
}
