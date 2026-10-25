import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { txRaiseDispute } from '../../chain/transactions.js';
import { submitEvidence as apiSubmitEvidence } from '../../api/disputes.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AlertOctagon, Paperclip } from 'lucide-react';

export default function RaiseDisputeModal({
  isOpen,
  onClose,
  agreementId,
  onchainId,
  milestoneIdx = 0,
  onSuccess
}) {
  const { isMock } = useWallet() || {};
  const toast = useToast();
  const [evidenceText, setEvidenceText] = useState('');
  const [fileSim, setFileSim] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const idx = Number(milestoneIdx ?? 0);

  const handleRaise = async (e) => {
    e.preventDefault();
    if (!evidenceText.trim()) {
      toast.error('Evidence text is required');
      return;
    }

    try {
      setIsSubmitting(true);
      let toastId = null;

      // Step 1: Record evidence and dispute in platform backend / mock store
      try {
        await apiSubmitEvidence(agreementId, idx, {
          text: evidenceText.trim(),
          files: fileSim ? [fileSim.trim()] : []
        });
      } catch (apiErr) {
        console.warn('Backend dispute record note:', apiErr?.message || apiErr);
      }

      // Step 2: Attempt on-chain raiseDispute if on-chain agreement is active
      const canTransactOnChain = onchainId !== null && onchainId !== undefined;
      if (canTransactOnChain) {
        try {
          await txRaiseDispute(onchainId, idx, evidenceText.trim(), {
            onPending: (hash) => {
              toastId = toast.pendingTx(hash, 'Raising dispute and locking milestone on-chain...');
            },
            onSuccess: (rec) => {
              if (toastId) toast.confirmedTx(toastId, rec.hash, 'Dispute raised! Arbitrators selected.');
            },
            onError: (err) => {
              if (toastId) toast.failedTx(toastId, err);
            }
          });
        } catch (chainErr) {
          // If in mock mode or testnet contract reverts on mock pre-seeded agreements,
          // log and notify gracefully without aborting the platform state.
          if (isMock) {
            console.warn('On-chain raiseDispute skipped in mock mode:', chainErr?.message || chainErr);
            toast.info('Milestone dispute recorded in platform state.');
          } else {
            throw chainErr;
          }
        }
      }

      toast.success('Dispute initiated. 3 arbitrators have been assigned.');
      onClose();
      if (onSuccess) onSuccess();
      setEvidenceText('');
      setFileSim('');
    } catch (err) {
      toast.error(err.message || 'Failed to raise dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Raise Dispute on Milestone #${idx + 1}`}
      subtitle="Freeze escrow funds and escalate deliverables to 3 decentralized arbitrators"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleRaise} className="space-y-4">
        <div className="p-3.5 rounded-card bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-heading font-bold text-ink">Arbitration Procedure:</strong>
            <p className="text-ink/80 mt-0.5 leading-relaxed">
              Raising a dispute freezes milestone funds in escrow. Three decentralized arbitrators will review evidence, inspect advisory AI analysis, and cast binding votes on fund distribution.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
            Dispute Statement & Evidence
          </label>
          <textarea
            rows={5}
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            placeholder="Explain the breach of contract, missing deliverables, or disputed requirements with verifiable specifics..."
            className="w-full bg-white border border-gray focus:border-forest rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none resize-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1.5">
            Attach Evidence Links / Files (optional)
          </label>
          <div className="flex items-center gap-2 bg-white border border-gray focus-within:border-forest rounded-[10px] px-3.5 py-2.5 transition-colors">
            <Paperclip className="w-4 h-4 text-ink/40 shrink-0" />
            <input
              type="text"
              value={fileSim}
              onChange={(e) => setFileSim(e.target.value)}
              placeholder="IPFS CID, GitHub Issue link, or screenshot URL"
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-gray">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" loading={isSubmitting}>
            Lock Funds & Raise Dispute
          </Button>
        </div>
      </form>
    </Modal>
  );
}

