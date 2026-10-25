import React, { useState, useEffect } from 'react';
import { getAgreement, updateAgreementTerms, approveDraft } from '../api/agreements.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Card, Button, Badge, AmountDisplay } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
import { canonicalHash } from '../lib/canonicalHash.js';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Github,
  Coins,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

export default function DraftPage({ agreementId, onProceedToWizard }) {
  const { address } = useWallet();
  const toast = useToast();

  const [agreement, setAgreement] = useState(null);
  const [terms, setTerms] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [availableDrafts, setAvailableDrafts] = useState([]);

  const fetchAgreementData = async (targetId = agreementId) => {
    try {
      setIsLoading(true);
      let data = null;
      if (targetId) {
        data = await getAgreement(targetId);
      }

      // Fetch user agreements to identify all available drafts
      let all = [];
      try {
        all = await getAgreements();
      } catch {}

      const allList = Array.isArray(all) ? all : [];
      const draftsList = allList.filter((a) => {
        const s = String(a.status || '').toUpperCase();
        return s === 'DRAFT' || s === 'CLIENT_APPROVED' || s === 'FREELANCER_APPROVED';
      });
      setAvailableDrafts(draftsList.length > 0 ? draftsList : allList);

      if (!data && draftsList.length > 0) {
        // Pick matching draft or most recently created
        data = draftsList.find(d => d.id === targetId || d.agreementId === targetId) || draftsList[0];
      } else if (!data && allList.length > 0) {
        data = allList[0];
      }

      if (data) {
        let parsed = data.terms;
        if (!parsed && data.termsJson) {
          try {
            parsed = JSON.parse(data.termsJson);
          } catch {}
        }
        if (parsed) {
          setAgreement(data);
          setTerms(typeof parsed === 'string' ? JSON.parse(parsed) : JSON.parse(JSON.stringify(parsed)));
          setHasUnsavedChanges(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load draft:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreementData(agreementId);
  }, [agreementId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-ink/60 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-forest border-t-transparent rounded-full animate-spin" />
        <p className="font-heading font-medium text-sm">Loading escrow agreement draft...</p>
      </div>
    );
  }

  if (!agreement || !terms) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-card bg-sage flex items-center justify-center text-forest">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold text-ink">No Draft Selected</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            You can generate a draft agreement from any AI chat consultation, accept a community proposal, or select a pending draft below.
          </p>
        </div>

        {availableDrafts.length > 0 ? (
          <div className="max-w-lg mx-auto space-y-3 text-left pt-2">
            <h4 className="text-xs font-heading font-semibold text-ink/70 uppercase tracking-wider text-center">
              Available Pending Drafts ({availableDrafts.length})
            </h4>
            <div className="space-y-2">
              {availableDrafts.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 bg-white border border-gray hover:border-forest rounded-card flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs"
                  onClick={() => fetchAgreementData(d.id)}
                >
                  <div>
                    <div className="font-heading font-bold text-xs text-ink">{d.title || 'Escrow Agreement Draft'}</div>
                    <div className="text-[10px] text-ink/50 font-mono mt-0.5">ID: {d.id} · Status: {d.status}</div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                    Load Draft
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAgreementData()}
            className="mx-auto"
          >
            Refresh Drafts
          </Button>
        )}
      </div>
    );
  }

  const isClient = address && terms.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();
  const myApproval = isClient ? agreement.clientApproved : isFreelancer ? agreement.freelancerApproved : false;
  const bothApproved = agreement.clientApproved && agreement.freelancerApproved;

  // Recalculate total amount when milestones change
  const handleMilestoneChange = (idx, field, val) => {
    const updatedMs = [...terms.milestones];
    updatedMs[idx] = { ...updatedMs[idx], [field]: val };

    let newTotal = 0;
    for (const m of updatedMs) {
      newTotal += parseFloat(m.amount) || 0;
    }

    setTerms(prev => ({
      ...prev,
      milestones: updatedMs,
      totalAmount: newTotal.toFixed(4).replace(/\.?0+$/, '')
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddMilestone = () => {
    const newIdx = terms.milestones.length;
    const newM = {
      index: newIdx,
      title: `Milestone ${newIdx + 1}`,
      description: 'Deliverable specification',
      amount: '0.5',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      requiredProgressBps: 8000,
      acceptanceCriteria: ['Pass automated test suite']
    };
    const updatedMs = [...terms.milestones, newM];
    let newTotal = 0;
    for (const m of updatedMs) newTotal += parseFloat(m.amount) || 0;

    setTerms(prev => ({
      ...prev,
      milestones: updatedMs,
      totalAmount: newTotal.toFixed(4).replace(/\.?0+$/, '')
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveMilestone = (idx) => {
    if (terms.milestones.length <= 1) {
      toast.warning('Agreement must contain at least one milestone');
      return;
    }
    const updatedMs = terms.milestones.filter((_, i) => i !== idx).map((m, i) => ({ ...m, index: i }));
    let newTotal = 0;
    for (const m of updatedMs) newTotal += parseFloat(m.amount) || 0;

    setTerms(prev => ({
      ...prev,
      milestones: updatedMs,
      totalAmount: newTotal.toFixed(4).replace(/\.?0+$/, '')
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveTerms = async () => {
    try {
      setIsSaving(true);
      await updateAgreementTerms(agreement.id, terms);
      setHasUnsavedChanges(false);
      await fetchAgreementData();
      toast.success('Terms saved! Previous approvals have been reset.');
    } catch (err) {
      toast.error(err.message || 'Failed to save terms');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (hasUnsavedChanges) {
      toast.warning('Please save changes before approving');
      return;
    }
    try {
      setIsApproving(true);
      const res = await approveDraft(agreement.id);
      setAgreement(res);
      toast.success('You have approved this draft!');
      if (res.clientApproved && res.freelancerApproved) {
        toast.success('Mutual approval complete! Terms are now locked.');
      }
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-bold text-ink">
              Review AI Draft Terms
            </h1>
            <Badge status={bothApproved ? 'success' : 'pending'}>
              {bothApproved ? 'Mutually Approved' : 'Drafting Phase'}
            </Badge>
          </div>
          <p className="text-xs text-ink/60 mt-1">
            Carefully inspect scope, milestones, and penalty formulas before on-chain creation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {bothApproved ? (
            <Button
              variant="primary"
              onClick={() => onProceedToWizard(agreement.id)}
              icon={ArrowRight}
            >
              Proceed to On-Chain Escrow
            </Button>
          ) : (
            <>
              {hasUnsavedChanges && (
                <Button
                  variant="secondary"
                  onClick={handleSaveTerms}
                  loading={isSaving}
                  icon={Save}
                >
                  Save Edits
                </Button>
              )}
              <Button
                variant={myApproval ? 'secondary' : 'primary'}
                onClick={handleApprove}
                loading={isApproving}
                disabled={myApproval && bothApproved}
                icon={CheckCircle2}
              >
                {myApproval ? (bothApproved ? 'Mutually Approved' : 'Approved (Waiting Counterparty)') : 'Approve Draft Terms'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Approval Status & Edit Reset Warning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client approval card */}
        <div className={`p-4 rounded-card border flex items-center justify-between ${
          agreement.clientApproved
            ? 'bg-sage-light/60 border-forest/30 text-forest'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider">Client Approval</div>
            <AddressChip address={terms.client} showExplorer={false} className="mt-1.5" />
          </div>
          {agreement.clientApproved ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-sage px-2.5 py-1 rounded-full text-forest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-100 px-2.5 py-1 rounded-full text-amber-800">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          )}
        </div>

        {/* Freelancer approval card */}
        <div className={`p-4 rounded-card border flex items-center justify-between ${
          agreement.freelancerApproved
            ? 'bg-sage-light/60 border-forest/30 text-forest'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider">Freelancer Approval</div>
            <AddressChip address={terms.freelancer} showExplorer={false} className="mt-1.5" />
          </div>
          {agreement.freelancerApproved ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-sage px-2.5 py-1 rounded-full text-forest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-100 px-2.5 py-1 rounded-full text-amber-800">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          )}
        </div>

        {/* Coral-tinted Edit Reset Notice */}
        <div className="p-4 rounded-card border border-coral/60 bg-coral/20 text-ink flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="font-heading font-bold text-ink">Edits reset approvals:</strong>
            <p className="text-ink/80 mt-0.5 leading-relaxed">
              Any modified term recalculates the Keccak-256 canonical hash and resets both parties' approvals to DRAFT.
            </p>
          </div>
        </div>
      </div>

      {/* Coral-tinted Callouts for AI Flags & Open Questions */}
      {(agreement.openQuestions?.length > 0 || agreement.warnings?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agreement.openQuestions?.length > 0 && (
            <div className="p-4 rounded-card bg-coral/15 border border-coral/40 space-y-2">
              <div className="flex items-center gap-2 text-ink text-xs font-heading font-bold uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-coral" />
                AI Open Questions for Clarification
              </div>
              <ul className="text-xs text-ink/80 space-y-1 list-disc list-inside">
                {agreement.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {agreement.warnings?.length > 0 && (
            <div className="p-4 rounded-card bg-coral/20 border border-coral/50 space-y-2">
              <div className="flex items-center gap-2 text-ink text-xs font-heading font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-coral" />
                AI Risk Flags & Deadlines
              </div>
              <ul className="text-xs text-ink/80 space-y-1 list-disc list-inside">
                {agreement.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Core Terms Specification Form */}
      <Card className="space-y-6">
        <h3 className="font-heading font-bold text-base text-ink pb-3 border-b border-gray">
          Agreement Deliverables & Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Agreement Title
            </label>
            <input
              type="text"
              value={terms.title}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, title: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                Payment Mode
              </label>
              <div className="flex gap-2">
                {['MILESTONE', 'LUMP_SUM'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setTerms(prev => ({ ...prev, paymentMode: mode }));
                      setHasUnsavedChanges(true);
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-heading font-semibold rounded-[8px] border transition-all ${
                      terms.paymentMode === mode
                        ? 'bg-forest text-ivory border-forest shadow-sm'
                        : 'bg-white border-gray text-ink/70 hover:bg-sage'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                Escrow Currency
              </label>
              <div className="flex gap-2">
                {['ETH', 'USDC', 'USDT'].map(curr => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => {
                      setTerms(prev => ({ ...prev, currency: curr }));
                      setHasUnsavedChanges(true);
                    }}
                    className={`flex-1 py-2 px-2 text-xs font-heading font-semibold rounded-[8px] border transition-all ${
                      (terms.currency || 'ETH') === curr
                        ? 'bg-forest text-ivory border-forest shadow-sm'
                        : 'bg-white border-gray text-ink/70 hover:bg-sage'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
            Scope & Deliverables Description
          </label>
          <textarea
            rows={3}
            value={terms.description}
            onChange={(e) => {
              setTerms(prev => ({ ...prev, description: e.target.value }));
              setHasUnsavedChanges(true);
            }}
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={terms.github?.repoUrl || ''}
              onChange={(e) => {
                setTerms(prev => ({
                  ...prev,
                  github: { ...prev.github, repoUrl: e.target.value }
                }));
                setHasUnsavedChanges(true);
              }}
              placeholder="https://github.com/org/repo"
              className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Target Branch
            </label>
            <input
              type="text"
              value={terms.github?.branch || 'main'}
              onChange={(e) => {
                setTerms(prev => ({
                  ...prev,
                  github: { ...prev.github, branch: e.target.value }
                }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-forest"
            />
          </div>
        </div>

        {/* Late Penalty and Timers Parameter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-card bg-sage/30 border border-gray">
          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Late Penalty (bps/day)</span>
            <input
              type="number"
              value={terms.latePenaltyBpsPerDay || 100}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, latePenaltyBpsPerDay: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>

          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Max Late Penalty (bps)</span>
            <input
              type="number"
              value={terms.maxLatePenaltyBps || 3000}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, maxLatePenaltyBps: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>

          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Review Window (Days)</span>
            <input
              type="number"
              value={terms.reviewWindowDays || 5}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, reviewWindowDays: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>

          <div>
            <span className="text-[11px] font-heading font-semibold text-ink/60 block">Grace Window (Days)</span>
            <input
              type="number"
              value={terms.graceDays || 3}
              onChange={(e) => {
                setTerms(prev => ({ ...prev, graceDays: Number(e.target.value) }));
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-gray rounded-[6px] px-2 py-1 text-xs text-ink font-mono mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Milestones Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray">
          <div>
            <h3 className="font-heading font-bold text-base text-ink">Milestones & Payment Tranches</h3>
            <p className="text-xs text-ink/60 mt-0.5">Total agreement amount: {terms.totalAmount} {terms.currency || 'ETH'}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddMilestone}
            icon={Plus}
          >
            Add Milestone
          </Button>
        </div>

        <div className="space-y-4">
          {terms.milestones.map((m, idx) => (
            <div
              key={idx}
              className="p-4 rounded-card border border-gray bg-white space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading font-bold text-sm text-forest">
                  Milestone #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveMilestone(idx)}
                  className="p-1 text-ink/40 hover:text-coral transition-colors"
                  title="Remove milestone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-heading font-semibold text-ink/60 block mb-1">Title</label>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                    className="w-full bg-ivory border border-gray rounded-[8px] px-3 py-1.5 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-heading font-semibold text-ink/60 block mb-1">Amount ({terms.currency || 'ETH'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={m.amount}
                    onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                    className="w-full bg-ivory border border-gray rounded-[8px] px-3 py-1.5 text-xs text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-heading font-semibold text-ink/60 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={m.description}
                  onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                  className="w-full bg-ivory border border-gray rounded-[8px] px-3 py-1.5 text-xs text-ink"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border-2 border-ink rounded-card-lg shadow-brutal p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-heading font-bold text-sm text-ink block">
            {bothApproved ? '✓ Ready for Blockchain Escrow Deployment' : 'Smart Agreement Terms Review'}
          </span>
          <span className="text-xs text-ink/60">
            {bothApproved
              ? 'Both counter-parties have confirmed the terms. Proceed to deposit funds into the contract.'
              : `${agreement.clientApproved ? '✓ Client approved' : 'Awaiting client approval'} · ${agreement.freelancerApproved ? '✓ Freelancer approved' : 'Awaiting freelancer approval'}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {hasUnsavedChanges && (
            <Button
              variant="secondary"
              onClick={handleSaveTerms}
              loading={isSaving}
              icon={Save}
            >
              Save Edits
            </Button>
          )}

          {bothApproved ? (
            <Button
              variant="primary"
              onClick={() => onProceedToWizard(agreement.id)}
              icon={ArrowRight}
            >
              Proceed to On-Chain Escrow
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApprove}
              loading={isApproving}
              disabled={myApproval && bothApproved}
              icon={CheckCircle2}
            >
              {myApproval ? (bothApproved ? 'Mutually Approved' : 'Approved (Waiting Partner)') : 'Approve & Submit Terms'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
