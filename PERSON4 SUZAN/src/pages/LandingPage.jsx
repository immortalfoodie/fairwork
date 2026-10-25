import React from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import {
  ShieldCheck,
  Bot,
  GitPullRequest,
  Scale,
  ArrowRight,
  Lock,
  Sparkles,
  Zap,
  CheckCircle2,
  FileCheck2,
  Cpu
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui/index.js';

export default function LandingPage({ setActivePage, onOpenAgreement }) {
  const { isConnected, connectWallet, openConnectModal, isMock, toggleAppMode } = useWallet();

  const threeSteps = [
    {
      num: '01',
      title: 'Draft & Bind Terms with AI',
      desc: 'Collaborate in community threads. Our advisory AI engine transforms agreements into canonical Keccak-256 bound terms with clear acceptance criteria.'
    },
    {
      num: '02',
      title: 'Non-Custodial Escrow & Verification',
      desc: 'Milestone funds lock directly in transparent smart contracts. GitHub commits and PRs are analyzed by advisory AI for evidence-backed review.'
    },
    {
      num: '03',
      title: 'Instant Payouts & Fair Arbitration',
      desc: 'Clients approve releases or timers auto-settle upon review completion. Any disputed milestone is resolved by a 3-arbitrator peer pool.'
    }
  ];

  const highlights = [
    {
      icon: Lock,
      title: 'Non-Custodial Escrow',
      desc: 'Funds are held in decentralized smart contracts. Platform administrators have zero custody over client deposits.'
    },
    {
      icon: Bot,
      title: 'AI Term Synthesizer',
      desc: 'Natural language negotiation parsed into structured AgreementTerms JSON with flagged open questions and risk warnings.'
    },
    {
      icon: GitPullRequest,
      title: 'Advisory GitHub Analysis',
      desc: 'Inspects commit SHAs, code additions, AST changes, and test runs to provide an advisory progress score. Client retains decision authority.'
    },
    {
      icon: Scale,
      title: 'Decentralized Arbitration',
      desc: 'Selected 3-arbitrator pool votes on disputed funds, assisted by advisory AI evidence summarization and median share calculation.'
    }
  ];

  return (
    <div className="space-y-20 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage border border-forest/20 text-forest text-xs font-heading font-semibold">
            <ShieldCheck className="w-4 h-4 text-coral" />
            <span>SANKALP · Bridging Work and Trust</span>
          </div>

          <button
            onClick={() => toggleAppMode && toggleAppMode()}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-bold border transition-all cursor-pointer shadow-xs ${
              !isMock
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-400 text-amber-950 hover:bg-amber-100'
            }`}
            title="Click to toggle between Live and Demo modes"
          >
            <span className={`w-2 h-2 rounded-full ${!isMock ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{!isMock ? '🟢 Live Mode Active' : '🟡 Demo Mode Active'}</span>
            <span className="text-[10px] font-mono uppercase bg-black/5 px-1 rounded ml-1">Switch</span>
          </button>
        </div>

        <h1 className="text-4xl sm:text-6xl font-heading font-bold text-ink tracking-tight leading-[1.1]">
          Smart Agreements and Network for Key Achievements, Ledgers and Payments
        </h1>

        <p className="text-base sm:text-lg text-ink/70 max-w-2xl mx-auto leading-relaxed">
          SANKALP unites off-chain engineering activity with deterministic on-chain milestone escrow. Guaranteed payments for developers, verifiable deliverables for clients.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            variant="primary"
            onClick={() => setActivePage('dashboard')}
            icon={ArrowRight}
          >
            Launch Dashboard
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => setActivePage('projects')}
          >
            Explore Projects Feed
          </Button>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="bg-sage/40 border border-gray rounded-card-lg p-8 sm:p-12">
        <div className="max-w-2xl mb-10">
          <span className="text-xs font-heading font-semibold text-forest uppercase tracking-wider">
            Three-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-ink mt-1">
            How SANKALP Secures Every Freelance Engagement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {threeSteps.map((s, idx) => (
            <div key={idx} className="space-y-3 relative">
              <span className="text-3xl font-heading font-bold text-forest/40">
                {s.num}
              </span>
              <h3 className="font-heading font-bold text-base text-ink">{s.title}</h3>
              <p className="text-xs sm:text-sm text-ink/70 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-ink">
            Composed for Modern Tech Teams
          </h2>
          <p className="text-sm text-ink/60 mt-2">
            Every step is protected by mathematical invariants, verifiable GitHub commits, and Ethereum Sepolia smart contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="hover:border-forest/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-[10px] bg-sage text-forest flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-forest" />
                  </div>
                  <h3 className="font-heading font-bold text-base text-ink mb-1.5">{f.title}</h3>
                  <p className="text-xs text-ink/70 leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Quick Launch Banner */}
      <section className="p-8 rounded-card-lg bg-forest text-ivory flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-heading font-bold text-xl text-ivory">
            Ready to explore verifiable escrow?
          </h3>
          <p className="text-xs text-ivory/80 mt-1 max-w-xl">
            Test milestone submissions, inspect AI GitHub verification signals, or simulate mutual agreement approval.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            if (isConnected) {
              setActivePage('agreements');
            } else {
              openConnectModal();
            }
          }}
          className="whitespace-nowrap"
        >
          {isConnected ? 'Go to Agreements' : 'Connect Wallet'}
        </Button>
      </section>
    </div>
  );
}
