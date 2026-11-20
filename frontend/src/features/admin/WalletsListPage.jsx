import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, XCircle, Sliders } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatDate, formatMoney } from '../../lib/format';
import { LIMIT_TYPES, LIMIT_TYPE_LABELS } from '../../lib/constants';

export default function WalletsListPage() {
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Status Change Dialog
  const [statusTarget, setStatusTarget] = useState(null); // { wallet, nextStatus }
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Limits Dialog
  const [limitsWallet, setLimitsWallet] = useState(null);
  const [limitsList, setLimitsList] = useState([]);
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Add Limit Form
  const [newLimitType, setNewLimitType] = useState('PER_TXN');
  const [newLimitAmount, setNewLimitAmount] = useState('');
  const [addingLimit, setAddingLimit] = useState(false);

  const {
    data: walletsData,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      adminApi.listWallets({
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize: 10,
      }),
    [page, status, search]
  );

  const handleOpenLimits = async (wallet) => {
    setLimitsWallet(wallet);
    setLimitsLoading(true);
    setNewLimitAmount('');
    try {
      const data = await adminApi.listLimits(wallet.wallet_id);
      setLimitsList(data);
    } catch (err) {
      showToast(err.message || 'Could not load limits.', 'error');
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleAddLimit = async (e) => {
    e.preventDefault();
    if (!newLimitAmount.trim() || !limitsWallet) return;
    setAddingLimit(true);
    try {
      await adminApi.addLimit(limitsWallet.wallet_id, {
        limit_type: newLimitType,
        max_amount: newLimitAmount.trim(),
        effective_from: new Date().toISOString().slice(0, 10),
      });
      showToast('Limit added successfully.', 'success');
      const updated = await adminApi.listLimits(limitsWallet.wallet_id);
      setLimitsList(updated);
      setNewLimitAmount('');
    } catch (err) {
      showToast(err.message || 'Could not add limit.', 'error');
    } finally {
      setAddingLimit(false);
    }
  };

  const handleEndLimit = async (type, from) => {
    if (!limitsWallet) return;
    try {
      await adminApi.endLimit(limitsWallet.wallet_id, type, from);
      showToast('Limit ended.', 'info');
      const updated = await adminApi.listLimits(limitsWallet.wallet_id);
      setLimitsList(updated);
    } catch (err) {
      showToast(err.message || 'Could not end limit.', 'error');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    setStatusUpdating(true);
    try {
      await adminApi.setWalletStatus(statusTarget.wallet.wallet_id, statusTarget.nextStatus);
      showToast(`Wallet status updated to ${statusTarget.nextStatus}.`, 'success');
      setStatusTarget(null);
      reload();
    } catch (err) {
      showToast(err.message || 'Status change failed.', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleResetFilters = () => {
    setStatus('');
    setSearch('');
    setPage(1);
  };

  const columns = [
    {
      key: 'wallet_no',
      header: 'Wallet number',
      render: (r) => (
        <div>
          <span className="font-mono text-12 font-medium text-text block">{r.wallet_no}</span>
          <span className="text-12 text-text-muted">{r.label}</span>
        </div>
      ),
    },
    {
      key: 'holder',
      header: 'Account holder',
      render: (r) => (
        <div>
          <span className="text-14 font-medium text-text block">{r.holder_name}</span>
          <span className="text-12 text-text-muted font-mono">{r.holder_phone}</span>
        </div>
      ),
    },
    {
      key: 'wallet_type',
      header: 'Type',
      render: (r) => <span className="text-12 text-text-muted">{r.wallet_type}</span>,
    },
    {
      key: 'balance',
      header: 'Derived balance',
      align: 'right',
      render: (r) => <MoneyText amount={r.balance} size="15" weight="semibold" />,
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
            onClick={() => handleOpenLimits(r)}
            title="Configure limits"
          >
            <Sliders size={14} />
            <span className="hidden sm:inline">Limits</span>
          </Button>

          {r.status === 'ACTIVE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusTarget({ wallet: r, nextStatus: 'FROZEN' })}
              className="text-danger hover:text-danger"
              title="Freeze wallet"
            >
              <ShieldAlert size={14} />
              <span>Freeze</span>
            </Button>
          )}

          {r.status === 'FROZEN' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusTarget({ wallet: r, nextStatus: 'ACTIVE' })}
              className="text-success hover:text-success"
              title="Unfreeze wallet"
            >
              <ShieldCheck size={14} />
              <span>Unfreeze</span>
            </Button>
          )}

          {r.status !== 'CLOSED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusTarget({ wallet: r, nextStatus: 'CLOSED' })}
              title="Close wallet"
            >
              <XCircle size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallets directory"
        subtitle="Customer and agent float wallets, balances, limit rules, and freeze status"
      />

      <FilterBar onReset={handleResetFilters}>
        <Input
          placeholder="Search by wallet number, holder or label..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 sm:w-80"
        />

        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-32"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="FROZEN">FROZEN</option>
          <option value="CLOSED">CLOSED</option>
        </Select>
      </FilterBar>

      {loading && !walletsData ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load wallets"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={walletsData?.items || []}
          keyField="wallet_id"
          pagination={walletsData}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No wallets found matching filters."
        />
      )}

      {/* Limits Dialog */}
      <Modal
        isOpen={Boolean(limitsWallet)}
        onClose={() => setLimitsWallet(null)}
        title={`Wallet limits: ${limitsWallet?.wallet_no}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          <p className="text-14 text-text-muted">
            Configure transaction amount ceilings for wallet {limitsWallet?.wallet_no} ({limitsWallet?.label}).
          </p>

          {/* Limits Table */}
          {limitsLoading ? (
            <Skeleton variant="table" rows={3} />
          ) : (
            <div className="border border-border rounded-[6px] overflow-hidden">
              <table className="w-full text-left text-14 border-collapse">
                <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                  <tr>
                    <th className="px-3.5 py-2">Limit type</th>
                    <th className="px-3.5 py-2 text-right">Max amount</th>
                    <th className="px-3.5 py-2">Effective from</th>
                    <th className="px-3.5 py-2">Effective to</th>
                    <th className="px-3.5 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {limitsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-4 text-center text-text-muted text-12">
                        No active limit records.
                      </td>
                    </tr>
                  ) : (
                    limitsList.map((limit, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle">
                        <td className="px-3.5 py-2 font-medium text-text">
                          {LIMIT_TYPE_LABELS[limit.limit_type] || limit.limit_type}
                        </td>
                        <td className="px-3.5 py-2 text-right tabular-nums font-semibold text-text">
                          {formatMoney(limit.max_amount)}
                        </td>
                        <td className="px-3.5 py-2 text-12 text-text-muted">{limit.effective_from}</td>
                        <td className="px-3.5 py-2 text-12 text-text-muted">
                          {limit.effective_to || 'Indefinite'}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          {!limit.effective_to ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEndLimit(limit.limit_type, limit.effective_from)}
                              className="text-danger"
                            >
                              End limit
                            </Button>
                          ) : (
                            <span className="text-12 text-text-muted">Expired</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Limit Form */}
          <form onSubmit={handleAddLimit} className="p-3.5 bg-surface-subtle border border-border rounded-[6px] space-y-3">
            <h4 className="text-14 font-semibold text-text">Add / override limit</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Limit type"
                value={newLimitType}
                onChange={(e) => setNewLimitType(e.target.value)}
                required
              >
                {Object.entries(LIMIT_TYPES).map(([k, v]) => (
                  <option key={k} value={v}>
                    {LIMIT_TYPE_LABELS[v] || v}
                  </option>
                ))}
              </Select>

              <Input
                label="Max amount"
                prefix="৳"
                value={newLimitAmount}
                onChange={(e) => setNewLimitAmount(e.target.value)}
                placeholder="25000.00"
                required
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={addingLimit}
                loadingText="Adding..."
              >
                Save new limit
              </Button>
            </div>
          </form>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setLimitsWallet(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Freeze / Unfreeze / Close Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleConfirmStatusChange}
        title={`Confirm wallet status change to ${statusTarget?.nextStatus}`}
        message={`Are you sure you want to change the status of wallet ${statusTarget?.wallet?.wallet_no} to ${statusTarget?.nextStatus}?`}
        tone={statusTarget?.nextStatus === 'FROZEN' ? 'danger' : 'primary'}
        confirmText={`Set to ${statusTarget?.nextStatus}`}
        loading={statusUpdating}
      />
    </div>
  );
}
