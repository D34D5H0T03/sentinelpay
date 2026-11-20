import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as txApi from '../../api/transactions';
import * as walletsApi from '../../api/wallets';
import { formatDate } from '../../lib/format';
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from '../../lib/constants';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [walletId, setWalletId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: wallets } = useAsync(() => walletsApi.listWallets());

  const {
    data: txResponse,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      txApi.list({
        walletId: walletId || undefined,
        type: type || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
        page,
        pageSize: 10,
      }),
    [page, walletId, type, status, from, to, search]
  );

  const handleResetFilters = () => {
    setWalletId('');
    setType('');
    setStatus('');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
  };

  const columns = [
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
      header: 'Type',
      render: (r) => (
        <span>{TRANSACTION_TYPE_LABELS[r.type_code] || r.type_code}</span>
      ),
    },
    {
      key: 'counterparty',
      header: 'Counterparty',
      render: (r) => {
        const isSender = wallets?.some((w) => w.wallet_no === r.source_ref);
        const counterparty = isSender ? r.dest_ref : r.source_ref;
        return <span className="font-mono text-12 text-text-muted">{counterparty || '—'}</span>;
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
      <PageHeader
        title="Transactions"
        subtitle="Full history of mobile money transfers and wallet activity"
      />

      <FilterBar onReset={handleResetFilters}>
        <Input
          placeholder="Search by reference or wallet..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-48 sm:w-60"
        />

        <Select
          value={walletId}
          onChange={(e) => {
            setWalletId(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All wallets</option>
          {wallets?.map((w) => (
            <option key={w.wallet_id} value={w.wallet_id}>
              {w.label} ({w.wallet_no})
            </option>
          ))}
        </Select>

        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All types</option>
          {Object.entries(TRANSACTION_TYPES).map(([k, v]) => (
            <option key={k} value={v}>
              {TRANSACTION_TYPE_LABELS[v] || v}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-32"
        >
          <option value="">All statuses</option>
          {Object.entries(TRANSACTION_STATUSES).map(([k, v]) => (
            <option key={k} value={v}>
              {v}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          className="w-36"
        />

        <Input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          className="w-36"
        />
      </FilterBar>

      {loading && !txResponse ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load transactions"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={txResponse?.items || []}
          keyField="transaction_id"
          onRowClick={(row) => navigate(`/transactions/${row.transaction_id}`)}
          pagination={txResponse}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No transactions matched your criteria."
        />
      )}
    </div>
  );
}
