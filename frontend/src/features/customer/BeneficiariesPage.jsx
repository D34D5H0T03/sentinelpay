import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Send, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as benApi from '../../api/beneficiaries';
import * as walletsApi from '../../api/wallets';
import { formatDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/errors';

export default function BeneficiariesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: beneficiaries,
    loading,
    error,
    reload,
  } = useAsync(() => benApi.list());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBen, setEditingBen] = useState(null);
  const [nickname, setNickname] = useState('');
  const [walletNo, setWalletNo] = useState('');
  const [holderLookup, setHolderLookup] = useState(null);
  const [checkingWallet, setCheckingWallet] = useState(false);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenAdd = () => {
    setEditingBen(null);
    setNickname('');
    setWalletNo('');
    setHolderLookup(null);
    setModalError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (ben) => {
    setEditingBen(ben);
    setNickname(ben.nickname);
    setWalletNo(ben.wallet_no);
    setHolderLookup({ masked_name: ben.holder_name });
    setModalError('');
    setModalOpen(true);
  };

  const handleCheckWallet = async () => {
    if (!walletNo.trim()) return;
    setCheckingWallet(true);
    setModalError('');
    try {
      const data = await walletsApi.lookupWallet(walletNo.trim());
      setHolderLookup(data);
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setCheckingWallet(false);
    }
  };

  const handleSaveBeneficiary = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setModalError('Nickname is required.');
      return;
    }
    if (!editingBen && !walletNo.trim()) {
      setModalError('Wallet number is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingBen) {
        await benApi.update(editingBen.beneficiary_id, { nickname: nickname.trim() });
        showToast('Beneficiary updated.', 'success');
      } else {
        await benApi.create({ nickname: nickname.trim(), walletNo: walletNo.trim() });
        showToast('Beneficiary added successfully.', 'success');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await benApi.remove(deleteTarget.beneficiary_id);
      showToast('Beneficiary removed.', 'info');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'nickname',
      header: 'Nickname',
      render: (r) => <span className="font-semibold text-text">{r.nickname}</span>,
    },
    {
      key: 'wallet_no',
      header: 'Wallet number',
      render: (r) => <span className="font-mono text-12 text-text">{r.wallet_no}</span>,
    },
    {
      key: 'holder_name',
      header: 'Account holder',
      render: (r) => <span className="text-14 text-text-muted">{r.holder_name}</span>,
    },
    {
      key: 'created_at',
      header: 'Added date',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/send')}
            title="Send money"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Send</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(r)}
            title="Edit nickname"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(r)}
            className="text-danger hover:text-danger"
            title="Remove beneficiary"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beneficiaries"
        subtitle="Saved contacts for fast fund transfers"
        action={
          <Button variant="primary" onClick={handleOpenAdd}>
            <UserPlus size={16} />
            <span>Add beneficiary</span>
          </Button>
        }
      />

      {loading && !beneficiaries ? (
        <Skeleton variant="table" rows={4} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load beneficiaries"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={beneficiaries || []}
          keyField="beneficiary_id"
          emptyMessage="No saved beneficiaries yet. Click 'Add beneficiary' to save a contact."
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBen ? 'Edit beneficiary nickname' : 'Add new beneficiary'}
      >
        <form onSubmit={handleSaveBeneficiary} className="space-y-4" noValidate>
          {modalError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {modalError}
            </div>
          )}

          {!editingBen && (
            <div>
              <div className="flex items-end gap-2">
                <Input
                  label="Wallet number"
                  value={walletNo}
                  onChange={(e) => {
                    setWalletNo(e.target.value);
                    setHolderLookup(null);
                  }}
                  placeholder="01XXXXXXXXX"
                  className="flex-1"
                  required
                />
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={handleCheckWallet}
                  loading={checkingWallet}
                  loadingText="Checking..."
                  disabled={!walletNo.trim()}
                  className="mb-0.5"
                >
                  Verify
                </Button>
              </div>

              {holderLookup && (
                <div className="mt-1.5 p-2 rounded-[6px] bg-surface-subtle border border-border text-12 text-text">
                  Holder: <strong className="font-medium">{holderLookup.masked_name}</strong>
                </div>
              )}
            </div>
          )}

          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Brother, Office colleague"
            hint="A friendly label for this contact"
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={saving}
              loadingText="Saving..."
            >
              Save beneficiary
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove beneficiary"
        message={`Are you sure you want to remove "${deleteTarget?.nickname}" (${deleteTarget?.wallet_no}) from your saved beneficiaries?`}
        confirmText="Remove"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
