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
import * as agentApi from '../../api/agent';
import { formatDate } from '../../lib/format';
import { TRANSACTION_STATUSES } from '../../lib/constants';

export default function AgentHistoryPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const {
    data: historyData,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      agentApi.history({
        type: type || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 10,
      }),
    [page, type, status, from, to]
  );

  const handleResetFilters = () => {
    setType('');
    setStatus('');
    setFrom('');
    setTo('');
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
      header: 'Operation',
      render: (r) => (
        <span className="font-medium text-text">
          {r.type_code === 'CASH_IN' ? 'Cash in' : r.type_code === 'CASH_OUT' ? 'Cash out' : r.type_code}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer / Counterparty',
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
      key: 'fee_amount',
      header: 'Fee',
      align: 'right',
      render: (r) => <MoneyText amount={r.fee_amount || '0.00'} />,
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
        title="Outlet history"
        subtitle="Complete record of cash-in, cash-out, and float operations"
        backTo="/agent"
        backLabel="Back to Outlet"
      />

      <FilterBar onReset={handleResetFilters}>
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All operations</option>
          <option value="CASH_IN">Cash in</option>
          <option value="CASH_OUT">Cash out</option>
          <option value="FLOAT_LOAD">Float load</option>
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

      {loading && !historyData ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load outlet history"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={historyData?.items || []}
          keyField="transaction_id"
          onRowClick={(row) => navigate(`/transactions/${row.transaction_id}`)}
          pagination={historyData}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No outlet transactions match the filters."
        />
      )}
    </div>
  );
}
