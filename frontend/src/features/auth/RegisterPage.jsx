import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { isValidPhone } from '../../lib/validators';
import { getErrorMessage } from '../../lib/errors';

export default function RegisterPage() {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    date_of_birth: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (field) => {
    if (field === 'phone' && form.phone && !isValidPhone(form.phone)) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Enter an 11-digit Bangladeshi mobile number starting with 013-019.',
      }));
    }
    if (field === 'confirmPassword' && form.confirmPassword && form.password !== form.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: 'Passwords do not match.',
      }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required.';
    if (!form.phone) {
      errs.phone = 'Phone number is required.';
    } else if (!isValidPhone(form.phone)) {
      errs.phone = 'Enter an 11-digit Bangladeshi mobile number starting with 013-019.';
    }
    if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required.';
    if (!form.address.trim()) errs.address = 'Residential address is required.';
    if (!form.password) errs.password = 'Password is required.';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth,
        address: form.address.trim(),
        password: form.password,
      });
      setSuccess(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface border border-border rounded-[8px] p-6 text-center space-y-4 shadow-sm">
            <h2 className="text-20 font-semibold text-text">Account created successfully</h2>
            <p className="text-14 text-text-muted leading-relaxed">
              Your customer account and primary wallet have been created. New accounts start with status <span className="font-medium text-text">Unverified</span> until identity verification is completed.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Sign in now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="text-center">
          <h1 className="text-20 font-semibold text-text tracking-tight">SentinelPay</h1>
          <p className="text-14 text-text-muted mt-1">
            Open a new personal wallet account
          </p>
        </div>

        <div className="mt-6 bg-surface border border-border rounded-[8px] p-6 shadow-sm">
          <h2 className="text-15 font-semibold text-text mb-4">Register new account</h2>

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
              label="Full name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Kabir Ahmed"
              error={errors.name}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone number"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                onBlur={() => handleBlur('phone')}
                placeholder="017XXXXXXXX"
                error={errors.phone}
                required
              />

              <Input
                label="Date of birth"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={handleChange}
                error={errors.date_of_birth}
                required
              />
            </div>

            <Input
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="House/Road, Area, District"
              error={errors.address}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                error={errors.password}
                required
              />

              <Input
                label="Confirm password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Repeat password"
                error={errors.confirmPassword}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              loadingText="Creating account..."
              className="w-full mt-2"
            >
              Register account
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-14 text-text-muted">Already have an account? </span>
            <Link to="/login" className="text-14 text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
