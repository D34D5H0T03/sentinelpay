import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as walletsApi from '../../api/wallets';
import { formatDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/errors';

export default function MyWalletsPage() {
  const { showToast } = useToast();

  const {
    data: wallets,
    loading,
    error,
    reload,
  } = useAsync(() => walletsApi.listWallets());

  const [openModal, setOpenModal] = useState(false);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleOpenWallet = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setCreateError('Please provide a label for the wallet.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await walletsApi.openWallet({ label: label.trim() });
      showToast('New wallet opened successfully.', 'success');
      setOpenModal(false);
      setLabel('');
      reload();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My wallets"
        subtitle="Manage personal wallets, view balances, and check account limits"
        action={
          <Button variant="primary" onClick={() => setOpenModal(true)}>
            <Plus size={16} />
            <span>Open another wallet</span>
          </Button>
        }
      />

      {loading && !wallets ? (
        <Skeleton variant="table" rows={4} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load wallets"
          onRetry={reload}
        />
      ) : (
        <div className="space-y-6">
          {/* Wallets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets?.map((w) => (
              <Card key={w.wallet_id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-15 font-semibold text-text">{w.label}</h3>
                      <span className="font-mono text-12 text-text-muted">{w.wallet_no}</span>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <span className="text-12 text-text-muted block">Current balance</span>
                    <MoneyText amount={w.balance} size="28" weight="semibold" className="mt-0.5" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-12">
                  <span className="text-text-muted">
                    Opened {formatDate(w.opened_at)}
                  </span>
                  <Link
                    to={`/wallets/${w.wallet_id}`}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>View statement</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Limits Table & Info Note */}
          <Card title="Account limits schedule" subtitle="Applicable to all personal wallets under your account">
            <div className="overflow-x-auto">
              <table className="w-full text-14 text-left border-collapse">
                <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Limit tier</th>
                    <th className="px-4 py-2.5 text-right">Max per transaction</th>
                    <th className="px-4 py-2.5 text-right">Max per day</th>
                    <th className="px-4 py-2.5 text-right">Max per month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-surface">
                    <td className="px-4 py-3 font-medium text-text">Standard personal wallet</td>
                    <td className="px-4 py-3 text-right tabular-nums">৳ 25,000.00</td>
                    <td className="px-4 py-3 text-right tabular-nums">৳ 50,000.00</td>
                    <td className="px-4 py-3 text-right tabular-nums">৳ 2,00,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-[6px] bg-surface-subtle border border-border text-12 text-text-muted flex items-start gap-2">
              <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
              <span>
                Limits are set by SentinelPay based on account verification level. To request higher limits, submit verified national identity documentation.
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Open Wallet Modal */}
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="Open another wallet"
      >
        <form onSubmit={handleOpenWallet} className="space-y-4">
          <p className="text-14 text-text-muted">
            You can maintain separate wallets for savings, bills, or specific expenses. Each wallet holds an independent balance and statement.
          </p>

          {createError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {createError}
            </div>
          )}

          <Input
            label="Wallet label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Vacation Savings, Rent Fund"
            hint="A descriptive title for your wallet"
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setOpenModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={creating}
              loadingText="Opening wallet..."
            >
              Open wallet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
