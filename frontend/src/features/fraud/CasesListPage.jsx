import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as fraudApi from '../../api/fraud';
import { formatDate } from '../../lib/format';
import { CASE_STATUSES, CASE_OUTCOMES, CASE_OUTCOME_LABELS } from '../../lib/constants';

export default function CasesListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [outcome, setOutcome] = useState('');

  const {
    data: casesData,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      fraudApi.listCases({
        status: status || undefined,
        outcome: outcome || undefined,
        page,
        pageSize: 10,
      }),
    [page, status, outcome]
  );

  const handleResetFilters = () => {
    setStatus('');
    setOutcome('');
    setPage(1);
  };

  const columns = [
    {
      key: 'case_no',
      header: 'Case number',
      render: (r) => <span className="font-mono text-12 font-medium text-text">{r.case_no}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (r) =>
        r.outcome ? (
          <span className="text-12 font-medium text-text">
            {CASE_OUTCOME_LABELS[r.outcome] || r.outcome}
          </span>
        ) : (
          <span className="text-12 text-text-muted">—</span>
        ),
    },
    {
      key: 'assigned_analyst_name',
      header: 'Assigned analyst',
      render: (r) => <span className="text-14 text-text">{r.assigned_analyst_name}</span>,
    },
    {
      key: 'alert_count',
      header: 'Alerts',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-[4px] bg-neutral-bg text-12 font-medium text-text">
          {r.alert_count}
        </span>
      ),
    },
    {
      key: 'opened_at',
      header: 'Opened at',
      align: 'right',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.opened_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud cases"
        subtitle="Analyst investigation dossiers grouping alerts by suspected pattern"
      />

      <FilterBar onReset={handleResetFilters}>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All statuses</option>
          {Object.entries(CASE_STATUSES).map(([k, v]) => (
            <option key={k} value={v}>
              {v}
            </option>
          ))}
        </Select>

        <Select
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All outcomes</option>
          {Object.entries(CASE_OUTCOMES).map(([k, v]) => (
            <option key={k} value={v}>
              {CASE_OUTCOME_LABELS[v] || v}
            </option>
          ))}
        </Select>
      </FilterBar>

      {loading && !casesData ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load cases"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={casesData?.items || []}
          keyField="case_id"
          onRowClick={(row) => navigate(`/fraud/cases/${row.case_id}`)}
          pagination={casesData}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No fraud cases found matching filters."
        />
      )}
    </div>
  );
}
