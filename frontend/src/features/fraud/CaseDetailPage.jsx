import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Send, Check } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Timeline from '../../components/ui/Timeline';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { useAsync } from '../../lib/useAsync';
import * as fraudApi from '../../api/fraud';
import { formatDate } from '../../lib/format';
import {
  CASE_OUTCOMES,
  CASE_OUTCOME_LABELS,
  RISK_RULE_LABELS,
} from '../../lib/constants';

export default function CaseDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();

  const {
    data: fraudCase,
    loading,
    error,
    reload,
  } = useAsync(() => fraudApi.getCase(id), [id]);

  // Add note form state
  const [noteBody, setNoteBody] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Close case modal state
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [outcome, setOutcome] = useState('CONFIRMED_FRAUD');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  const isClosed = fraudCase?.status === 'CLOSED';

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteBody.trim()) return;

    setAddingNote(true);
    try {
      await fraudApi.addCaseEvent(id, { body: noteBody.trim() });
      showToast('Note added to case event log.', 'success');
      setNoteBody('');
      reload();
    } catch (err) {
      showToast(err.message || 'Could not add note.', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const handleCloseCase = async (e) => {
    e.preventDefault();
    if (!closeNote.trim()) {
      setCloseError('A closing summary note is required.');
      return;
    }

    setClosing(true);
    setCloseError('');
    try {
      await fraudApi.closeCase(id, { outcome, note: closeNote.trim() });
      showToast('Case closed successfully.', 'info');
      setCloseModalOpen(false);
      reload();
    } catch (err) {
      setCloseError(err.message || 'Could not close case.');
    } finally {
      setClosing(false);
    }
  };

  const handleAnalystChange = async (e) => {
    const newAnalystId = e.target.value;
    try {
      await fraudApi.updateCase(id, { assignedAnalystId: Number(newAnalystId) });
      showToast('Analyst reassigned.', 'success');
      reload();
    } catch (err) {
      showToast(err.message || 'Could not reassign analyst.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton variant="text" rows={2} />
        <Skeleton variant="rect" height={160} />
        <Skeleton variant="table" rows={4} />
      </div>
    );
  }

  if (error || !fraudCase) {
    return (
      <ErrorState
        error={error}
        title="Could not load fraud case"
        onRetry={reload}
      />
    );
  }

  const alertColumns = [
    {
      key: 'alert_id',
      header: 'Alert ID',
      render: (r) => (
        <Link
          to={`/fraud/alerts/${r.alert_id}`}
          className="font-mono text-12 font-medium text-primary hover:underline"
        >
          #{r.alert_id}
        </Link>
      ),
    },
    {
      key: 'rule_code',
      header: 'Rule',
      render: (r) => <span>{RISK_RULE_LABELS[r.rule_code] || r.rule_code}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => <StatusBadge status={r.severity} />,
    },
    {
      key: 'wallet_no',
      header: 'Wallet',
      render: (r) => <span className="font-mono text-12 text-text">{r.wallet_no}</span>,
    },
    {
      key: 'status',
      header: 'Alert status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'created_at',
      header: 'Triggered at',
      align: 'right',
      render: (r) => <span className="text-12 text-text-muted">{formatDate(r.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Investigation Case: ${fraudCase.case_no}`}
        subtitle={`Opened ${formatDate(fraudCase.opened_at)}${fraudCase.closed_at ? ` · Closed ${formatDate(fraudCase.closed_at)}` : ''}`}
        backTo="/fraud/cases"
        backLabel="Back to Cases"
        action={
          !isClosed && (
            <Button variant="primary" onClick={() => setCloseModalOpen(true)}>
              <CheckCircle2 size={16} />
              <span>Close case</span>
            </Button>
          )
        }
      />

      {/* Header Case Details Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={fraudCase.status} />
            {fraudCase.outcome && (
              <span className="text-12 font-semibold text-text px-2 py-0.5 rounded-[4px] bg-neutral-bg">
                Outcome: {CASE_OUTCOME_LABELS[fraudCase.outcome] || fraudCase.outcome}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-12 font-medium text-text-muted">Assigned analyst:</span>
            {!isClosed ? (
              <Select
                value={fraudCase.assigned_analyst_id || ''}
                onChange={handleAnalystChange}
                className="w-44"
              >
                <option value="2">Farhana Yasmin</option>
                <option value="1">Tariqul Islam</option>
              </Select>
            ) : (
              <span className="text-14 font-medium text-text">{fraudCase.assigned_analyst_name}</span>
            )}
          </div>
        </div>

        {fraudCase.note && (
          <div className="mt-4 p-3 rounded-[6px] bg-surface-subtle border border-border text-14 text-text">
            <span className="font-semibold block mb-0.5">Case summary</span>
            <p className="text-text-muted leading-relaxed">{fraudCase.note}</p>
          </div>
        )}
      </Card>

      {/* Linked Risk Alerts */}
      <Card title={`Linked risk alerts (${fraudCase.alerts?.length || 0})`}>
        <DataTable
          columns={alertColumns}
          data={fraudCase.alerts || []}
          keyField="alert_id"
          emptyMessage="No risk alerts currently linked to this case."
        />
      </Card>

      {/* Case Events Timeline */}
      <Card title="Investigation audit trail">
        <Timeline events={fraudCase.events || []} />
      </Card>

      {/* Add Note Form (if open) */}
      {!isClosed && (
        <Card title="Add analyst log note">
          <form onSubmit={handleAddNote} className="space-y-3">
            <Textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Record findings, interview notes, or recommendations..."
              rows={3}
              required
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="secondary"
                loading={addingNote}
                loadingText="Posting..."
              >
                <Send size={14} />
                <span>Post note</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Close Case Modal */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title={`Close case ${fraudCase.case_no}`}
      >
        <form onSubmit={handleCloseCase} className="space-y-4">
          <p className="text-14 text-text-muted">
            Select a conclusive outcome and record justification. Closing a case is logged permanently in the system audit trail.
          </p>

          {closeError && (
            <div className="p-3 rounded-[6px] bg-danger-bg text-12 text-danger">
              {closeError}
            </div>
          )}

          <Select
            label="Investigation outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            required
          >
            {Object.entries(CASE_OUTCOMES).map(([k, v]) => (
              <option key={k} value={v}>
                {CASE_OUTCOME_LABELS[v] || v}
              </option>
            ))}
          </Select>

          <Textarea
            label="Closing note & justification"
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            placeholder="Document evidence supporting this conclusion..."
            rows={3}
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setCloseModalOpen(false)}
              disabled={closing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={closing}
              loadingText="Closing case..."
            >
              Confirm closure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
