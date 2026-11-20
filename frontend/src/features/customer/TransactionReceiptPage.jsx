import React from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import Timeline from '../../components/ui/Timeline';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as txApi from '../../api/transactions';
import { formatDate } from '../../lib/format';
import { TRANSACTION_TYPE_LABELS } from '../../lib/constants';
import { getErrorMessage } from '../../lib/errors';

export default function TransactionReceiptPage() {
  const { id } = useParams();

  const {
    data: txn,
    loading,
    error,
    reload,
  } = useAsync(() => txApi.get(id), [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton variant="text" rows={2} />
        <Skeleton variant="rect" height={320} />
      </div>
    );
  }

  if (error || !txn) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorState
          error={error}
          title="Transaction receipt not found"
          onRetry={reload}
        />
      </div>
    );
  }

  const isFailed = txn.status === 'FAILED';
  const isReversed = txn.status === 'REVERSED';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Transaction receipt"
        subtitle={`Reference: ${txn.reference_no}`}
        backTo="/transactions"
        backLabel="Back to Transactions"
      />

      {/* Main Receipt Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
              {TRANSACTION_TYPE_LABELS[txn.type_code] || txn.type_code}
            </span>
            <span className="text-14 font-mono font-medium text-text">{txn.reference_no}</span>
          </div>
          <StatusBadge status={txn.status} />
        </div>

        {/* Amount display */}
        <div className="py-6 text-center border-b border-border">
          <span className="text-12 text-text-muted block">Transfer amount</span>
          <MoneyText amount={txn.amount} size="28" weight="semibold" className="mt-1" />
          {txn.fee_amount && (
            <span className="text-12 text-text-muted block mt-1">
              Fee: ৳ {txn.fee_amount}
            </span>
          )}
        </div>

        {/* Failure reason callout if failed */}
        {isFailed && (
          <div className="my-4 p-3.5 rounded-[6px] bg-danger-bg border border-danger/30 text-14 text-danger">
            <span className="font-semibold block mb-0.5">Failure reason</span>
            <span>{getErrorMessage(txn.failure_reason)}</span>
          </div>
        )}

        {/* Link to reversal if reversed */}
        {isReversed && txn.reversal_transaction && (
          <div className="my-4 p-3.5 rounded-[6px] bg-neutral-bg border border-border text-14 text-text flex items-center justify-between">
            <div>
              <span className="font-semibold block">This transaction has been reversed</span>
              <span className="text-12 text-text-muted">
                Reversal reference: {txn.reversal_transaction.reference_no}
              </span>
            </div>
            <Link
              to={`/transactions/${txn.reversal_transaction.transaction_id}`}
              className="text-12 font-medium text-primary hover:underline"
            >
              View reversal
            </Link>
          </div>
        )}

        {/* Transaction Parties & Metadata */}
        <KeyValue className="py-2">
          <KeyValueRow
            label="Sender"
            value={txn.source_holder ? `${txn.source_holder} (${txn.source_ref})` : txn.source_ref}
          />
          <KeyValueRow
            label="Recipient"
            value={txn.dest_holder ? `${txn.dest_holder} (${txn.dest_ref})` : txn.dest_ref}
          />
          <KeyValueRow
            label="Initiated at"
            value={formatDate(txn.created_at)}
          />
          {txn.completed_at && (
            <KeyValueRow
              label="Completed at"
              value={formatDate(txn.completed_at)}
            />
          )}
          {txn.note && (
            <KeyValueRow
              label="Note"
              value={txn.note}
            />
          )}
        </KeyValue>
      </Card>

      {/* Status History Timeline */}
      <Card title="Status timeline">
        <Timeline events={txn.history || []} />
      </Card>
    </div>
  );
}
