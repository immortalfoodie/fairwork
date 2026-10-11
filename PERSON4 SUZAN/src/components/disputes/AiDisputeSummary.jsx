import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import { getAiDisputeSummary } from '../../api/disputes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Sparkles, Info, PieChart } from 'lucide-react';
import { formatBps } from '../../lib/formatters.js';

export default function AiDisputeSummary({
  agreementId,
  milestoneIdx,
  initialSummary = null
}) {
  const toast = useToast();
  const [summaryData, setSummaryData] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchSummary = async () => {
    try {
      setIsLoading(true);
      toast.info('AI is inspecting evidence submissions, contract specifications, and git activity...');
      const data = await getAiDisputeSummary(agreementId, milestoneIdx);
      setSummaryData(data);
      toast.success('Advisory AI dispute summary & recommended split generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI dispute summary');
    } finally {
      setIsLoading(false);
    }
  };

  const freelancerBps = summaryData?.recommended_freelancer_share_bps || summaryData?.recommendedShareBps || 5000;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-gray">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-forest" />
          <h4 className="text-sm font-heading font-bold text-ink">
            Advisory AI Dispute Analysis
          </h4>
        </div>

        {/* Mandatory Advisory Notice */}
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-sage border border-gray text-forest font-semibold flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Advisory Only. Arbitrators Vote.
        </span>
      </div>

      {!summaryData ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-ink/60 max-w-md mx-auto leading-relaxed">
            Generate an objective synthesis of the evidence thread, milestone requirements, and GitHub code analysis with recommended compensation split.
          </p>
          <Button
            variant="forest"
            size="sm"
            onClick={handleFetchSummary}
            loading={isLoading}
            icon={Sparkles}
          >
            Get AI Dispute Summary & Recommendation
          </Button>
        </div>
      ) : (
        <div className="space-y-4 text-xs animate-fade-in">
          {/* Recommended Split Card */}
          <div className="p-4 rounded-card bg-ivory border border-gray space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-heading font-bold text-ink/70 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-forest" />
                Recommended Escrow Split
              </span>
              <span className="font-mono text-xs text-forest font-bold">
                Freelancer: {formatBps(freelancerBps)} | Client: {formatBps(10000 - freelancerBps)}
              </span>
            </div>

            {/* Split bar */}
            <div className="w-full h-3 rounded-full bg-gray overflow-hidden flex border border-gray">
              <div
                className="bg-forest h-full"
                style={{ width: `${(freelancerBps / 10000) * 100}%` }}
                title={`Freelancer: ${formatBps(freelancerBps)}`}
              />
              <div
                className="bg-coral h-full flex-1"
                title={`Client: ${formatBps(10000 - freelancerBps)}`}
              />
            </div>
          </div>

          {/* Synthesis Summary */}
          <div className="p-3.5 rounded-card bg-white border border-gray space-y-1 leading-relaxed">
            <strong className="font-heading font-bold text-ink block text-[11px]">Analysis Summary:</strong>
            <p className="text-ink/80">{summaryData.summary}</p>
          </div>

          {/* Reasoning */}
          {summaryData.reasoning && (
            <div className="p-3.5 rounded-card bg-white border border-gray space-y-1 leading-relaxed">
              <strong className="font-heading font-bold text-ink block text-[11px]">Reasoning & Findings:</strong>
              <p className="text-ink/80">{summaryData.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

