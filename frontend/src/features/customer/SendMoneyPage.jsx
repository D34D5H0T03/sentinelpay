import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Stepper from '../../components/ui/Stepper';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import MoneyText from '../../components/ui/MoneyText';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as walletsApi from '../../api/wallets';
import * as benApi from '../../api/beneficiaries';
import * as txApi from '../../api/transactions';
import { isValidPhone, isValidAmount } from '../../lib/validators';
import { getErrorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { subtractMoney } from '../../lib/money';

export default function SendMoneyPage() {
  const navigate = useNavigate();

  // 3-step state: 0 = Enter details, 1 = Review, 2 = Result
  const [step, setStep] = useState(0);

  // Form state
  const [fromWalletId, setFromWalletId] = useState('');
  const [recipientWalletNo, setRecipientWalletNo] = useState('');
  const [recipientLookup, setRecipientLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');

  const [formErrors, setFormErrors] = useState({});
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status: 'COMPLETED' | 'FAILED', data, error }

  // Idempotency key per form lifecycle
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  // Load wallets and beneficiaries
  const {
    data: wallets,
    loading: walletsLoading,
    error: walletsError,
  } = useAsync(() => walletsApi.listWallets());

  const {
    data: beneficiaries,
    loading: benLoading,
  } = useAsync(() => benApi.list());

  // Default fromWalletId once wallets load
  useEffect(() => {
    if (wallets && wallets.length > 0 && !fromWalletId) {
      setFromWalletId(String(wallets[0].wallet_id));
    }
  }, [wallets, fromWalletId]);

  const selectedWallet = wallets?.find((w) => String(w.wallet_id) === String(fromWalletId));

  // Recipient verification lookup
  const handleCheckRecipient = async (walletNoToCheck = recipientWalletNo) => {
    const cleanNo = String(walletNoToCheck).trim();
    if (!cleanNo) {
      setLookupError('Enter a wallet number to check.');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    setRecipientLookup(null);

    try {
      const data = await walletsApi.lookupWallet(cleanNo);
      setRecipientLookup(data);
    } catch (err) {
      setLookupError(getErrorMessage(err));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleBeneficiarySelect = (e) => {
    const val = e.target.value;
    setSelectedBeneficiary(val);
    if (val) {
      const ben = beneficiaries?.find((b) => String(b.beneficiary_id) === val);
      if (ben) {
        setRecipientWalletNo(ben.wallet_no);
        handleCheckRecipient(ben.wallet_no);
      }
    }
  };

  const validateStep1 = () => {
    const errs = {};
    if (!fromWalletId) errs.fromWalletId = 'Select a source wallet.';
    if (!recipientWalletNo) {
      errs.recipientWalletNo = 'Recipient wallet number is required.';
    } else if (!isValidPhone(recipientWalletNo) && !recipientWalletNo.startsWith('AG-')) {
      errs.recipientWalletNo = 'Enter a valid wallet number.';
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
    if (!validateStep1()) return;

    setQuoteLoading(true);
    try {
      const quote = await txApi.quote({ type: 'SEND_MONEY', amount });
      setQuoteData(quote);
      setStep(1); // Proceed to review step
    } catch (err) {
      setFormErrors({ general: getErrorMessage(err) });
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    setSubmitting(true);
    try {
      const res = await txApi.send({
        fromWalletId,
        toWalletNo: recipientWalletNo.trim(),
        amount,
        note: note.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      });
      setResult({ status: 'COMPLETED', data: res });
      setStep(2); // Result step
    } catch (err) {
      setResult({ status: 'FAILED', error: err });
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNew = () => {
    idempotencyKeyRef.current = crypto.randomUUID();
    setAmount('');
    setNote('');
    setRecipientWalletNo('');
    setRecipientLookup(null);
    setSelectedBeneficiary('');
    setFormErrors({});
    setResult(null);
    setStep(0);
  };

  if (walletsLoading || benLoading) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <Skeleton variant="text" rows={2} />
        <Skeleton variant="rect" height={260} />
      </div>
    );
  }

  if (walletsError) {
    return (
      <ErrorState
        error={walletsError}
        title="Could not load send money form"
        onRetry={() => window.location.reload()}
      />
    );
  }

  const stepsList = [
    { title: 'Details' },
    { title: 'Review' },
    { title: 'Receipt' },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Send money"
        subtitle="Transfer funds to any SentinelPay wallet instantly"
        backTo="/dashboard"
        backLabel="Back to Overview"
      />

      <Stepper steps={stepsList} currentStep={step} />

      {/* Step 0: Input Form */}
      {step === 0 && (
        <Card title="Payment details">
          <form onSubmit={handleProceedToReview} className="space-y-4" noValidate>
            {formErrors.general && (
              <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
                {formErrors.general}
              </div>
            )}

            {/* From Wallet */}
            <Select
              label="From wallet"
              name="fromWalletId"
              value={fromWalletId}
              onChange={(e) => setFromWalletId(e.target.value)}
              error={formErrors.fromWalletId}
              required
            >
              {wallets?.map((w) => (
                <option key={w.wallet_id} value={w.wallet_id}>
                  {w.label} ({w.wallet_no}) — Available: {formatMoney(w.balance)}
                </option>
              ))}
            </Select>

            {/* Beneficiaries shortcut */}
            {beneficiaries && beneficiaries.length > 0 && (
              <Select
                label="Choose saved beneficiary"
                value={selectedBeneficiary}
                onChange={handleBeneficiarySelect}
                placeholder="Select a saved beneficiary (optional)"
              >
                <option value="">Select a saved beneficiary</option>
                {beneficiaries.map((b) => (
                  <option key={b.beneficiary_id} value={b.beneficiary_id}>
                    {b.nickname} ({b.wallet_no})
                  </option>
                ))}
              </Select>
            )}

            {/* Recipient Wallet + Check Lookup */}
            <div>
              <div className="flex items-end gap-2">
                <Input
                  label="Recipient wallet number"
                  name="recipientWalletNo"
                  type="text"
                  value={recipientWalletNo}
                  onChange={(e) => {
                    setRecipientWalletNo(e.target.value);
                    setRecipientLookup(null);
                    setLookupError('');
                  }}
                  placeholder="01XXXXXXXXX"
                  error={formErrors.recipientWalletNo || lookupError}
                  className="flex-1"
                  required
                />
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => handleCheckRecipient()}
                  loading={lookupLoading}
                  loadingText="Checking..."
                  disabled={!recipientWalletNo}
                  className="mb-0.5"
                >
                  Check
                </Button>
              </div>

              {/* Masked name indicator */}
              {recipientLookup && (
                <div className="mt-1.5 p-2 rounded-[6px] bg-surface-subtle border border-border text-12 text-text flex items-center justify-between">
                  <span>
                    Recipient: <strong className="font-medium">{recipientLookup.masked_name}</strong>
                  </span>
                  <span className="text-success font-medium">Verified account</span>
                </div>
              )}
            </div>

            {/* Amount */}
            <Input
              label="Amount"
              name="amount"
              type="text"
              prefix="৳"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              hint="Fee: ৳ 5.00 flat"
              error={formErrors.amount}
              required
            />

            {/* Optional note */}
            <Textarea
              label="Note (optional)"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this transfer for?"
              rows={2}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={quoteLoading}
                loadingText="Calculating fee..."
                className="w-full"
              >
                Continue to review
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 1: Review */}
      {step === 1 && quoteData && (
        <Card title="Review transfer details">
          <p className="text-14 text-text-muted mb-4">
            Please confirm the recipient and transaction amounts before proceeding.
          </p>

          <KeyValue className="mb-6">
            <KeyValueRow
              label="From wallet"
              value={`${selectedWallet?.label} (${selectedWallet?.wallet_no})`}
            />
            <KeyValueRow
              label="Recipient"
              value={
                recipientLookup ? `${recipientLookup.masked_name} (${recipientWalletNo})` : recipientWalletNo
              }
              mono={!recipientLookup}
            />
            <KeyValueRow
              label="Transfer amount"
              value={<MoneyText amount={amount} weight="semibold" />}
            />
            <KeyValueRow
              label="Service fee"
              value={<MoneyText amount={quoteData.fee} />}
            />
            <KeyValueRow
              label="Total debit from wallet"
              value={<MoneyText amount={quoteData.total_debit} weight="semibold" />}
            />
            <KeyValueRow
              label="Balance after transfer"
              value={
                <MoneyText
                  amount={subtractMoney(selectedWallet?.balance || '0.00', quoteData.total_debit)}
                  weight="medium"
                />
              }
            />
            {note && <KeyValueRow label="Note" value={note} />}
          </KeyValue>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep(0)}
              disabled={submitting}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSend}
              loading={submitting}
              loadingText="Sending money..."
              className="flex-1"
            >
              Confirm and send
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
                <h2 className="text-20 font-semibold text-text">Money sent successfully</h2>
                <p className="text-12 text-text-muted mt-1 font-mono">
                  Ref: {result.data?.reference_no}
                </p>
              </div>

              <div className="py-2">
                <MoneyText amount={result.data?.amount} size="28" weight="semibold" />
              </div>

              <KeyValue className="text-left">
                <KeyValueRow
                  label="Recipient"
                  value={recipientLookup ? `${recipientLookup.masked_name} (${recipientWalletNo})` : recipientWalletNo}
                />
                <KeyValueRow
                  label="Fee charged"
                  value={formatMoney(result.data?.fee_amount)}
                />
                <KeyValueRow
                  label="Total debit"
                  value={formatMoney(quoteData?.total_debit)}
                />
                <KeyValueRow
                  label="Date"
                  value={new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}
                />
              </KeyValue>

              <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="secondary" onClick={handleResetForNew}>
                  Send another transfer
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/transactions/${result.data?.transaction_id}`)}
                >
                  View receipt
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-10 h-10 rounded-full bg-danger-bg text-danger mx-auto flex items-center justify-center">
                <AlertCircle size={24} />
              </div>

              <div>
                <h2 className="text-20 font-semibold text-danger">Transfer failed</h2>
                <p className="text-14 text-text-muted mt-1">
                  {getErrorMessage(result.error)}
                </p>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  Return to overview
                </Button>
                <Button variant="primary" onClick={handleResetForNew}>
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
