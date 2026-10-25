import React, { useState, useEffect, useRef } from 'react';
import { getThreads, getMessages, sendMessage } from '../api/threads.js';
import { draftAgreement } from '../api/agreements.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';
import { Card, Button, Badge, Modal, EmptyState } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
import { formatRelativeTime } from '../lib/formatters.js';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  Loader2,
  User,
  ArrowRight,
  Shield,
  Clock,
  Coins,
  FileCheck2
} from 'lucide-react';

export default function ChatPage({ activeThreadId, onOpenDraftReview }) {
  const { address } = useWallet();
  const toast = useToast();

  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(activeThreadId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Helper to extract participant addresses safely from mock or API threads
  const getThreadParticipants = (t) => {
    if (!t) return [];
    if (Array.isArray(t.participants)) {
      return t.participants
        .map(p => (typeof p === 'string' ? p : p?.walletAddress || ''))
        .filter(Boolean);
    }
    const addrs = [];
    if (t.client?.walletAddress) addrs.push(t.client.walletAddress);
    if (t.freelancer?.walletAddress) addrs.push(t.freelancer.walletAddress);
    return addrs;
  };

  // Load threads
  const loadThreadsList = async () => {
    try {
      const data = await getThreads();
      const list = Array.isArray(data) ? data : (data?.threads || []);
      setThreads(list);
      if (!selectedThreadId && list.length > 0) {
        setSelectedThreadId(list[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreadsList();
  }, []);

  // Sync prop changes
  useEffect(() => {
    if (activeThreadId) {
      setSelectedThreadId(activeThreadId);
    }
  }, [activeThreadId]);

  // Load and poll messages for selected thread every 5 seconds
  useEffect(() => {
    if (!selectedThreadId) return;

    let isMounted = true;
    const fetchMsgs = async () => {
      try {
        const msgs = await getMessages(selectedThreadId);
        if (isMounted) {
          setMessages(Array.isArray(msgs) ? msgs : []);
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 5000); // 5s polling

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedThreadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !selectedThreadId || isSending) return;

    try {
      setIsSending(true);
      const newMsg = await sendMessage(selectedThreadId, trimmed);
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const currentThread = threads.find(t => t.id === selectedThreadId);
  const currentParticipants = getThreadParticipants(currentThread);
  const counterparty = currentParticipants.find(p => typeof p === 'string' && address && typeof address === 'string' && p.toLowerCase() !== address.toLowerCase())
    || currentParticipants[0]
    || DEMO_ACCOUNTS.FREELANCER.address;

  const handleGenerateAgreement = async () => {
    if (!selectedThreadId) return;

    try {
      setIsDrafting(true);
      toast.info('Advisory AI is parsing chat context and synthesizing AgreementTerms...');
      const result = await draftAgreement(selectedThreadId, {
        freelancerId: counterparty,
        freelancerAddress: counterparty,
        otherAddress: counterparty,
        postId: currentThread?.postId,
        title: currentThread?.postTitle || 'Web3 Smart Contract & Frontend Development'
      });
      toast.success('Agreement terms drafted by AI! Redirecting to review...');
      setIsAiModalOpen(false);
      if (onOpenDraftReview) {
        onOpenDraftReview(result.agreementId || result.id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI agreement draft');
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-170px)] min-h-[580px]">
        {/* Left: Threads List */}
        <div className="md:col-span-4 flex flex-col bg-white border border-gray rounded-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray flex items-center justify-between bg-sage/30">
            <h2 className="text-sm font-heading font-bold text-ink flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-forest" />
              Negotiation Threads
            </h2>
            <span className="text-xs text-ink/50 font-mono">{threads.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray p-2 space-y-1">
            {isLoadingThreads ? (
              <div className="p-4 text-center text-xs text-ink/50">Loading conversations...</div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink/50">
                No active chat threads. Start a chat from a community project proposal.
              </div>
            ) : (
              threads.map(t => {
                const isSelected = t.id === selectedThreadId;
                const parts = getThreadParticipants(t);
                const other = parts.find(p => typeof p === 'string' && address && typeof address === 'string' && p.toLowerCase() !== address.toLowerCase())
                  || parts[0]
                  || t.postTitle
                  || 'Counterparty';

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full text-left p-3 rounded-[10px] transition-all ${
                      isSelected
                        ? 'bg-sage-light/60 border border-forest/30 font-semibold'
                        : 'hover:bg-sage/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-ink truncate">
                        {typeof other === 'string' && other.startsWith('0x')
                          ? `${other.slice(0, 8)}...${other.slice(-4)}`
                          : String(other).slice(0, 20)}
                      </span>
                      {t.updatedAt && (
                        <span className="text-[10px] text-ink/50">
                          {formatRelativeTime(t.updatedAt)}
                        </span>
                      )}
                    </div>
                    {t.lastMessage && (
                      <p className="text-xs text-ink/70 truncate">{t.lastMessage}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Window */}
        <div className="md:col-span-8 flex flex-col bg-white border border-gray rounded-card overflow-hidden shadow-sm">
          {selectedThreadId ? (
            <>
              {/* Header Bar with prominent "Generate agreement with AI" button */}
              <div className="p-4 border-b border-gray flex flex-wrap items-center justify-between gap-3 bg-sage/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-forest text-ivory flex items-center justify-center font-heading font-bold text-xs">
                    {counterparty && typeof counterparty === 'string' && counterparty.startsWith('0x')
                      ? counterparty.charAt(2).toUpperCase()
                      : 'C'}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-xs text-ink">
                      Negotiation with Counterparty
                    </h3>
                    {counterparty && typeof counterparty === 'string' && counterparty.startsWith('0x') && (
                      <AddressChip address={counterparty} showExplorer={false} />
                    )}
                  </div>
                </div>

                {/* Prominent Coral AI Agreement Drafter Button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAiModalOpen(true)}
                  icon={Sparkles}
                  className="font-heading font-semibold"
                >
                  Generate agreement with AI
                </Button>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ivory/50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink/50 text-xs">
                    <MessageSquare className="w-8 h-8 text-forest/40 mb-2" />
                    <p>No messages yet in this negotiation thread.</p>
                    <p className="mt-1">Agree on scope, deliverables, and budget in ETH.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const senderAddr = typeof m.sender === 'object' && m.sender !== null
                      ? (m.sender.walletAddress || '')
                      : (typeof m.sender === 'string' ? m.sender : (m.senderAddress || ''));
                    const isMe = Boolean(
                      address &&
                      senderAddr &&
                      typeof senderAddr === 'string' &&
                      typeof address === 'string' &&
                      senderAddr.toLowerCase() === address.toLowerCase()
                    );
                    const textBody = m.content || m.text || '';

                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-card p-3.5 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-forest text-ivory rounded-br-xs'
                              : 'bg-white border border-gray text-ink rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{textBody}</p>
                        </div>
                        <span className="text-[10px] text-ink/40 mt-1 px-1 font-mono">
                          {formatRelativeTime(m.createdAt || m.ts)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Discuss milestone deliverables, budget, and acceptance criteria..."
                  className="flex-1 bg-ivory text-ink border border-gray rounded-[10px] px-3.5 py-2 text-xs placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!inputText.trim() || isSending}
                  loading={isSending}
                  icon={Send}
                >
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose an existing negotiation thread from the left or open a new one from Projects."
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Agreement Generator Modal with explicit Submit Form Button */}
      {isAiModalOpen && (
        <Modal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          title="Autogenerate Smart Agreement with AI"
          subtitle="SANKALP advisory AI will synthesize milestones, penalties, and terms from your conversation."
          maxWidth="max-w-xl"
        >
          <div className="space-y-5 text-ink">
            <div className="p-4 rounded-card bg-ivory border border-gray space-y-3">
              <div className="flex items-center gap-2 text-forest font-heading font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-coral" />
                <span>AI Synthesis Engine Details</span>
              </div>
              <ul className="text-xs text-ink/80 space-y-2 list-disc list-inside">
                <li>Analyzes recent message exchange to formulate concrete milestone deliverables.</li>
                <li>Assigns standard 5-day client review window with automated fallback protection.</li>
                <li>Applies calibrated 1% / day late penalty (capped at 30%) with grace period.</li>
                <li>Computes canonical Keccak-256 hash for immutable verification before chain creation.</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-card bg-white border border-gray">
                <span className="text-ink/50 block mb-1">Counterparty</span>
                <span className="font-mono font-semibold text-ink truncate block">
                  {counterparty ? `${counterparty.slice(0, 10)}...${counterparty.slice(-6)}` : 'Demo Partner'}
                </span>
              </div>
              <div className="p-3 rounded-card bg-white border border-gray">
                <span className="text-ink/50 block mb-1">Escrow Currency</span>
                <span className="font-mono font-semibold text-forest">ETH (Sepolia)</span>
              </div>
            </div>

            {/* Explicit Form Submission Button */}
            <div className="pt-4 border-t border-gray flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAiModalOpen(false)}
                disabled={isDrafting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerateAgreement}
                loading={isDrafting}
                icon={FileCheck2}
              >
                Draft Agreement & Open Review
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
