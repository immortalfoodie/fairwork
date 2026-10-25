import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import AddressChip from '../ui/AddressChip.jsx';
import CountdownTimer from '../ui/CountdownTimer.jsx';
import { txCastVote, txFinalizeDispute } from '../../chain/transactions.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatBps } from '../../lib/formatters.js';
import { Scale, CheckCircle2, Clock, ShieldCheck, Gavel, Award } from 'lucide-react';

export default function ArbitratorVoteCard({
  dispute,
  onchainId,
  milestoneIdx,
  onDisputeUpdated
}) {
  const { address, isMock } = useWallet() || {};
  const toast = useToast();

  const [freelancerShareBps, setFreelancerShareBps] = useState(7000);
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const defaultArbs = [
    '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
    '0x9965507d1a55bcc2695c58ba16fb37d819b0a4df',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9'
  ];
  const arbitrators = (dispute?.arbitrators && dispute.arbitrators.length > 0)
    ? dispute.arbitrators
    : (dispute?.selectedArbitrators && dispute.selectedArbitrators.length > 0)
      ? dispute.selectedArbitrators
      : defaultArbs;

  const votes = dispute?.votes || {};
  const isArbitrator = address && arbitrators.some(a => a.toLowerCase() === address.toLowerCase());
  const hasVoted = address && votes[address.toLowerCase()] !== undefined;

  const votingEndTimestamp = dispute?.votingEndTimestamp || dispute?.votingDeadline || (Date.now() + 48 * 3600000);

  const handleCastVote = async () => {
    try {
      setIsCastingVote(true);
      let toastId = null;

      if (!isMock && onchainId !== null && onchainId !== undefined) {
        try {
          await txCastVote(onchainId, milestoneIdx, freelancerShareBps, {
            onPending: (hash) => {
              toastId = toast.pendingTx(hash, `Casting arbitrator vote: ${formatBps(freelancerShareBps)} share...`);
            },
            onSuccess: (rec) => {
              if (toastId) toast.confirmedTx(toastId, rec.hash, 'Vote recorded on-chain!');
            },
            onError: (err) => {
              if (toastId) toast.failedTx(toastId, err);
            }
          });
        } catch (chainErr) {
          throw chainErr;
        }
      } else {
        // Record vote in dispute data
        if (dispute) {
          if (!dispute.votes) dispute.votes = {};
          dispute.votes[(address || arbitrators[0]).toLowerCase()] = freelancerShareBps;
        }
      }

      toast.success('Vote cast successfully!');
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to cast vote');
    } finally {
      setIsCastingVote(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true);
      let toastId = null;

      if (onchainId !== null && onchainId !== undefined) {
        try {
          await txFinalizeDispute(onchainId, milestoneIdx, {
            onPending: (hash) => {
              toastId = toast.pendingTx(hash, 'Finalizing dispute resolution on-chain...');
            },
            onSuccess: (rec) => {
              if (toastId) toast.confirmedTx(toastId, rec.hash, 'Dispute resolved and funds distributed!');
            },
            onError: (err) => {
              if (toastId) toast.failedTx(toastId, err);
            }
          });
        } catch (chainErr) {
          if (isMock) {
            console.warn('On-chain finalizeDispute skipped in mock mode:', chainErr?.message || chainErr);
            if (dispute) {
              dispute.resolved = true;
              dispute.status = 'Resolved';
            }
          } else {
            throw chainErr;
          }
        }
      }

      toast.success('Dispute finalized and escrow split executed!');
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      toast.error(err.message || 'Finalization failed');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray flex-wrap gap-2">
        <div>
          <h4 className="text-base font-heading font-bold text-ink flex items-center gap-2">
            <Scale className="w-4 h-4 text-forest" />
            3-Arbitrator Pool Voting & Settlement
          </h4>
          <p className="text-xs text-ink/60 mt-0.5">
            Decentralized median calculation determines final milestone payment split.
          </p>
        </div>

        <CountdownTimer targetDate={votingEndTimestamp} deadlineLabel="Voting Deadline" />
      </div>

      {/* Selected Arbitrators Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {arbitrators.map((arb, i) => {
          const arbVote = votes[arb.toLowerCase()];
          const isMe = address && arb.toLowerCase() === address.toLowerCase();

          return (
            <div
              key={i}
              className={`p-3.5 rounded-card border ${
                isMe ? 'border-2 border-forest bg-sage-light/40' : 'border-gray bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink/60">
                  Arbitrator #{i + 1}
                </span>
                {isMe && <Badge status="success">You</Badge>}
              </div>
              <AddressChip address={arb} />
              <div className="mt-2 text-xs font-mono">
                {arbVote !== undefined ? (
                  <span className="text-forest font-bold">✓ Voted: {formatBps(arbVote)}</span>
                ) : (
                  <span className="text-ink/50">Awaiting vote</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vote Form if user is selected arbitrator */}
      {isArbitrator && (
        <div className="p-4 rounded-card border-2 border-ink bg-white shadow-brutal space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-heading font-bold uppercase tracking-wider text-ink">
              Cast Your Arbitrator Settlement Share
            </h5>
            <span className="text-xs font-mono font-bold text-forest">
              {formatBps(freelancerShareBps)} Freelancer / {formatBps(10000 - freelancerShareBps)} Client
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="10000"
            step="250"
            value={freelancerShareBps}
            onChange={(e) => setFreelancerShareBps(Number(e.target.value))}
            className="w-full accent-forest cursor-pointer"
          />

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCastVote}
              loading={isCastingVote}
            >
              Submit Binding Vote
            </Button>
          </div>
        </div>
      )}

      {/* Finalize Button */}
      <div className="pt-2 border-t border-gray flex items-center justify-between">
        <span className="text-xs text-ink/60">
          Votes recorded: {Object.keys(votes).length} / 3
        </span>
        <Button
          variant="forest"
          size="sm"
          onClick={handleFinalize}
          loading={isFinalizing}
          icon={Gavel}
        >
          Finalize Dispute & Execute Split
        </Button>
      </div>
    </Card>
  );
}
