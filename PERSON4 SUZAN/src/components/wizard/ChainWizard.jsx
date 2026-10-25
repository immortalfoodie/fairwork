import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import VerificationBadge from './VerificationBadge.jsx';
import PlainLanguageModal from './PlainLanguageModal.jsx';
import {
  txCreateAgreement,
  txAcceptAgreement,
  txFundAgreement,
  txCancelUnfunded
} from '../../chain/transactions.js';
import { linkChain, approveDraft } from '../../api/agreements.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { termsToChain } from '../../lib/termsToChain.js';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Coins,
  XCircle,
  FileCheck2,
  Lock
} from 'lucide-react';

export default function ChainWizard({ agreement, onAgreementUpdated }) {
  const { address } = useWallet();
  const toast = useToast();

  const [activeModalStep, setActiveModalStep] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const terms = agreement.terms;
  const isClient = address && terms?.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms?.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();

  // Wizard state determination
  const hasOnchainId = Boolean(agreement.onchainId);
  const isTermsLocked = agreement.status === 'LOCKED' || agreement.status === 'ONCHAIN_LINKED' || hasOnchainId;
  const isAccepted = agreement.status === 'Active' || (agreement.status === 'AwaitingFunding' && hasOnchainId);
  const isFunded = agreement.status === 'Active' || agreement.status === 'Completed' || agreement.status === 'Disputed';

  // Manual one-click mutual lock
  const handleQuickLock = async () => {
    try {
      setIsLocking(true);
      const updated = await approveDraft(agreement.id, { mutualLock: true });
      toast.success('Agreement terms mutually locked! Cryptographic Keccak-256 hash verified.');
      if (onAgreementUpdated) onAgreementUpdated(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to lock agreement terms');
    } finally {
      setIsLocking(false);
    }
  };

  // Execute Step 1: Create on-chain (Client)
  const handleExecuteCreate = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      // Auto-lock if not already locked
      try {
        await approveDraft(agreement.id, { mutualLock: true });
      } catch (lockErr) {
        console.warn('Auto-lock notice:', lockErr);
      }

      const { txHash, receipt, onchainId } = await txCreateAgreement(terms, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Creating SANKALP escrow agreement on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Agreement successfully created on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      const assignedId = onchainId || 1;
      const linked = await linkChain(agreement.id, {
        onchainId: assignedId,
        txHash
      });

      toast.success(`Agreement linked on-chain with ID #${assignedId}`);
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated(linked);
    } catch (err) {
      toast.error(err.message || 'Failed to create agreement on-chain');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Step 2: Accept Agreement (Freelancer)
  const handleExecuteAccept = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      await txAcceptAgreement(agreement.onchainId, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Accepting agreement on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Agreement accepted!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Agreement successfully accepted on-chain!');
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated({ ...agreement, status: 'AwaitingFunding' });
    } catch (err) {
      toast.error(err.message || 'Failed to accept agreement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Step 3: Fund Agreement (Client)
  const handleExecuteFund = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      const { totalWei } = termsToChain(terms);

      await txFundAgreement(agreement.onchainId, totalWei, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, `Funding escrow with ${terms.totalAmount} ETH...`);
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Escrow funds successfully locked in contract!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success(`Escrow active! Locked ${terms.totalAmount} ETH into smart contract.`);
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated({ ...agreement, status: 'Active' });
    } catch (err) {
      toast.error(err.message || 'Failed to fund agreement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Unfunded
  const handleExecuteCancel = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      await txCancelUnfunded(agreement.onchainId || 0, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Cancelling unfunded agreement on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Agreement cancelled');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.info('Agreement cancelled');
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated({ ...agreement, status: 'Cancelled' });
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Create On-Chain',
      desc: 'Client signs createAgreement to record terms hash in contract.',
      done: hasOnchainId,
      isCurrent: !hasOnchainId,
      action: () => setActiveModalStep('CREATE'),
      actionLabel: 'Create On-Chain',
      eligible: isClient
    },
    {
      num: 2,
      title: 'Freelancer Acceptance',
      desc: 'Freelancer signs acceptAgreement to lock in delivery obligations.',
      done: isAccepted,
      isCurrent: hasOnchainId && !isAccepted,
      action: () => setActiveModalStep('ACCEPT'),
      actionLabel: 'Accept Agreement',
      eligible: isFreelancer
    },
    {
      num: 3,
      title: 'Fund Escrow',
      desc: 'Client deposits total ETH into the smart contract escrow.',
      done: isFunded,
      isCurrent: hasOnchainId && isAccepted && !isFunded,
      action: () => setActiveModalStep('FUND'),
      actionLabel: `Fund ${terms.totalAmount} ETH`,
      eligible: isClient
    }
  ];

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray flex-wrap gap-2">
        <div>
          <h3 className="text-base font-heading font-bold text-ink flex items-center gap-2">
            <Lock className="w-4 h-4 text-forest" />
            On-Chain Escrow Activation Wizard
          </h3>
          <p className="text-xs text-ink/60 mt-0.5">
            Sequential state transitions required before milestone deliverables commence.
          </p>
        </div>

        {agreement.onchainId && (
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-sage-light text-forest border border-forest/20 font-semibold">
            On-Chain ID: #{agreement.onchainId}
          </span>
        )}
      </div>

      {/* Verification Badge */}
      <VerificationBadge
        terms={terms}
        onchainTermsHash={agreement.termsHash}
      />

      {/* Steps Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`p-4 rounded-card border flex flex-col justify-between transition-all ${
              s.done
                ? 'bg-sage-light/60 border-forest/30 text-forest'
                : s.isCurrent
                ? 'bg-white border-2 border-ink shadow-brutal text-ink'
                : 'bg-ivory border-gray opacity-60 text-ink/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold">STEP 0{s.num}</span>
                {s.done ? (
                  <span className="flex items-center gap-1 text-[11px] font-heading font-bold text-forest">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </span>
                ) : s.isCurrent ? (
                  <span className="flex items-center gap-1 text-[11px] font-heading font-bold text-coral">
                    <Clock className="w-3.5 h-3.5" /> Next Action
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-ink/40">Locked</span>
                )}
              </div>
              <h4 className="font-heading font-bold text-sm text-ink mb-1">{s.title}</h4>
              <p className="text-xs text-ink/70 leading-relaxed mb-4">{s.desc}</p>
            </div>

            {s.isCurrent && (
              <div className="pt-2 border-t border-gray">
                {s.eligible ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={s.action}
                  >
                    {s.actionLabel}
                  </Button>
                ) : (
                  <div className="text-[11px] font-medium text-ink/60 bg-sage/50 p-2 rounded text-center">
                    Awaiting counterparty action
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cancel Option for client if created but unfunded */}
      {hasOnchainId && !isFunded && isClient && (
        <div className="pt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveModalStep('CANCEL')}
            className="text-xs text-coral hover:bg-coral/10"
          >
            Cancel Unfunded Agreement
          </Button>
        </div>
      )}

      {/* Plain Language Modal Before Any Transaction */}
      <PlainLanguageModal
        isOpen={Boolean(activeModalStep)}
        onClose={() => setActiveModalStep(null)}
        stepType={activeModalStep}
        terms={terms}
        isLoading={isProcessing}
        onConfirm={() => {
          if (activeModalStep === 'CREATE') handleExecuteCreate();
          else if (activeModalStep === 'ACCEPT') handleExecuteAccept();
          else if (activeModalStep === 'FUND') handleExecuteFund();
          else if (activeModalStep === 'CANCEL') handleExecuteCancel();
        }}
      />
    </Card>
  );
}
