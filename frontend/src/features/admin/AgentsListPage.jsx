import React, { useState } from 'react';
import { Store, Plus, Coins } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { isValidPhone, isValidAmount } from '../../lib/validators';
import { formatMoney } from '../../lib/format';

export default function AgentsListPage() {
  const { showToast } = useToast();

  const {
    data: agents,
    loading,
    error,
    reload,
  } = useAsync(() => adminApi.listAgents());

  // Create Agent modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [agentForm, setAgentForm] = useState({
    name: '',
    phone: '',
    email: '',
    agent_code: '',
    outlet_name: '',
    district: 'Dhaka',
    commission_rate: '0.0040',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Load Float modal state
  const [floatModalOpen, setFloatModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [floatAmount, setFloatAmount] = useState('');
  const [confirmFloatOpen, setConfirmFloatOpen] = useState(false);
  const [loadingFloat, setLoadingFloat] = useState(false);

  const handleOpenLoadFloat = (agent) => {
    setSelectedAgent(agent);
    setFloatAmount('');
    setFloatModalOpen(true);
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!agentForm.name.trim() || !agentForm.phone.trim() || !agentForm.agent_code.trim()) {
      setCreateError('Name, phone, and agent code are required.');
      return;
    }
    if (!isValidPhone(agentForm.phone)) {
      setCreateError('Enter a valid 11-digit Bangladeshi mobile number.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await adminApi.createAgent(agentForm);
      showToast('Agent profile and float wallet created.', 'success');
      setCreateModalOpen(false);
      setAgentForm({
        name: '',
        phone: '',
        email: '',
        agent_code: '',
        outlet_name: '',
        district: 'Dhaka',
        commission_rate: '0.0040',
      });
      reload();
    } catch (err) {
      setCreateError(err.message || 'Could not create agent.');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmFloatLoad = async () => {
    if (!selectedAgent || !floatAmount) return;
    setLoadingFloat(true);
    try {
      await adminApi.loadFloat({
        agentWalletNo: selectedAgent.wallet_no,
        amount: floatAmount.trim(),
      });
      showToast(`Loaded ৳ ${floatAmount} float to ${selectedAgent.wallet_no}.`, 'success');
      setConfirmFloatOpen(false);
      setFloatModalOpen(false);
      reload();
    } catch (err) {
      showToast(err.message || 'Float load failed.', 'error');
    } finally {
      setLoadingFloat(false);
    }
  };

  const columns = [
    {
      key: 'agent_code',
      header: 'Agent code',
      render: (r) => (
        <span className="font-mono text-12 font-medium text-text">
          {r.agent_profile?.agent_code || r.wallet_no}
        </span>
      ),
    },
    {
      key: 'outlet',
      header: 'Outlet name & district',
      render: (r) => (
        <div>
          <span className="font-medium text-text block">{r.agent_profile?.outlet_name}</span>
          <span className="text-12 text-text-muted">{r.agent_profile?.district}</span>
        </div>
      ),
    },
    {
      key: 'holder',
      header: 'Agent holder',
      render: (r) => (
        <div>
          <span className="text-14 text-text block">{r.name}</span>
          <span className="text-12 text-text-muted font-mono">{r.phone}</span>
        </div>
      ),
    },
    {
      key: 'commission',
      header: 'Commission rate',
      render: (r) => (
        <span className="text-12 font-mono text-text">
          {((r.agent_profile?.commission_rate || 0.004) * 100).toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Float balance',
      align: 'right',
      render: (r) => <MoneyText amount={r.balance} size="15" weight="semibold" />,
    },
    {
      key: 'wallet_status',
      header: 'Float status',
      render: (r) => <StatusBadge status={r.wallet_status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenLoadFloat(r)}
        >
          <Coins size={14} />
          <span>Load float</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent network"
        subtitle="Registered cash shops, float balances, and liquidity replenishment"
        action={
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} />
            <span>Create agent</span>
          </Button>
        }
      />

      {loading && !agents ? (
        <Skeleton variant="table" rows={4} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load agents"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={agents || []}
          keyField="user_id"
          emptyMessage="No agents registered in the network."
        />
      )}

      {/* Create Agent Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register new agent outlet"
      >
        <form onSubmit={handleCreateAgent} className="space-y-4">
          <p className="text-14 text-text-muted">
            Creates an agent login account, agent profile, and a dedicated float wallet with ledger backing.
          </p>

          {createError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Agent code"
              value={agentForm.agent_code}
              onChange={(e) => setAgentForm({ ...agentForm, agent_code: e.target.value })}
              placeholder="e.g. AG-DHK-003"
              required
            />

            <Input
              label="Outlet name"
              value={agentForm.outlet_name}
              onChange={(e) => setAgentForm({ ...agentForm, outlet_name: e.target.value })}
              placeholder="e.g. City MFS Telecom"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact person name"
              value={agentForm.name}
              onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
              placeholder="e.g. Jamal Hossain"
              required
            />

            <Input
              label="Mobile phone"
              type="tel"
              value={agentForm.phone}
              onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="District"
              value={agentForm.district}
              onChange={(e) => setAgentForm({ ...agentForm, district: e.target.value })}
              required
            >
              <option value="Dhaka">Dhaka</option>
              <option value="Chattogram">Chattogram</option>
              <option value="Sylhet">Sylhet</option>
              <option value="Khulna">Khulna</option>
              <option value="Rajshahi">Rajshahi</option>
            </Select>

            <Input
              label="Commission rate (decimal)"
              value={agentForm.commission_rate}
              onChange={(e) => setAgentForm({ ...agentForm, commission_rate: e.target.value })}
              placeholder="0.0040 (0.4%)"
              hint="Standard rate is 0.0040"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={creating}
              loadingText="Creating..."
            >
              Register agent
            </Button>
          </div>
        </form>
      </Modal>

      {/* Load Float Step 1: Input Modal */}
      <Modal
        isOpen={floatModalOpen}
        onClose={() => setFloatModalOpen(false)}
        title={`Load float to ${selectedAgent?.agent_profile?.outlet_name || selectedAgent?.wallet_no}`}
      >
        <div className="space-y-4">
          <p className="text-14 text-text-muted">
            Float loads disburse e-money from the system SETTLEMENT ledger account to the agent float wallet.
          </p>

          <div className="p-3 bg-surface-subtle border border-border rounded-[6px] flex items-center justify-between text-12">
            <span className="text-text-muted">Current float:</span>
            <MoneyText amount={selectedAgent?.balance} weight="semibold" />
          </div>

          <Input
            label="Float allocation amount"
            prefix="৳"
            value={floatAmount}
            onChange={(e) => setFloatAmount(e.target.value)}
            placeholder="50000.00"
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFloatModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (isValidAmount(floatAmount)) {
                  setConfirmFloatOpen(true);
                } else {
                  showToast('Enter a valid amount.', 'error');
                }
              }}
              disabled={!isValidAmount(floatAmount)}
            >
              Review float load
            </Button>
          </div>
        </div>
      </Modal>

      {/* Load Float Step 2: Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmFloatOpen}
        onClose={() => setConfirmFloatOpen(false)}
        onConfirm={handleConfirmFloatLoad}
        title="Confirm float replenishment"
        message={`Confirm transferring ৳ ${floatAmount} from SETTLEMENT to agent float wallet ${selectedAgent?.wallet_no}?`}
        confirmText="Confirm float load"
        loading={loadingFloat}
        loadingText="Posting float transfer..."
      />
    </div>
  );
}
