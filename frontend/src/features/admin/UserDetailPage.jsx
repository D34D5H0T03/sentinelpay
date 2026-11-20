import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, XCircle, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyText from '../../components/ui/MoneyText';
import DataTable from '../../components/ui/DataTable';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatDate } from '../../lib/format';
import { ROLES, ROLE_LABELS } from '../../lib/constants';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: user,
    loading,
    error,
    reload,
  } = useAsync(() => adminApi.getUser(id), [id]);

  // Status confirm dialog
  const [targetStatus, setTargetStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // KYC action
  const [kycUpdating, setKycUpdating] = useState(false);

  // Roles updating
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [rolesUpdating, setRolesUpdating] = useState(false);

  // Sync roles when user loads
  React.useEffect(() => {
    if (user?.roles) {
      setSelectedRoles(user.roles);
    }
  }, [user]);

  const handleRoleToggle = (roleKey) => {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  const handleSaveRoles = async () => {
    if (selectedRoles.length === 0) {
      showToast('User must have at least one assigned role.', 'error');
      return;
    }
    setRolesUpdating(true);
    try {
      await adminApi.updateUserRoles(id, selectedRoles);
      showToast('User roles updated.', 'success');
      reload();
    } catch (err) {
      showToast(err.message || 'Could not update roles.', 'error');
    } finally {
      setRolesUpdating(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!targetStatus) return;
    setStatusUpdating(true);
    try {
      await adminApi.updateUserStatus(id, targetStatus);
      showToast(`User status changed to ${targetStatus}.`, 'success');
      setTargetStatus(null);
      reload();
    } catch (err) {
      showToast(err.message || 'Could not update status.', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleKycAction = async (newKyc) => {
    setKycUpdating(true);
    try {
      await adminApi.updateKyc(id, newKyc);
      showToast(`KYC status updated to ${newKyc}.`, 'success');
      reload();
    } catch (err) {
      showToast(err.message || 'Could not update KYC status.', 'error');
    } finally {
      setKycUpdating(false);
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

  if (error || !user) {
    return (
      <ErrorState
        error={error}
        title="Could not load user profile"
        onRetry={reload}
      />
    );
  }

  const walletColumns = [
    {
      key: 'label',
      header: 'Label',
      render: (r) => <span className="font-semibold text-text">{r.label}</span>,
    },
    {
      key: 'wallet_no',
      header: 'Wallet number',
      render: (r) => <span className="font-mono text-12 text-text">{r.wallet_no}</span>,
    },
    {
      key: 'wallet_type',
      header: 'Type',
      render: (r) => <span className="text-12 text-text-muted">{r.wallet_type}</span>,
    },
    {
      key: 'balance',
      header: 'Current balance',
      align: 'right',
      render: (r) => <MoneyText amount={r.balance} size="15" weight="semibold" />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

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
      header: 'Type',
      render: (r) => <span className="capitalize">{r.type_code?.replace('_', ' ').toLowerCase()}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <MoneyText amount={r.amount} weight="medium" />,
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
        title={`User: ${user.name}`}
        subtitle={`Account ID #${user.user_id} · ${user.phone}`}
        backTo="/admin/users"
        backLabel="Back to Users"
        action={
          <div className="flex items-center gap-2">
            {user.status === 'ACTIVE' ? (
              <Button variant="danger" size="sm" onClick={() => setTargetStatus('SUSPENDED')}>
                Suspend user
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setTargetStatus('ACTIVE')}>
                Activate user
              </Button>
            )}
          </div>
        }
      />

      {/* Profile & Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="User profile & KYC">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-12 font-medium text-text-muted uppercase tracking-wider">
              Verification status
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge status={user.kyc_status || 'UNVERIFIED'} />
              {user.kyc_status !== 'VERIFIED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleKycAction('VERIFIED')}
                  loading={kycUpdating}
                >
                  <Check size={14} />
                  <span>Approve KYC</span>
                </Button>
              )}
              {user.kyc_status !== 'REJECTED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleKycAction('REJECTED')}
                  className="text-danger"
                  loading={kycUpdating}
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </Button>
              )}
            </div>
          </div>

          <KeyValue className="py-2">
            <KeyValueRow label="Full name" value={user.name} />
            <KeyValueRow label="Phone" value={user.phone} mono />
            <KeyValueRow label="Email" value={user.email || 'None'} />
            <KeyValueRow label="Date of birth" value={user.date_of_birth || '—'} />
            <KeyValueRow label="Address" value={user.address || '—'} />
            <KeyValueRow label="Registered" value={formatDate(user.created_at)} />
            <KeyValueRow label="Account status" value={<StatusBadge status={user.status} />} />
          </KeyValue>
        </Card>

        {/* Roles management checkboxes */}
        <Card title="Assigned security roles" subtitle="Checkboxes configure platform authorization">
          <div className="space-y-3 py-2">
            {Object.entries(ROLES).map(([key, roleValue]) => {
              const checked = selectedRoles.includes(roleValue);
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 p-2.5 rounded-[6px] border border-border hover:bg-surface-subtle cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleRoleToggle(roleValue)}
                    className="mt-0.5 w-4 h-4 rounded-[4px] border-border-strong text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className="text-14 font-medium text-text block">
                      {ROLE_LABELS[roleValue] || roleValue}
                    </span>
                    <span className="text-12 text-text-muted">
                      {roleValue === 'ADMIN'
                        ? 'Full administrative control across all domains'
                        : roleValue === 'FRAUD_ANALYST'
                        ? 'Investigate risk alerts, dossiers, and analytics'
                        : roleValue === 'AUDITOR'
                        ? 'Read-only access to double-entry ledger & audit logs'
                        : roleValue === 'AGENT'
                        ? 'Cash-in, cash-out, and float counter operations'
                        : 'Customer wallets, send money, and statements'}
                    </span>
                  </div>
                </label>
              );
            })}

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRoles}
                loading={rolesUpdating}
                loadingText="Saving..."
              >
                Save assigned roles
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card title="Associated wallets">
        <DataTable
          columns={walletColumns}
          data={user.wallets || []}
          keyField="wallet_id"
          emptyMessage="No wallets associated with this user."
        />
      </Card>

      {/* Recent User Transactions */}
      <Card title="Recent activity">
        <DataTable
          columns={txColumns}
          data={user.recent_transactions || []}
          keyField="transaction_id"
          onRowClick={(row) => navigate(`/admin/transactions`)}
          emptyMessage="No recent transactions found for this user."
        />
      </Card>

      {/* Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(targetStatus)}
        onClose={() => setTargetStatus(null)}
        onConfirm={handleConfirmStatusChange}
        title="Confirm user status update"
        message={`Are you sure you want to change this user's account status to ${targetStatus}?`}
        tone={targetStatus === 'SUSPENDED' ? 'danger' : 'primary'}
        loading={statusUpdating}
      />
    </div>
  );
}
