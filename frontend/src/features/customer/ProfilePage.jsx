import React, { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import KeyValue, { KeyValueRow } from '../../components/ui/KeyValue';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/format';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [address, setAddress] = useState(user?.address || '');
  const [addressSaving, setAddressSaving] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    setAddressSaving(true);
    // Simulating profile update
    setTimeout(() => {
      setAddressSaving(false);
      showToast('Address updated successfully.', 'success');
      if (user) user.address = address.trim();
      refreshUser();
    }, 300);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    setTimeout(() => {
      setPasswordSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully.', 'success');
    }, 350);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Profile & settings"
        subtitle="Manage your personal information, address, and login credentials"
      />

      {/* Account Info Card with KYC Badge */}
      <Card title="Account details">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
              Identity verification status
            </span>
            <span className="text-14 text-text mt-0.5 block">
              Verification is required to unlock maximum daily transaction limits.
            </span>
          </div>
          <StatusBadge status={user?.kyc_status || 'UNVERIFIED'} />
        </div>

        <KeyValue className="py-2">
          <KeyValueRow label="Full name" value={user?.name} />
          <KeyValueRow label="Phone number" value={user?.phone} mono />
          <KeyValueRow label="Email address" value={user?.email || 'Not provided'} />
          <KeyValueRow label="Date of birth" value={user?.date_of_birth} />
          <KeyValueRow label="Account created" value={formatDate(user?.created_at)} />
        </KeyValue>
      </Card>

      {/* Editable Address Card */}
      <Card title="Residential address" subtitle="Used for identity verification and correspondence">
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <Input
            label="Street and area address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House, Road, Area, District"
            required
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              loading={addressSaving}
              loadingText="Saving..."
            >
              Update address
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card title="Change password" subtitle="Keep your mobile financial account secure">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {passwordError}
            </div>
          )}

          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />

            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={passwordSaving}
              loadingText="Updating..."
            >
              Change password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
