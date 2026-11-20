import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, XCircle, FolderPlus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import DataTable from '../../components/ui/DataTable';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as fraudApi from '../../api/fraud';
import { formatDate } from '../../lib/format';
import { RISK_RULE_LABELS } from '../../lib/constants';

export default function AlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: alert,
    loading,
    error,
    reload,
  } = useAsync(() => fraudApi.getAlert(id), [id]);

  // Dismiss modal state
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = async (e) => {
    e.preventDefault();
    if (!dismissReason.trim()) return;

    setDismissing(true);
    try {
      await fraudApi.updateAlert(id, { status: 'DISMISSED', reason: dismissReason.trim() });
      showToast('Alert dismissed.', 'info');
      setDismissOpen(false);
      reload();
    } catch (err) {
      showToast(err.message || 'Could not dismiss alert.', 'error');
    } finally {
      setDismissing(false);
    }
  };

  const handleCreateCase = async () => {
    try {
      const newCase = await fraudApi.createCase({ alertIds: [Number(id)] });
      showToast(`Case ${newCase.case_no} created.`, 'success');
      navigate(`/fraud/cases/${newCase.case_id}`);
    } catch (err) {
      showToast(err.message || 'Could not create case.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton variant="text" rows={2} />
        <Skeleton variant="rect" height={200} />
        <Skeleton variant="table" rows={4} />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <ErrorState
        error={error}
        title="Could not load alert details"
        onRetry={reload}
      />
    );
  }

  const windowColumns = [
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
      render: (r) => <span className="capitalize">{r.type_code?.replace('_', ' ').toLowerCase()}</span>,
    },
    {
      key: 'counterparty',
      header: 'Counterparty',
      render: (r) => {
        const isSource = r.source_ref === alert.wallet_no;
        return <span className="font-mono text-12 text-text-muted">{isSource ? r.dest_ref : r.source_ref}</span>;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => {
        const isSource = r.source_ref === alert.wallet_no;
        return <MoneyText amount={r.amount} side={isSource ? 'DEBIT' : 'CREDIT'} weight="medium" />;
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Alert #${alert.alert_id}: ${RISK_RULE_LABELS[alert.rule_code] || alert.rule_code}`}
        subtitle="Automated risk rule detection detail"
        backTo="/fraud/alerts"
        backLabel="Back to Alerts"
        action={
          <div className="flex items-center gap-2">
            {alert.status === 'OPEN' && (
              <>
                <Button variant="secondary" onClick={() => setDismissOpen(true)}>
                  <XCircle size={16} />
                  <span>Dismiss</span>
                </Button>
                <Button variant="primary" onClick={handleCreateCase}>
                  <FolderPlus size={16} />
                  <span>Create case</span>
                </Button>
              </>
            )}
            {alert.case_id && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/fraud/cases/${alert.case_id}`)}
              >
                View linked case
              </Button>
            )}
          </div>
        }
      />

      {/* Role Reminder Callout */}
      <div className="p-3.5 rounded-[6px] bg-info-bg border border-info/30 text-14 text-info flex items-center justify-between">
        <span>Analysts recommend, admins freeze.</span>
        <span className="text-12 font-medium">Policy reminder</span>
      </div>

      {/* Rule and Trigger Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Triggering rule configuration">
          <KeyValue>
            <KeyValueRow label="Rule" value={RISK_RULE_LABELS[alert.rule_code] || alert.rule_code} />
            <KeyValueRow label="Severity" value={<StatusBadge status={alert.severity} />} />
            <KeyValueRow label="Status" value={<StatusBadge status={alert.status} />} />
            <KeyValueRow label="Description" value={alert.rule_description} />
            <KeyValueRow
              label="Parameters"
              value={
                <pre className="text-12 font-mono bg-surface-subtle p-2 rounded-[4px] border border-border">
                  {JSON.stringify(alert.rule_params, null, 2)}
                </pre>
              }
            />
          </KeyValue>
        </Card>

        <Card title="Flagged wallet profile">
          <KeyValue>
            <KeyValueRow label="Wallet number" value={alert.wallet?.wallet_no} mono />
            <KeyValueRow label="Account holder" value={alert.wallet?.holder_name} />
            <KeyValueRow label="Holder phone" value={alert.wallet?.holder_phone} mono />
            <KeyValueRow label="KYC status" value={<StatusBadge status={alert.wallet?.kyc_status} />} />
            <KeyValueRow label="Wallet status" value={<StatusBadge status={alert.wallet?.status} />} />
            <KeyValueRow
              label="Current balance"
              value={<MoneyText amount={alert.wallet?.balance} size="20" weight="semibold" />}
            />
          </KeyValue>
        </Card>
      </div>

      {/* Trigger Details & Window Transactions */}
      <Card
        title="Transactions in evaluation window"
        subtitle={`Window: ${formatDate(alert.window_start)} to ${formatDate(alert.window_end)}`}
      >
        {alert.details && (
          <div className="mb-4 p-3 rounded-[6px] bg-surface-subtle border border-border text-14 text-text">
            <span className="font-semibold block mb-0.5">Engine diagnostic details</span>
            <span>{alert.details}</span>
          </div>
        )}

        <DataTable
          columns={windowColumns}
          data={alert.window_transactions || []}
          keyField="transaction_id"
          onRowClick={(row) => navigate(`/transactions/${row.transaction_id}`)}
          emptyMessage="No transactions captured in this alert window."
        />
      </Card>

      {/* Dismiss Modal */}
      <Modal
        isOpen={dismissOpen}
        onClose={() => setDismissOpen(false)}
        title="Dismiss fraud alert"
      >
        <form onSubmit={handleDismiss} className="space-y-4">
          <p className="text-14 text-text-muted">
            Dismissing an alert closes the notification without creating an investigation case. A reason must be recorded in the audit trail.
          </p>

          <Textarea
            label="Dismissal reason"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="Explain why this behavior is legitimate..."
            rows={3}
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setDismissOpen(false)}
              disabled={dismissing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              loading={dismissing}
              loadingText="Dismissing..."
            >
              Dismiss alert
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
