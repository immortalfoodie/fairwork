import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { txProposeAmendment } from '../../chain/transactions.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Calendar, AlertCircle } from 'lucide-react';

export default function ProposeAmendmentModal({
  isOpen,
  onClose,
  agreement,
  onSuccess
}) {
  const { isMock } = useWallet() || {};
  const toast = useToast();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const milestones = agreement?.terms?.milestones || [];

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!newDeadlineDate) {
      toast.error('Please select new deadline');
      return;
    }

    const newDeadlineSec = Math.floor(new Date(newDeadlineDate).getTime() / 1000);
    if (newDeadlineSec <= Math.floor(Date.now() / 1000)) {
      toast.warning('New deadline must be in the future');
      return;
    }

    try {
      setIsSubmitting(true);
      let toastId = null;

      // Create new terms clone with updated deadline
      const updatedTerms = JSON.parse(JSON.stringify(agreement.terms));
      if (updatedTerms.milestones?.[selectedIdx]) {
        updatedTerms.milestones[selectedIdx].deadline = new Date(newDeadlineSec * 1000).toISOString();
      }

      if (agreement.onchainId !== null && agreement.onchainId !== undefined) {
        try {
          await txProposeAmendment(
            agreement.onchainId,
            selectedIdx,
            newDeadlineSec,
            updatedTerms,
            '',
            {
              onPending: (hash) => {
                toastId = toast.pendingTx(hash, 'Proposing deadline amendment on-chain...');
              },
              onSuccess: (rec) => {
                if (toastId) toast.confirmedTx(toastId, rec.hash, 'Amendment proposed on-chain!');
              },
              onError: (err) => {
                if (toastId) toast.failedTx(toastId, err);
              }
            }
          );
        } catch (chainErr) {
          if (isMock) {
            console.warn('On-chain proposeAmendment skipped in mock mode:', chainErr?.message || chainErr);
          } else {
            throw chainErr;
          }
        }
      }

      toast.success('Amendment proposed! Awaiting counterparty acceptance.');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to propose amendment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose Milestone Deadline Amendment"
      subtitle="Request a bilateral deadline extension with counterparty consent"
      maxWidth="max-w-md"
    >
      <form onSubmit={handlePropose} className="space-y-4">
        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
            Select Milestone to Amend
          </label>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="w-full bg-white border border-gray focus:border-forest rounded-[10px] px-3.5 py-2.5 text-xs text-ink focus:outline-none transition-colors"
          >
            {milestones.map((m, i) => (
              <option key={i} value={i}>
                Milestone #{i + 1}: {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
            Proposed New Deadline
          </label>
          <div className="flex items-center gap-2 bg-white border border-gray focus-within:border-forest rounded-[10px] px-3.5 py-2.5 transition-colors">
            <Calendar className="w-4 h-4 text-ink/40 shrink-0" />
            <input
              type="datetime-local"
              value={newDeadlineDate}
              onChange={(e) => setNewDeadlineDate(e.target.value)}
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink/40 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="p-3.5 rounded-card bg-sage/60 border border-forest/20 text-xs text-ink/80 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-forest shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            The counterparty will receive a pending amendment notice. Once accepted, the contract updates the milestone deadline without retroactive lateness penalties.
          </p>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-gray">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
            Propose Amendment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

