import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import AddressChip from '../ui/AddressChip.jsx';
import { txSubmitEvidence } from '../../chain/transactions.js';
import { submitEvidence as apiSubmitEvidence } from '../../api/disputes.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatRelativeTime, shortenAddress } from '../../lib/formatters.js';
import { ShieldCheck, Send, FileText } from 'lucide-react';

export default function EvidenceThread({
  agreementId,
  onchainId,
  milestoneIdx,
  evidenceList = [],
  onEvidenceSubmitted
}) {
  const { isMock } = useWallet() || {};
  const toast = useToast();
  const [newEvidence, setNewEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRebuttal = async (e) => {
    e.preventDefault();
    if (!newEvidence.trim()) return;

    try {
      setIsSubmitting(true);
      let toastId = null;

      // 1. Backend evidence store
      await apiSubmitEvidence(agreementId, milestoneIdx, {
        text: newEvidence.trim()
      });

      // 2. On-chain submitEvidence if active on chain
      if (onchainId !== null && onchainId !== undefined) {
        try {
          await txSubmitEvidence(onchainId, milestoneIdx, newEvidence.trim(), {
            onPending: (hash) => {
              toastId = toast.pendingTx(hash, 'Anchoring evidence hash on-chain...');
            },
            onSuccess: (rec) => {
              if (toastId) toast.confirmedTx(toastId, rec.hash, 'Evidence submitted on-chain!');
            },
            onError: (err) => {
              if (toastId) toast.failedTx(toastId, err);
            }
          });
        } catch (chainErr) {
          if (isMock) {
            console.warn('On-chain submitEvidence skipped in mock mode:', chainErr?.message || chainErr);
          } else {
            throw chainErr;
          }
        }
      }

      toast.success('Evidence rebuttal recorded!');
      setNewEvidence('');
      if (onEvidenceSubmitted) onEvidenceSubmitted();
    } catch (err) {
      toast.error(err.message || 'Failed to submit evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h5 className="text-xs font-heading font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-forest" />
        Cryptographic Evidence Submissions ({evidenceList.length})
      </h5>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {evidenceList.length === 0 ? (
          <p className="text-xs text-ink/50 py-2 italic">No evidence recorded yet.</p>
        ) : (
          evidenceList.map((item, idx) => {
            const author = item.author || item.uploadedBy?.walletAddress || (typeof item.uploadedBy === 'string' ? item.uploadedBy : '0x0000000000000000000000000000000000000000');
            const text = item.text || item.description || item.reason || 'Evidence statement submitted.';
            const hash = item.evidenceHash || item.contentHash;
            const time = item.createdAt || item.timestamp || Date.now();

            return (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-card bg-ivory border border-gray space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <AddressChip address={author} showExplorer={false} />
                  <span className="text-[11px] text-ink/50 font-mono">
                    {formatRelativeTime(time)}
                  </span>
                </div>
                <p className="text-ink leading-relaxed whitespace-pre-line">{text}</p>
                {hash && (
                  <div className="text-[10px] text-ink/60 font-mono flex items-center gap-1 pt-1.5 border-t border-gray">
                    <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                    <span>Evidence Hash: {shortenAddress(hash, 6)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rebuttal submission form */}
      <form onSubmit={handleSubmitRebuttal} className="space-y-2.5 pt-3 border-t border-gray">
        <textarea
          rows={3}
          value={newEvidence}
          onChange={(e) => setNewEvidence(e.target.value)}
          placeholder="Submit additional evidence, test logs, or rebuttal argument..."
          className="w-full bg-white border border-gray focus:border-forest rounded-[10px] px-3.5 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none resize-none transition-colors"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="forest"
            size="sm"
            loading={isSubmitting}
            disabled={!newEvidence.trim()}
            icon={Send}
          >
            Submit Evidence Rebuttal
          </Button>
        </div>
      </form>
    </div>
  );
}

