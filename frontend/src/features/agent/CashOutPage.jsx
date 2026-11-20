import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Stepper from '../../components/ui/Stepper';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import { useAsync } from '../../lib/useAsync';
import * as agentApi from '../../api/agent';
import { isValidPhone, isValidAmount } from '../../lib/validators';
import { getErrorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { calculateFee, addMoney } from '../../lib/money';

export default function CashOutPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0: Form, 1: Review, 2: Result
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [amount, setAmount] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const idempotencyKeyRef = useRef(crypto.randomUUID());

  // Load float balance
  const { data: dashData } = useAsync(() => agentApi.dashboard());

  const handleLookup = async (phoneToCheck = phone) => {
    const cleanPhone = String(phoneToCheck).trim();
    if (!cleanPhone) {
      setLookupError('Enter customer phone number.');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    setCustomer(null);

    try {
      const data = await agentApi.lookupCustomer(cleanPhone);
      setCustomer(data);
    } catch (err) {
      setLookupError(getErrorMessage(err));
    } finally {
      setLookupLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!phone) {
      errs.phone = 'Customer phone number is required.';
    } else if (!isValidPhone(phone)) {
      errs.phone = 'Enter an 11-digit Bangladeshi mobile number.';
    }
    if (!amount) {
      errs.amount = 'Amount is required.';
    } else if (!isValidAmount(amount)) {
      errs.amount = 'Enter a valid amount greater than zero.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToReview = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!customer) {
      await handleLookup(phone);
    }
    setStep(1);
  };

  const handleConfirmCashOut = async () => {
    setSubmitting(true);
    try {
      const res = await agentApi.cashOut({
        phone: phone.trim(),
        amount: amount.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      });
      setResult({ status: 'COMPLETED', data: res });
      setStep(2);
    } catch (err) {
      setResult({ status: 'FAILED', error: err });
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    idempotencyKeyRef.current = crypto.randomUUID();
    setPhone('');
    setCustomer(null);
    setAmount('');
    setFormErrors({});
    setResult(null);
    setStep(0);
  };

  // Cash out fee: 1.85% (0.01850)
  const fee = calculateFee(amount || '0.00', '0.00', 0.01850);
  const totalCustomerDebit = addMoney(amount || '0.00', fee);
  const currentFloat = dashData?.float_balance || '0.00';
  const floatAfter = addMoney(currentFloat, amount || '0.00');

  const steps = [{ title: 'Customer & amount' }, { title: 'Review' }, { title: 'Receipt' }];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Customer cash out"
        subtitle="Accept customer withdrawal: cash out adds to agent float while paying physical cash"
        backTo="/agent"
        backLabel="Back to Outlet"
      />

      <Stepper steps={steps} currentStep={step} />

      {/* Step 0: Input Form */}
      {step === 0 && (
        <Card title="Cash out parameters">
          <div className="mb-4 p-3 bg-surface-subtle border border-border rounded-[6px] flex items-center justify-between text-12">
            <span className="text-text-muted">Current agent float:</span>
            <MoneyText amount={currentFloat} weight="semibold" />
          </div>

          <form onSubmit={handleProceedToReview} className="space-y-4" noValidate>
            <div>
              <div className="flex items-end gap-2">
                <Input
                  label="Customer mobile number"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setCustomer(null);
                    setLookupError('');
                  }}
                  placeholder="01XXXXXXXXX"
                  error={formErrors.phone || lookupError}
                  className="flex-1"
                  required
                />
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => handleLookup()}
                  loading={lookupLoading}
                  loadingText="Looking up..."
                  disabled={!phone}
                  className="mb-0.5"
                >
                  Verify
                </Button>
              </div>

              {customer && (
                <div className="mt-2 p-2.5 rounded-[6px] bg-surface-subtle border border-border flex items-center justify-between text-12">
                  <div>
                    <span className="font-medium text-text block">{customer.name}</span>
                    <span className="text-text-muted font-mono">{customer.wallet_no}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={customer.wallet_status} />
                    <StatusBadge status={customer.kyc_status} />
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Cash out amount"
              prefix="৳"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              hint="Fee: 1.85% charged to customer"
              error={formErrors.amount}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full">
                Review cash out
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 1: Review */}
      {step === 1 && (
        <Card title="Review cash out">
          <KeyValue className="mb-6">
            <KeyValueRow
              label="Customer"
              value={customer ? `${customer.name} (${customer.wallet_no})` : phone}
            />
            <KeyValueRow label="Physical cash to give customer" value={<MoneyText amount={amount} weight="semibold" />} />
            <KeyValueRow label="Cash-out fee (1.85%)" value={<MoneyText amount={fee} />} />
            <KeyValueRow label="Total debit from customer" value={<MoneyText amount={totalCustomerDebit} weight="semibold" />} />
            <KeyValueRow
              label="Float balance after"
              value={<MoneyText amount={floatAfter} side="CREDIT" weight="medium" />}
            />
          </KeyValue>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setStep(0)} disabled={submitting} className="flex-1">
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmCashOut}
              loading={submitting}
              loadingText="Processing cash out..."
              className="flex-1"
            >
              Confirm and disburse cash
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Result */}
      {step === 2 && result && (
        <Card>
          {result.status === 'COMPLETED' ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-10 h-10 rounded-full bg-success-bg text-success mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>

              <div>
                <h2 className="text-20 font-semibold text-text">Cash out completed</h2>
                <p className="text-12 text-text-muted mt-1 font-mono">
                  Ref: {result.data?.reference_no}
                </p>
              </div>

              <div className="py-2">
                <MoneyText amount={result.data?.amount} size="28" weight="semibold" />
              </div>

              <KeyValue className="text-left">
                <KeyValueRow label="Customer" value={`${result.data?.customer_name} (${result.data?.customer_phone})`} />
                <KeyValueRow label="Fee charged (1.85%)" value={formatMoney(result.data?.fee_amount)} />
                <KeyValueRow label="Updated float balance" value={formatMoney(result.data?.float_after)} />
              </KeyValue>

              <div className="pt-4 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => navigate('/agent')}>
                  Return to outlet
                </Button>
                <Button variant="primary" onClick={handleReset}>
                  Another cash out
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-10 h-10 rounded-full bg-danger-bg text-danger mx-auto flex items-center justify-center">
                <AlertCircle size={24} />
              </div>

              <div>
                <h2 className="text-20 font-semibold text-danger">Cash out failed</h2>
                <p className="text-14 text-text-muted mt-1">
                  {getErrorMessage(result.error)}
                </p>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => navigate('/agent')}>
                  Return to outlet
                </Button>
                <Button variant="primary" onClick={handleReset}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
