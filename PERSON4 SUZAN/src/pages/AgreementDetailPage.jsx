import React, { useState, useEffect } from 'react';
import {
  getAgreement,
  getTimeline,
  getPayments,
  getAlerts
} from '../api/agreements.js';
import { getDispute } from '../api/disputes.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Card, Badge, Button, AmountDisplay, ProgressBar, AddressChip, Tabs } from '../components/ui/index.js';
import ChainWizard from '../components/wizard/ChainWizard.jsx';
import MilestoneCard from '../components/dashboard/MilestoneCard.jsx';
import AmendmentsList from '../components/amendments/AmendmentsList.jsx';
import ProposeAmendmentModal from '../components/amendments/ProposeAmendmentModal.jsx';
import RaiseDisputeModal from '../components/disputes/RaiseDisputeModal.jsx';
import EvidenceThread from '../components/disputes/EvidenceThread.jsx';
import AiDisputeSummary from '../components/disputes/AiDisputeSummary.jsx';
import ArbitratorVoteCard from '../components/disputes/ArbitratorVoteCard.jsx';
import PaymentSummaryCards from '../components/payments/PaymentSummaryCards.jsx';
import MilestonePaymentTable from '../components/payments/MilestonePaymentTable.jsx';
import TimelineView from '../components/timeline/TimelineView.jsx';
import ExportContractModal from '../components/agreements/ExportContractModal.jsx';
import {
  Layers,
  Coins,
  Shield,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Scale,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Printer
} from 'lucide-react';

export default function AgreementDetailPage({ agreementId, onBack }) {
  const { address } = useWallet();
  const toast = useToast();

  const [agreement, setAgreement] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [payments, setPayments] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [disputeData, setDisputeData] = useState(null);
  const [activeDisputeIdx, setActiveDisputeIdx] = useState(null);

  const [isProposeAmendmentOpen, setIsProposeAmendmentOpen] = useState(false);
  const [isRaiseDisputeOpen, setIsRaiseDisputeOpen] = useState(false);
  const [disputeMilestoneIdx, setDisputeMilestoneIdx] = useState(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('milestones');
  const [isLoading, setIsLoading] = useState(true);

  const loadAllAgreementData = async () => {
    try {
      setIsLoading(true);
      const [agData, tlData, payData, alData] = await Promise.all([
        getAgreement(agreementId),
        getTimeline(agreementId).catch(() => []),
        getPayments(agreementId).catch(() => null),
        getAlerts(agreementId).catch(() => [])
      ]);

      setAgreement(agData);
      setTimeline(tlData || []);
      setPayments(payData || null);
      setAlerts(alData || []);

      // Check if any dispute exists in agData.disputes or in milestones
      let foundDisputeIdx = null;
      let foundDisputeData = null;

      if (agData.disputes) {
        if (Array.isArray(agData.disputes) && agData.disputes.length > 0) {
          const firstDispute = agData.disputes[0];
          foundDisputeIdx = firstDispute.idx ?? firstDispute.milestoneIndex ?? 0;
          foundDisputeData = firstDispute;
        } else if (typeof agData.disputes === 'object' && Object.keys(agData.disputes).length > 0) {
          const firstKey = Object.keys(agData.disputes)[0];
          foundDisputeIdx = Number(firstKey);
          foundDisputeData = agData.disputes[firstKey];
        }
      }

      if (foundDisputeIdx === null) {
        const disputedM = agData.milestones?.find(m => String(m.status || '').toUpperCase() === 'DISPUTED');
        if (disputedM) {
          foundDisputeIdx = disputedM.idx ?? disputedM.milestoneIndex ?? 0;
        }
      }

      if (foundDisputeIdx === null && String(agData.status || '').toUpperCase() === 'DISPUTED') {
        foundDisputeIdx = 0;
      }

      if (foundDisputeIdx !== null) {
        setActiveDisputeIdx(foundDisputeIdx);
        if (!foundDisputeData) {
          foundDisputeData = await getDispute(agreementId, foundDisputeIdx).catch(() => null);
        }
        if (!foundDisputeData) {
          foundDisputeData = {
            idx: foundDisputeIdx,
            status: 'Active',
            evidence: [],
            arbitrators: [
              '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
              '0x9965507d1a55bcc2695c58ba16fb37d819b0a4df',
              '0x976EA74026E726554dB657fA54763abd0C3a0aa9'
            ],
            votes: {},
            resolved: false,
            aiSummary: null
          };
        }
        setDisputeData(foundDisputeData);
      } else {
        setActiveDisputeIdx(null);
        setDisputeData(null);
      }
    } catch (err) {
      console.warn('Could not load agreement details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agreementId) {
      loadAllAgreementData();
    } else {
      setIsLoading(false);
    }
  }, [agreementId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-ink/60">
        Loading agreement dashboard...
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-card bg-sage flex items-center justify-center text-forest">
          <FileCheck2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold text-ink">No Agreement Selected</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            Select an agreement from your agreements list to view milestones, escrow funding, and advisory AI verification details.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="secondary" size="md" onClick={onBack} icon={ArrowLeft}>
            Back to My Agreements
          </Button>
        </div>
      </div>
    );
  }

  const terms = agreement.terms;
  const isClient = address && terms?.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms?.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();

  let userRole = 'VIEWER';
  if (isClient) userRole = 'CLIENT';
  else if (isFreelancer) userRole = 'FREELANCER';

  // Determine role-based action prompt
  let actionPrompt = '';
  if (agreement.status === 'Draft') {
    if (isClient && !agreement.clientApproved) actionPrompt = 'Action required: Review & approve draft terms';
    else if (isFreelancer && !agreement.freelancerApproved) actionPrompt = 'Action required: Review & approve draft terms';
  } else if (agreement.status === 'AwaitingFunding') {
    if (isClient) actionPrompt = 'Action required: Create agreement on-chain and lock escrow funds';
    else if (isFreelancer && !agreement.onchainId) actionPrompt = 'Waiting for client to create agreement on-chain';
  } else if (agreement.status === 'Active') {
    const subM = agreement.milestones?.find(m => m.status === 'Submitted');
    if (subM && isClient) actionPrompt = `Review deliverable for Milestone #${subM.idx + 1}`;
    const pendM = agreement.milestones?.find(m => m.status === 'Pending');
    if (pendM && isFreelancer) actionPrompt = `Work in progress: Milestone #${pendM.idx + 1}`;
  }

  // Calculate overall progress (% of milestones paid)
  const paidCount = agreement.milestones?.filter(m => m.status === 'Paid').length || 0;
  const totalCount = agreement.milestones?.length || 1;
  const progressPercent = Math.round((paidCount / totalCount) * 100);

  const hasActiveDispute = activeDisputeIdx !== null || Boolean(disputeData);
  const tabsConfig = [
    { id: 'milestones', label: `Milestones (${agreement.milestones?.length || 0})` },
    { id: 'payments', label: 'Payment Breakdown' },
    { id: 'disputes', label: hasActiveDispute ? 'Disputes & Arbitration (1)' : 'Disputes & Arbitration' },
    { id: 'amendments', label: 'Amendments' },
    { id: 'timeline', label: `Timeline & Audit (${timeline.length})` }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <Card className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-forest bg-sage px-2 py-0.5 rounded-full">
                Agreement #{agreement.id}
              </span>
              {agreement.onchainId && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sage-light text-forest font-semibold border border-forest/20">
                  On-Chain ID: #{agreement.onchainId}
                </span>
              )}
              <Badge status={agreement.status} size="sm">
                {agreement.status}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">{terms.title}</h1>
            <p className="text-xs text-ink/70 mt-1 max-w-2xl leading-relaxed">{terms.description}</p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto bg-sage/40 p-4 rounded-card border border-gray">
            <div className="text-right">
              <span className="text-[10px] text-ink/60 font-heading font-semibold block uppercase tracking-wider">
                Total Escrow Budget
              </span>
              <AmountDisplay amount={terms.totalAmount} size="lg" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              title="Download Legal PDF / Certificate"
              icon={Printer}
              className="text-xs"
            >
              Export Certificate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAllAgreementData}
              title="Refresh Agreement State"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4 text-forest" />
            </Button>
          </div>
        </div>

        {/* Role Banner & Action Prompt */}
        <div className="p-3.5 rounded-card bg-ivory border border-gray flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-ink/60">
              Your Persona:
            </span>
            <Badge status="success">
              {userRole}
            </Badge>
          </div>
          {actionPrompt && (
            <p className="text-xs font-heading font-semibold text-forest flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-coral shrink-0" />
              {actionPrompt}
            </p>
          )}
        </div>

        {/* Parties Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-card bg-white border border-gray flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-heading font-bold text-ink/60 block tracking-wider">
                Client (Funds Escrow)
              </span>
              <AddressChip address={terms.client} className="mt-1" />
            </div>
            {isClient && <Badge status="success">You</Badge>}
          </div>

          <div className="p-3.5 rounded-card bg-white border border-gray flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-heading font-bold text-ink/60 block tracking-wider">
                Freelancer (Deliverables)
              </span>
              <AddressChip address={terms.freelancer} className="mt-1" />
            </div>
            {isFreelancer && <Badge status="success">You</Badge>}
          </div>
        </div>

        {/* Overall Milestone Completion Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs font-heading font-semibold">
            <span className="text-ink/70">
              Escrow Release Progress: <strong className="text-ink">{paidCount} of {totalCount} Milestones Paid</strong>
            </span>
            <span className="text-forest tabular-nums">{progressPercent}% Completed</span>
          </div>
          <ProgressBar value={progressPercent} />
        </div>

        {/* Active Alerts Banner from GET /alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 pt-2">
            {alerts.map((al, idx) => (
              <div
                key={idx}
                className="p-3 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{al.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chain Steps Wizard (if Draft or AwaitingFunding) */}
      {(agreement.status === 'Draft' || agreement.status === 'AwaitingFunding' || !agreement.onchainId) && (
        <ChainWizard
          agreement={agreement}
          onAgreementUpdated={(updated) => setAgreement(updated)}
        />
      )}

      {/* Navigation Tabs */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {agreement.milestones?.map((m) => (
            <MilestoneCard
              key={m.idx}
              milestone={m}
              termsMilestone={terms.milestones?.[m.idx]}
              agreement={agreement}
              onMilestoneUpdated={loadAllAgreementData}
              onOpenDispute={(idx) => {
                setDisputeMilestoneIdx(idx);
                setIsRaiseDisputeOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <PaymentSummaryCards payments={payments} />
          <MilestonePaymentTable milestones={agreement.milestones || []} />
        </div>
      )}

      {/* Tab 3: Disputes */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          {activeDisputeIdx !== null && disputeData ? (
            <>
              <ArbitratorVoteCard
                dispute={disputeData}
                onchainId={agreement.onchainId}
                milestoneIdx={activeDisputeIdx}
                onDisputeUpdated={loadAllAgreementData}
              />
              <AiDisputeSummary
                agreementId={agreement.id}
                milestoneIdx={activeDisputeIdx}
                initialSummary={disputeData.aiSummary}
              />
              <Card>
                <EvidenceThread
                  agreementId={agreement.id}
                  onchainId={agreement.onchainId}
                  milestoneIdx={activeDisputeIdx}
                  evidenceList={disputeData.evidence || disputeData.evidences || []}
                  onEvidenceSubmitted={loadAllAgreementData}
                />
              </Card>
            </>
          ) : (
            <Card className="text-center py-12 space-y-3">
              <Scale className="w-8 h-8 text-forest mx-auto" />
              <h4 className="text-sm font-heading font-bold text-ink">No Active Disputes</h4>
              <p className="text-xs text-ink/60 max-w-sm mx-auto">
                All milestones are progressing smoothly. If an irreconcilable conflict occurs regarding deliverables, either party can raise a dispute from the milestone card.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Tab 4: Amendments */}
      {activeTab === 'amendments' && (
        <AmendmentsList
          agreement={agreement}
          amendments={agreement.amendments || []}
          onProposeClick={() => setIsProposeAmendmentOpen(true)}
          onAmendmentUpdated={loadAllAgreementData}
        />
      )}

      {/* Tab 5: Timeline */}
      {activeTab === 'timeline' && (
        <TimelineView timeline={timeline} />
      )}

      {/* Propose Amendment Modal */}
      <ProposeAmendmentModal
        isOpen={isProposeAmendmentOpen}
        onClose={() => setIsProposeAmendmentOpen(false)}
        agreement={agreement}
        onSuccess={loadAllAgreementData}
      />

      {/* Raise Dispute Modal */}
      <RaiseDisputeModal
        isOpen={isRaiseDisputeOpen}
        onClose={() => setIsRaiseDisputeOpen(false)}
        agreementId={agreement.id}
        onchainId={agreement.onchainId}
        milestoneIdx={disputeMilestoneIdx}
        onSuccess={() => {
          loadAllAgreementData();
          setActiveTab('disputes');
        }}
      />

      {/* Export Contract Legal Certificate Modal */}
      <ExportContractModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        agreement={agreement}
      />
    </div>
  );
}
