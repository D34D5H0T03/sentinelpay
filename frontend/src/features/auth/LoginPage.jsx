import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import DemoAccounts from './DemoAccounts';
import { isValidPhone } from '../../lib/validators';
import { getErrorMessage } from '../../lib/errors';

export default function LoginPage() {
  const { login, getRoleHome } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!phone) {
      newErrors.phone = 'Phone number is required.';
    } else if (!isValidPhone(phone)) {
      newErrors.phone = 'Enter an 11-digit Bangladeshi mobile number (013-019).';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    if (field === 'phone' && phone && !isValidPhone(phone)) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Enter an 11-digit Bangladeshi mobile number (013-019).',
      }));
    } else if (field === 'phone' && phone && isValidPhone(phone)) {
      setErrors((prev) => ({ ...prev, phone: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const loggedUser = await login(phone, password);
      const destination = location.state?.from?.pathname || getRoleHome(loggedUser);
      navigate(destination, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (demoPhone, demoPassword) => {
    setPhone(demoPhone);
    setPassword(demoPassword);
    setErrors({});
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-20 font-semibold text-text tracking-tight">SentinelPay</h1>
          <p className="text-14 text-text-muted mt-1">
            Mobile financial service ledger simulation
          </p>
        </div>

        <div className="mt-6 bg-surface border border-border rounded-[8px] p-6 shadow-sm">
          <h2 className="text-15 font-semibold text-text mb-4">Sign in to your account</h2>

          {formError && (
            <div
              className="p-3 mb-4 rounded-[6px] bg-danger-bg border border-danger/30 text-12 text-danger"
              role="alert"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Phone number"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="017XXXXXXXX"
              error={errors.phone}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={errors.password}
              required
            />

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              loadingText="Signing in..."
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-14 text-text-muted">Do not have an account? </span>
            <Link to="/register" className="text-14 text-primary font-medium hover:underline">
              Register here
            </Link>
          </div>

          <DemoAccounts onSelect={handleFillDemo} />
        </div>
      </div>
    </div>
  );
}
