import React, { useState } from 'react';
import { Play, Save, Check } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as adminApi from '../../api/admin';
import * as fraudApi from '../../api/fraud';
import { RISK_SEVERITIES, RISK_RULE_LABELS } from '../../lib/constants';

export default function RiskRulesPage() {
  const { showToast } = useToast();

  const {
    data: riskRules,
    loading,
    error,
    reload,
  } = useAsync(() => adminApi.listRiskRules());

  const [editableRules, setEditableRules] = useState([]);
  const [runningRules, setRunningRules] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // Sync state once rules load
  React.useEffect(() => {
    if (riskRules) {
      setEditableRules(JSON.parse(JSON.stringify(riskRules)));
    }
  }, [riskRules]);

  const handleToggleActive = (ruleId) => {
    setEditableRules((prev) =>
      prev.map((r) => (r.rule_id === ruleId ? { ...r, is_active: !r.is_active } : r))
    );
  };

  const handleSeverityChange = (ruleId, newSeverity) => {
    setEditableRules((prev) =>
      prev.map((r) => (r.rule_id === ruleId ? { ...r, severity: newSeverity } : r))
    );
  };

  const handleParamChange = (ruleId, paramName, val) => {
    setEditableRules((prev) =>
      prev.map((r) => {
        if (r.rule_id === ruleId) {
          return {
            ...r,
            params: {
              ...r.params,
              [paramName]: val,
            },
          };
        }
        return r;
      })
    );
  };

  const handleSaveRule = async (rule) => {
    setSavingId(rule.rule_id);
    try {
      await adminApi.updateRiskRule(rule.rule_id, {
        is_active: rule.is_active,
        severity: rule.severity,
      });
      await adminApi.saveRiskParams(rule.rule_id, rule.params);
      showToast(`Rule ${rule.rule_code} parameters saved.`, 'success');
      reload();
    } catch (err) {
      showToast(err.message || 'Could not save rule.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleRunRulesNow = async () => {
    setRunningRules(true);
    try {
      const res = await fraudApi.runRules();
      showToast(`Risk rules executed. ${res.alerts_created} new alerts triggered.`, 'success');
      reload();
    } catch (err) {
      showToast(err.message || 'Could not run risk rules.', 'error');
    } finally {
      setRunningRules(false);
    }
  };

  if (loading && editableRules.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" rows={2} />
        <Skeleton variant="rect" height={200} />
        <Skeleton variant="rect" height={200} />
      </div>
    );
  }

  if (error && editableRules.length === 0) {
    return (
      <ErrorState
        error={error}
        title="Could not load risk rules"
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Fraud risk rules & tuning"
        subtitle="Manage detection thresholds, evaluation windows, and severity ratings"
        action={
          <Button
            variant="primary"
            onClick={handleRunRulesNow}
            loading={runningRules}
            loadingText="Evaluating transactions..."
          >
            <Play size={16} />
            <span>Run rules now</span>
          </Button>
        }
      />

      <div className="space-y-6">
        {editableRules.map((rule) => {
          const isSaving = savingId === rule.rule_id;

          return (
            <Card key={rule.rule_id} className="space-y-4">
              {/* Header with Title and Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-15 text-text">
                      {RISK_RULE_LABELS[rule.rule_code] || rule.rule_code}
                    </span>
                    <span className="font-mono text-12 text-text-muted">({rule.rule_code})</span>
                  </div>
                  <p className="text-12 text-text-muted mt-0.5">{rule.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 text-12 font-medium text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => handleToggleActive(rule.rule_id)}
                      className="w-4 h-4 rounded-[4px] border-border-strong text-primary focus:ring-primary cursor-pointer"
                    />
                    <span>{rule.is_active ? 'Active' : 'Disabled'}</span>
                  </label>

                  {/* Severity Select */}
                  <Select
                    value={rule.severity}
                    onChange={(e) => handleSeverityChange(rule.rule_id, e.target.value)}
                    className="w-32"
                  >
                    {Object.entries(RISK_SEVERITIES).map(([k, v]) => (
                      <option key={k} value={v}>
                        {v} severity
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Editable Parameters Rows */}
              <div>
                <span className="text-12 font-medium text-text-muted uppercase tracking-wider block mb-2">
                  Tunable rule parameters
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(rule.params || {}).map(([paramName, paramValue]) => (
                    <Input
                      key={paramName}
                      label={paramName.replace(/_/g, ' ')}
                      value={paramValue}
                      onChange={(e) => handleParamChange(rule.rule_id, paramName, e.target.value)}
                      placeholder="Param value"
                      required
                    />
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-border flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSaveRule(rule)}
                  loading={isSaving}
                  loadingText="Saving..."
                >
                  <Save size={14} />
                  <span>Save parameters</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
