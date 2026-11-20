import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatMoney } from '../../lib/format';
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from '../../lib/constants';

export default function FeeRulesPage() {
  const { showToast } = useToast();

  const {
    data: feeRules,
    loading,
    error,
    reload,
  } = useAsync(() => adminApi.listFeeRules());

  // Modal add/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    type_code: 'SEND_MONEY',
    min_amount: '1.00',
    max_amount: '25000.00',
    fee_flat: '5.00',
    fee_percent: '0.00000',
    effective_from: '2026-01-01',
    effective_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setRuleForm({
      type_code: 'SEND_MONEY',
      min_amount: '1.00',
      max_amount: '25000.00',
      fee_flat: '5.00',
      fee_percent: '0.00000',
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      type_code: rule.type_code,
      min_amount: rule.min_amount,
      max_amount: rule.max_amount,
      fee_flat: rule.fee_flat,
      fee_percent: String(rule.fee_percent || 0),
      effective_from: rule.effective_from,
      effective_to: rule.effective_to || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingRule) {
        await adminApi.updateFeeRule(editingRule.fee_rule_id, ruleForm);
        showToast('Fee rule updated.', 'success');
      } else {
        await adminApi.createFeeRule(ruleForm);
        showToast('Fee rule created.', 'success');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message || 'Could not save fee rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteFeeRule(deleteTarget.fee_rule_id);
      showToast('Fee rule removed.', 'info');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast(err.message || 'Could not delete rule.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'type_code',
      header: 'Operation type',
      render: (r) => (
        <span className="font-semibold text-text">
          {TRANSACTION_TYPE_LABELS[r.type_code] || r.type_code}
        </span>
      ),
    },
    {
      key: 'range',
      header: 'Transaction range',
      render: (r) => (
        <span className="tabular-nums text-12 text-text">
          {formatMoney(r.min_amount)} – {formatMoney(r.max_amount)}
        </span>
      ),
    },
    {
      key: 'fee_flat',
      header: 'Flat fee',
      align: 'right',
      render: (r) => <span className="tabular-nums font-mono">{formatMoney(r.fee_flat)}</span>,
    },
    {
      key: 'fee_percent',
      header: 'Percent fee',
      align: 'right',
      render: (r) => (
        <span className="tabular-nums font-mono">
          {(parseFloat(r.fee_percent || 0) * 100).toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'effective_from',
      header: 'Effective from',
      render: (r) => <span className="text-12 text-text-muted">{r.effective_from}</span>,
    },
    {
      key: 'effective_to',
      header: 'Effective to',
      render: (r) => <span className="text-12 text-text-muted">{r.effective_to || 'Indefinite'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(r)}>
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(r)}
            className="text-danger hover:text-danger"
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
        title="Fee rules schedule"
        subtitle="Configure flat fees and commission percentages applied during money movement"
        action={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add fee rule</span>
          </Button>
        }
      />

      {loading && !feeRules ? (
        <Skeleton variant="table" rows={4} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load fee rules"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={feeRules || []}
          keyField="fee_rule_id"
          emptyMessage="No fee rules configured."
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? 'Edit fee rule' : 'Add new fee rule'}
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {formError}
            </div>
          )}

          <Select
            label="Transaction operation"
            value={ruleForm.type_code}
            onChange={(e) => setRuleForm({ ...ruleForm, type_code: e.target.value })}
            required
          >
            {Object.entries(TRANSACTION_TYPES).map(([k, v]) => (
              <option key={k} value={v}>
                {TRANSACTION_TYPE_LABELS[v] || v}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Minimum amount"
              prefix="৳"
              value={ruleForm.min_amount}
              onChange={(e) => setRuleForm({ ...ruleForm, min_amount: e.target.value })}
              required
            />
            <Input
              label="Maximum amount"
              prefix="৳"
              value={ruleForm.max_amount}
              onChange={(e) => setRuleForm({ ...ruleForm, max_amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Flat fee amount"
              prefix="৳"
              value={ruleForm.fee_flat}
              onChange={(e) => setRuleForm({ ...ruleForm, fee_flat: e.target.value })}
              placeholder="0.00"
              required
            />
            <Input
              label="Percentage (decimal)"
              value={ruleForm.fee_percent}
              onChange={(e) => setRuleForm({ ...ruleForm, fee_percent: e.target.value })}
              placeholder="0.01850 for 1.85%"
              hint="0.01850 = 1.85%"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Effective from date"
              type="date"
              value={ruleForm.effective_from}
              onChange={(e) => setRuleForm({ ...ruleForm, effective_from: e.target.value })}
              required
            />
            <Input
              label="Effective to date (optional)"
              type="date"
              value={ruleForm.effective_to}
              onChange={(e) => setRuleForm({ ...ruleForm, effective_to: e.target.value })}
            />
          </div>

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
              Save fee rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete fee rule"
        message={`Are you sure you want to delete this fee rule for ${deleteTarget?.type_code}?`}
        confirmText="Delete rule"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
