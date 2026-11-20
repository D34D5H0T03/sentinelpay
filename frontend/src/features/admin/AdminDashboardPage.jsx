import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import MoneyText from '../../components/ui/MoneyText';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useTheme } from '../../theme/ThemeContext';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatDate, formatMoney } from '../../lib/format';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const {
    data: dashData,
    loading,
    error,
    reload,
  } = useAsync(() => adminApi.dashboard());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
        </div>
        <Skeleton variant="rect" height={260} />
        <Skeleton variant="table" rows={4} />
      </div>
    );
  }

  if (error || !dashData) {
    return (
      <ErrorState
        error={error}
        title="Could not load admin dashboard"
        onRetry={reload}
      />
    );
  }

  const { stats, daily_volume, ledger_balanced, trial_balance, latest_audit } = dashData;

  const auditColumns = [
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actor_name',
      header: 'Actor',
      render: (r) => <span className="text-14 font-medium text-text">{r.actor_name}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => <span className="font-mono text-12 text-text">{r.action}</span>,
    },
    {
      key: 'entity_type',
      header: 'Target entity',
      render: (r) => (
        <span className="text-12 text-text-muted">
          {r.entity_type} #{r.entity_id}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System overview"
        subtitle="SentinelPay platform operations and double-entry ledger status"
      />

      {/* Exactly four stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Active users
          </span>
          <div className="mt-1 text-28 font-semibold text-text tabular-nums">
            {stats.active_users}
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">Verified & unverified</span>
        </Card>

        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Today volume
          </span>
          <div className="mt-1">
            <MoneyText amount={stats.today_volume} size="28" weight="semibold" />
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">Gross transferred today</span>
        </Card>

        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Fees today
          </span>
          <div className="mt-1">
            <MoneyText amount={stats.today_fees} size="28" weight="semibold" />
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">System fee revenue</span>
        </Card>

        <Card>
          <span className="text-12 font-medium text-text-muted uppercase tracking-wider block">
            Open alerts
          </span>
          <div className="mt-1 text-28 font-semibold text-text tabular-nums">
            {stats.open_alerts}
          </div>
          <span className="text-12 text-text-muted mt-0.5 block">Pending analyst review</span>
        </Card>
      </div>

      {/* Ledger Balanced Banner & Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger Integrity Indicator Card */}
        <Card title="Ledger status" className="lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {ledger_balanced ? (
                <div className="w-8 h-8 rounded-[6px] bg-success-bg text-success flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-[6px] bg-danger-bg text-danger flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
              )}
              <div>
                <span className="font-semibold text-15 text-text block">
                  {ledger_balanced ? 'Ledger strictly balanced' : 'Imbalance detected!'}
                </span>
                <span className="text-12 text-text-muted">
                  Double-entry verification
                </span>
              </div>
            </div>

            <p className="text-14 text-text-muted leading-relaxed">
              Every completed transaction balances across debit and credit journal entries. Zero money creation or destruction.
            </p>

            <div className="p-3 bg-surface-subtle border border-border rounded-[6px] flex items-center justify-between">
              <span className="text-12 text-text-muted">Trial balance sum:</span>
              <span className={`font-mono text-14 font-semibold ${ledger_balanced ? 'text-success' : 'text-danger'}`}>
                {formatMoney(trial_balance)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Link
              to="/admin/ledger"
              className="text-12 font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View ledger accounts & trial balance</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>

        {/* 14 Days Daily Volume Line Chart */}
        <Card
          title="Daily transfer volume"
          subtitle="Total transaction volume (BDT) over the past 14 days"
          className="lg:col-span-2"
        >
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily_volume || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#283646' : '#E2E4DE'} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: isDark ? '#94A3B8' : '#5F6B76', fontSize: 12 }} stroke={isDark ? '#3B4D61' : '#CDD1C8'} />
                <YAxis
                  tick={{ fill: isDark ? '#94A3B8' : '#5F6B76', fontSize: 12 }}
                  stroke={isDark ? '#3B4D61' : '#CDD1C8'}
                  tickFormatter={(val) => `৳ ${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  formatter={(val) => [`৳ ${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Volume']}
                  contentStyle={{
                    backgroundColor: isDark ? '#16202A' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#283646' : '#E2E4DE'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: isDark ? '#F0F4F8' : '#1F2933',
                  }}
                  itemStyle={{ color: isDark ? '#F0F4F8' : '#1F2933' }}
                  labelStyle={{ color: isDark ? '#94A3B8' : '#5F6B76' }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke={isDark ? '#2D9388' : '#1F6F66'}
                  strokeWidth={2}
                  dot={{ fill: isDark ? '#2D9388' : '#1F6F66', r: 3 }}
                  name="Volume"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 5 Latest Audit Entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-15 font-semibold text-text">Latest audit log entries</h2>
          <Link
            to="/admin/audit"
            className="text-12 font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>Full audit log</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <DataTable
          columns={auditColumns}
          data={latest_audit || []}
          keyField="audit_id"
          onRowClick={() => navigate('/admin/audit')}
          emptyMessage="No audit logs recorded."
        />
      </div>
    </div>
  );
}
