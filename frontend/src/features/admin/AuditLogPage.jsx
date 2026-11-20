import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import { formatDate } from '../../lib/format';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const {
    data: auditData,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      adminApi.auditLogs({
        action: action || undefined,
        entity_type: entityType || undefined,
        search: search || undefined,
        page,
        pageSize: 10,
      }),
    [page, action, entityType, search]
  );

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleResetFilters = () => {
    setAction('');
    setEntityType('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System audit logs"
        subtitle="Immutable security audit trail capturing administrative modifications and parameter changes"
      />

      <FilterBar onReset={handleResetFilters}>
        <Input
          placeholder="Search by action, entity, actor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-56 sm:w-72"
        />

        <Select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All actions</option>
          <option value="FLOAT_LOAD">FLOAT_LOAD</option>
          <option value="CREATE_STAFF_USER">CREATE_STAFF_USER</option>
          <option value="KYC_APPROVE">KYC_APPROVE</option>
          <option value="KYC_REJECT">KYC_REJECT</option>
          <option value="WALLET_FREEZE">WALLET_FREEZE</option>
          <option value="CREATE_CASE">CREATE_CASE</option>
          <option value="CLOSE_CASE">CLOSE_CASE</option>
          <option value="REVERSE_TRANSACTION">REVERSE_TRANSACTION</option>
          <option value="UPDATE_RISK_RULE">UPDATE_RISK_RULE</option>
          <option value="SAVE_RISK_PARAMS">SAVE_RISK_PARAMS</option>
          <option value="UPDATE_FEE_RULE">UPDATE_FEE_RULE</option>
        </Select>

        <Select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All entities</option>
          <option value="USER">USER</option>
          <option value="WALLET">WALLET</option>
          <option value="ACCOUNT_HOLDER">ACCOUNT_HOLDER</option>
          <option value="FRAUD_CASE">FRAUD_CASE</option>
          <option value="RISK_RULE">RISK_RULE</option>
          <option value="TRANSACTION">TRANSACTION</option>
        </Select>
      </FilterBar>

      {loading && !auditData ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorState
          error={error}
          title="Could not load audit logs"
          onRetry={reload}
        />
      ) : (
        <div className="border border-border rounded-[8px] bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-14">
              <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted select-none">
                <tr>
                  <th className="w-8 px-3 py-2.5"></th>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target entity</th>
                  <th className="px-4 py-2.5 font-mono">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditData?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                      No audit logs match criteria.
                    </td>
                  </tr>
                ) : (
                  auditData?.items?.map((log) => {
                    const isExpanded = expandedId === log.audit_id;
                    const hasDiff = log.old_values || log.new_values;

                    return (
                      <React.Fragment key={log.audit_id}>
                        <tr
                          onClick={() => hasDiff && toggleExpand(log.audit_id)}
                          className={`transition-colors ${
                            hasDiff ? 'cursor-pointer hover:bg-surface-subtle' : ''
                          } ${isExpanded ? 'bg-surface-subtle' : 'bg-surface'}`}
                        >
                          <td className="px-3 py-3 text-center text-text-muted">
                            {hasDiff && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                          </td>
                          <td className="px-4 py-3 text-12 text-text-muted">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {log.actor_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-12 text-text font-semibold">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 text-12 text-text">
                            {log.entity_type}
                          </td>
                          <td className="px-4 py-3 font-mono text-12 text-text-muted">
                            #{log.entity_id}
                          </td>
                        </tr>

                        {/* Expandable Diff Row */}
                        {isExpanded && (
                          <tr className="bg-canvas border-b border-border">
                            <td colSpan={6} className="p-4">
                              <div className="bg-surface border border-border rounded-[6px] p-4">
                                <span className="text-12 font-medium text-text-muted uppercase tracking-wider block mb-3">
                                  State change snapshot diff
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-12 font-semibold text-text-muted block mb-1">
                                      Old values
                                    </span>
                                    <pre className="text-12 font-mono p-2.5 rounded-[4px] bg-surface-subtle border border-border overflow-x-auto text-text-muted">
                                      {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'null (Created)'}
                                    </pre>
                                  </div>

                                  <div>
                                    <span className="text-12 font-semibold text-text block mb-1">
                                      New values
                                    </span>
                                    <pre className="text-12 font-mono p-2.5 rounded-[4px] bg-primary-subtle/40 border border-primary/20 overflow-x-auto text-text">
                                      {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'null'}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {auditData && auditData.total > 0 && (
            <Pagination
              page={auditData.page}
              pageSize={auditData.pageSize}
              total={auditData.total}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}
    </div>
  );
}
