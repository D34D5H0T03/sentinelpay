import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as fraudApi from '../../api/fraud';

export default function FraudAnalyticsPage() {
  const {
    data: stats,
    loading,
    error,
    reload,
  } = useAsync(() => fraudApi.stats());

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" rows={2} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton variant="rect" height={260} />
          <Skeleton variant="rect" height={260} />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <ErrorState
        error={error}
        title="Could not load fraud analytics"
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud detection analytics"
        subtitle="Performance metrics for automated risk rules and analyst case resolutions"
        backTo="/fraud/alerts"
        backLabel="Back to Alerts"
      />

      {/* Two Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by Rule Bar Chart */}
        <Card title="Alerts by detection rule" subtitle="Distribution across active risk models">
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.alerts_by_rule || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E4DE" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#5F6B76', fontSize: 12 }} stroke="#CDD1C8" />
                <YAxis allowDecimals={false} tick={{ fill: '#5F6B76', fontSize: 12 }} stroke="#CDD1C8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E4DE',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#1F6F66" radius={[4, 4, 0, 0]} name="Alerts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Alerts per Day Line Chart */}
        <Card title="Alerts per day" subtitle="Last 14 days detection trend">
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.alerts_per_day || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E4DE" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#5F6B76', fontSize: 12 }} stroke="#CDD1C8" />
                <YAxis allowDecimals={false} tick={{ fill: '#5F6B76', fontSize: 12 }} stroke="#CDD1C8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E4DE',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#2F6690"
                  strokeWidth={2}
                  dot={{ fill: '#2F6690', r: 3 }}
                  name="Alerts"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Two Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* False Positive Rate Table */}
        <Card title="False-positive rate by rule" subtitle="Precision assessment from closed investigation cases">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-14 border-collapse">
              <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Rule name</th>
                  <th className="px-4 py-2.5 text-right">Total alerts</th>
                  <th className="px-4 py-2.5 text-right">False positives</th>
                  <th className="px-4 py-2.5 text-right">FP rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.false_positive_rate?.map((row) => (
                  <tr key={row.rule} className="hover:bg-surface-subtle">
                    <td className="px-4 py-2.5 font-medium text-text">{row.rule}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text">{row.total}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text">{row.falsePositives}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-text">{row.fpRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Open Cases per Analyst Table */}
        <Card title="Open cases per analyst" subtitle="Workload distribution across team members">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-14 border-collapse">
              <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted">
                <tr>
                  <th className="px-4 py-2.5">Analyst</th>
                  <th className="px-4 py-2.5 text-right">Active open</th>
                  <th className="px-4 py-2.5 text-right">Completed closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.open_cases_per_analyst?.map((a) => (
                  <tr key={a.analyst_id} className="hover:bg-surface-subtle">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-text block">{a.name}</span>
                      <span className="text-12 text-text-muted block">{a.email}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-primary">
                      {a.open_cases}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                      {a.closed_cases}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
