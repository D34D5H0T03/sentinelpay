import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatDate } from '../../lib/format';
import { ROLES, ROLE_LABELS } from '../../lib/constants';

export default function UsersListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Staff creation modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'FRAUD_ANALYST',
  });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');

  const {
    data: usersData,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      adminApi.listUsers({
        role: role || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize: 10,
      }),
    [page, role, status, search]
  );

  const handleResetFilters = () => {
    setRole('');
    setStatus('');
    setSearch('');
    setPage(1);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.phone.trim() || !staffForm.email.trim()) {
      setStaffError('All fields are required.');
      return;
    }

    setCreatingStaff(true);
    setStaffError('');
    try {
      await adminApi.createStaff({
        name: staffForm.name.trim(),
        phone: staffForm.phone.trim(),
        email: staffForm.email.trim(),
        roles: [staffForm.role],
      });
      showToast('Staff user created.', 'success');
      setStaffModalOpen(false);
      setStaffForm({ name: '', phone: '', email: '', role: 'FRAUD_ANALYST' });
      reload();
    } catch (err) {
      setStaffError(err.message || 'Could not create staff user.');
    } finally {
      setCreatingStaff(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Full name',
      render: (r) => (
        <div>
          <span className="font-medium text-text block">{r.name}</span>
          <span className="text-12 text-text-muted">{r.email || 'No email'}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (r) => <span className="font-mono text-12 text-text">{r.phone}</span>,
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.roles?.map((ro) => (
            <span key={ro} className="px-1.5 py-0.5 text-12 rounded-[4px] bg-neutral-bg text-text font-medium">
              {ROLE_LABELS[ro] || ro}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'kyc_status',
      header: 'KYC status',
      render: (r) => (r.kyc_status ? <StatusBadge status={r.kyc_status} /> : <span className="text-12 text-text-muted">—</span>),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'created_at',
      header: 'Registered',
      align: 'right',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User accounts"
        subtitle="Manage customers, agents, analysts, and administrative staff"
        action={
          <Button variant="primary" onClick={() => setStaffModalOpen(true)}>
            <UserPlus size={16} />
            <span>Create staff user</span>
          </Button>
        }
      />

      <FilterBar onReset={handleResetFilters}>
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-56 sm:w-72"
        />

        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All roles</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={v}>
              {ROLE_LABELS[v] || v}
            </option>
          ))}
        </Select>

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
          <option value="LOCKED">LOCKED</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </Select>
      </FilterBar>

      {loading && !usersData ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load users"
          onRetry={reload}
        />
      ) : (
        <DataTable
          columns={columns}
          data={usersData?.items || []}
          keyField="user_id"
          onRowClick={(row) => navigate(`/admin/users/${row.user_id}`)}
          pagination={usersData}
          onPageChange={(newPage) => setPage(newPage)}
          emptyMessage="No users matched your search criteria."
        />
      )}

      {/* Create Staff User Modal */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title="Create staff user"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <p className="text-14 text-text-muted">
            Staff users have direct administrative or analyst dashboard access.
          </p>

          {staffError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {staffError}
            </div>
          )}

          <Input
            label="Full name"
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            placeholder="e.g. Mehedi Hasan"
            required
          />

          <Input
            label="Phone number"
            type="tel"
            value={staffForm.phone}
            onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
            placeholder="017XXXXXXXX"
            required
          />

          <Input
            label="Official email address"
            type="email"
            value={staffForm.email}
            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            placeholder="staff@sentinelpay.test"
            required
          />

          <Select
            label="Assigned staff role"
            value={staffForm.role}
            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
            required
          >
            <option value="FRAUD_ANALYST">Fraud Analyst</option>
            <option value="ADMIN">Administrator</option>
            <option value="AUDITOR">Auditor (Read-only)</option>
          </Select>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setStaffModalOpen(false)}
              disabled={creatingStaff}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={creatingStaff}
              loadingText="Creating..."
            >
              Create staff user
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
