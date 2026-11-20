import React, { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import Card from './ui/Card';
import StatusBadge from './ui/StatusBadge';
import MoneyText from './ui/MoneyText';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import Tabs from './ui/Tabs';
import Stepper from './ui/Stepper';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import ErrorState from './ui/ErrorState';
import DataTable from './ui/DataTable';
import FilterBar from './ui/FilterBar';
import Timeline from './ui/Timeline';
import KeyValue, { KeyValueRow } from './ui/KeyValue';
import { useToast } from './ui/Toast';

export default function StyleGuide() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('one');
  const [currentStep, setCurrentStep] = useState(1);

  const sampleColumns = [
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-12">{r.ref}</span> },
    { key: 'type', header: 'Type' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <MoneyText amount={r.amount} side={r.side} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const sampleData = [
    { ref: 'TX-10001', type: 'Cash in', amount: '5000.00', side: 'CREDIT', status: 'COMPLETED' },
    { ref: 'TX-10002', type: 'Send money', amount: '1200.00', side: 'DEBIT', status: 'COMPLETED' },
    { ref: 'TX-10003', type: 'Cash out', amount: '800.00', side: 'DEBIT', status: 'FAILED' },
    { ref: 'TX-10004', type: 'Send money', amount: '350.00', side: 'DEBIT', status: 'REVERSED' },
  ];

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-20 font-semibold text-text">Design System & Component Style Guide</h1>
        <p className="text-14 text-text-muted mt-1">
          Visual test bench for all SentinelPay shared components, semantic tokens, and typography.
        </p>
      </div>

      {/* Typography & MoneyText */}
      <Card title="Typography & Currency Formatting">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-12 text-text-muted">Key balance (28px tabular-nums):</p>
              <MoneyText amount="95000.00" size="28" />
            </div>
            <div>
              <p className="text-12 text-text-muted">Page summary title (20px):</p>
              <MoneyText amount="3795.00" size="20" />
            </div>
          </div>

          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-6">
            <div>
              <span className="text-12 text-text-muted block">Credit (+ green):</span>
              <MoneyText amount="5000.00" side="CREDIT" size="15" weight="medium" />
            </div>
            <div>
              <span className="text-12 text-text-muted block">Debit (- normal text color):</span>
              <MoneyText amount="1200.00" side="DEBIT" size="15" weight="medium" />
            </div>
            <div>
              <span className="text-12 text-text-muted block">Fee / Neutral:</span>
              <MoneyText amount="5.00" size="14" />
            </div>
          </div>
        </div>
      </Card>

      {/* Status Badges */}
      <Card title="Status Badges">
        <div className="space-y-3">
          <div>
            <span className="text-12 text-text-muted block mb-1">Transaction statuses:</span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="INITIATED" />
              <StatusBadge status="COMPLETED" />
              <StatusBadge status="FAILED" />
              <StatusBadge status="REVERSED" />
            </div>
          </div>

          <div>
            <span className="text-12 text-text-muted block mb-1">Wallet statuses:</span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="ACTIVE" />
              <StatusBadge status="FROZEN" />
              <StatusBadge status="CLOSED" />
            </div>
          </div>

          <div>
            <span className="text-12 text-text-muted block mb-1">KYC statuses:</span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="UNVERIFIED" />
              <StatusBadge status="VERIFIED" />
              <StatusBadge status="REJECTED" />
            </div>
          </div>

          <div>
            <span className="text-12 text-text-muted block mb-1">Risk Severities & Alerts:</span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="LOW" />
              <StatusBadge status="MEDIUM" />
              <StatusBadge status="HIGH" />
              <StatusBadge status="OPEN" />
              <StatusBadge status="IN_CASE" />
              <StatusBadge status="DISMISSED" />
              <StatusBadge status="CONFIRMED" />
            </div>
          </div>
        </div>
      </Card>

      {/* Buttons & Dialogs */}
      <Card title="Buttons & Actions">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Destructive action</Button>
          <Button variant="ghost">Ghost button</Button>
          <Button variant="primary" loading loadingText="Sending...">Submit</Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open confirm</Button>
          <Button variant="secondary" onClick={() => showToast('Changes saved successfully.', 'success')}>
            Show toast
          </Button>
        </div>
      </Card>

      {/* Inputs */}
      <Card title="Form Inputs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Recipient wallet" placeholder="01XXXXXXXXX" hint="Check lookup" />
          <Input label="Transfer amount" prefix="৳" defaultValue="1200.00" />
          <Input label="Required field with error" error="Not enough balance in this wallet." defaultValue="99999.00" required />
          <Select
            label="From wallet"
            options={[
              { value: '1', label: 'Main wallet (৳ 3,795.00)' },
              { value: '2', label: 'Savings wallet (৳ 1,000.00)' },
            ]}
          />
          <div className="sm:col-span-2">
            <Textarea label="Transfer note" placeholder="Optional reference or description" rows={2} />
          </div>
        </div>
      </Card>

      {/* Stepper */}
      <Card title="Stepper">
        <Stepper
          currentStep={currentStep}
          steps={[
            { title: 'Recipient & amount' },
            { title: 'Review & fee' },
            { title: 'Receipt' },
          ]}
        />
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}>
            Previous step
          </Button>
          <Button size="sm" variant="primary" onClick={() => setCurrentStep(Math.min(2, currentStep + 1))}>
            Next step
          </Button>
        </div>
      </Card>

      {/* Tabs & DataTable */}
      <Card title="Tabs & Data Table">
        <Tabs
          tabs={[
            { id: 'one', label: 'Recent activity', count: 4 },
            { id: 'two', label: 'Scheduled' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />

        <DataTable
          columns={sampleColumns}
          data={sampleData}
          keyField="ref"
          pagination={{ page: 1, pageSize: 10, total: 4 }}
        />
      </Card>

      {/* States */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton variant="table" rows={3} />
        <EmptyState title="No transactions yet" description="Send money or visit an agent to add funds." />
        <ErrorState error="Connection interrupted while fetching statement." onRetry={() => {}} />
      </div>

      {/* Modals */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Sample dialog modal">
        <p className="text-14 text-text mb-4">
          Modals feature a soft shadow, 1px border, 8px radius, focus trap, and Escape key dismissal.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>Done</Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          showToast('Action confirmed.', 'info');
        }}
        title="Confirm transaction reversal"
        message="This action will post an immutable reversal journal back to the sender's account. This cannot be undone."
        tone="danger"
        confirmText="Confirm reversal"
      />
    </div>
  );
}
