import React, { useState } from 'react';
import { RotateCcw, Eye } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Textarea from '../../components/ui/Textarea';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import * as txApi from '../../api/transactions';
import { formatDate } from '../../lib/format';
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from '../../lib/constants';

export default function AdminTransactionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.roles?.includes('ADMIN');

  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  // Detail Modal state
  const [detailTxId, setDetailTxId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reverse Dialog state
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [confirmReverseOpen, setConfirmReverseOpen] = useState(false);
  const [reversing, setReversing] = useState(false);

  const {
    data: txResponse,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      adminApi.listAllTransactions({
        type: type || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
        page,
        pageSize: 10,
      }),
    [page, type, status, from, to, search]
  );

  const handleOpenDetail = async (tx) => {
    setDetailTxId(tx.transaction_id);
    setDetailLoading(true);
    try {
      const data = await txApi.get(tx.transaction_id);
      setDetailData(data);
    } catch (err) {
      showToast(err.message || 'Could not load details.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenReverse = (tx) => {
    setReverseTarget(tx);
    setReverseReason('');
  };

  const handleProceedReverse = (e) => {
    e.preventDefault();
    if (!reverseReason.trim()) return;
    setConfirmReverseOpen(true);
  };

  const handleExecuteReverse = async () => {
    if (!reverseTarget) return;
    setReversing(true);
    try {
      const rev = await adminApi.reverseTransaction(reverseTarget.transaction_id, {
        reason: reverseReason.trim(),
      });
      showToast(`Transaction reversed. Reversal reference: ${rev.reference_no}`, 'success');
      setConfirmReverseOpen(false);
      setReverseTarget(null);
      if (detailTxId === reverseTarget.transaction_id) {
        setDetailTxId(null);
      }
      reload();
    } catch (err) {
      showToast(err.message || 'Could not reverse transaction.', 'error');
    } finally {
      setReversing(false);
    }
  };

  const handleResetFilters = () => {
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
      key: 'source_ref',
      header: 'Source party',
      render: (r) => <span className="font-mono text-12 text-text">{r.source_ref}</span>,
    },
    {
      key: 'dest_ref',
      header: 'Destination party',
      render: (r) => <span className="font-mono text-12 text-text">{r.dest_ref}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <MoneyText amount={r.amount} weight="semibold" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetail(r)}
            title="Inspect receipt"
          >
            <Eye size={14} />
          </Button>

          {isAdmin && r.status === 'COMPLETED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenReverse(r)}
              className="text-danger hover:text-danger"
              title="Reverse transaction"
            >
              <RotateCcw size={14} />
              <span>Reverse</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction ledger audit"
        subtitle="Global platform transaction log with reversal auditing capabilities"
      />

      <FilterBar onReset={handleResetFilters}>
        <Input
          placeholder="Search by reference or wallet..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-56 sm:w-72"
        />

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
          onRowClick={(row) => handleOpenDetail(row)}
          pagination={txResponse}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No transactions found matching criteria."
        />
      )}

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={Boolean(detailTxId)}
        onClose={() => setDetailTxId(null)}
        title="Transaction details"
        maxWidth="max-w-xl"
      >
        {detailLoading || !detailData ? (
          <Skeleton variant="text" rows={5} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-mono text-14 font-semibold text-text">{detailData.reference_no}</span>
              <StatusBadge status={detailData.status} />
            </div>

            <div className="py-2 text-center">
              <span className="text-12 text-text-muted block">Transaction amount</span>
              <MoneyText amount={detailData.amount} size="28" weight="semibold" className="mt-1" />
              {detailData.fee_amount && (
                <span className="text-12 text-text-muted block mt-0.5">
                  Fee: ৳ {detailData.fee_amount}
                </span>
              )}
            </div>

            <KeyValue>
              <KeyValueRow label="Operation type" value={TRANSACTION_TYPE_LABELS[detailData.type_code] || detailData.type_code} />
              <KeyValueRow label="Source party" value={`${detailData.source_holder} (${detailData.source_ref})`} />
              <KeyValueRow label="Destination party" value={`${detailData.dest_holder} (${detailData.dest_ref})`} />
              <KeyValueRow label="Initiated at" value={formatDate(detailData.created_at)} />
              <KeyValueRow label="Completed at" value={formatDate(detailData.completed_at)} />
              {detailData.note && <KeyValueRow label="Note" value={detailData.note} />}
              {detailData.failure_reason && (
                <KeyValueRow
                  label="Failure reason"
                  value={<span className="text-danger font-medium">{detailData.failure_reason}</span>}
                />
              )}
            </KeyValue>

            <div className="pt-2 flex justify-between items-center border-t border-border">
              {isAdmin && detailData.status === 'COMPLETED' ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleOpenReverse(detailData)}
                >
                  <RotateCcw size={14} />
                  <span>Reverse transaction</span>
                </Button>
              ) : <div />}
              <Button variant="secondary" onClick={() => setDetailTxId(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reversal Step 1: Reason Modal */}
      <Modal
        isOpen={Boolean(reverseTarget) && !confirmReverseOpen}
        onClose={() => setReverseTarget(null)}
        title={`Reverse transaction: ${reverseTarget?.reference_no}`}
      >
        <form onSubmit={handleProceedReverse} className="space-y-4">
          <p className="text-14 text-text-muted">
            Reversals post an immutable contra-journal to debit the destination account and refund the source. Provide a clear justification.
          </p>

          <Textarea
            label="Reversal justification reason"
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder="e.g. Customer dispute, misrouted transfer..."
            rows={3}
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReverseTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              disabled={!reverseReason.trim()}
            >
              Continue to confirm
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reversal Step 2: Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmReverseOpen}
        onClose={() => setConfirmReverseOpen(false)}
        onConfirm={handleExecuteReverse}
        title="Confirm permanent transaction reversal"
        message={`Are you sure you want to reverse transfer ${reverseTarget?.reference_no} (৳ ${reverseTarget?.amount})? This will immediately post reversal entries into the ledger.`}
        confirmText="Confirm reversal"
        tone="danger"
        loading={reversing}
        loadingText="Posting reversal..."
      />
    </div>
  );
}
