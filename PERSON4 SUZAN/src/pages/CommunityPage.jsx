import React, { useState, useEffect } from 'react';
import { getPosts, getProposals, acceptProposal } from '../api/posts.js';
import { getAgreements } from '../api/agreements.js';
import { mockStore, DEMO_ACCOUNTS } from '../mock/mockStore.js';
import PostCard from '../components/community/PostCard.jsx';
import CreatePostModal from '../components/community/CreatePostModal.jsx';
import ProposalModal from '../components/community/ProposalModal.jsx';
import { Card, Button, Badge, Modal, AmountDisplay, EmptyState } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
import {
  Search,
  Plus,
  Filter,
  MessageSquare,
  Send,
  Sparkles,
  Briefcase,
  FileText,
  Users,
  CheckCircle2,
  Eye,
  Clock,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { createThread } from '../api/threads.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatRelativeTime } from '../lib/formatters.js';

export default function CommunityPage({
  onNavigateToChat,
  onOpenDraft,
  onOpenAgreement,
  externalSearchQuery,
  isCreateModalForcedOpen,
  onCloseCreateModal,
}) {
  const { address } = useWallet();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postProposals, setPostProposals] = useState([]);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [isAcceptingId, setIsAcceptingId] = useState(null);

  const handleAcceptProposal = async (prop) => {
    if (!prop || !selectedPost) return;
    try {
      setIsAcceptingId(prop.id);
      toast.info('Accepting proposal and initializing escrow agreement draft...');
      const res = await acceptProposal(prop.id, selectedPost.id);

      const agreementId =
        res?.agreementId ||
        res?.data?.agreementId ||
        res?.agreement?.id ||
        prop.agreementId;

      // Update proposal in local state WITH agreementId
      setPostProposals((prev) =>
        prev.map((p) => (p.id === prop.id ? { ...p, status: 'ACCEPTED', agreementId } : p))
      );
      if (viewingProposal && viewingProposal.id === prop.id) {
        setViewingProposal((prev) => ({ ...prev, status: 'ACCEPTED', agreementId }));
      }

      toast.success('Proposal accepted! Escrow agreement drafted.');

      setSelectedPost(null);
      setViewingProposal(null);
      if (onOpenDraft) {
        onOpenDraft(agreementId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to accept proposal');
    } finally {
      setIsAcceptingId(null);
    }
  };

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    if (isCreateModalForcedOpen) {
      setIsCreateOpen(true);
    }
  }, [isCreateModalForcedOpen]);

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const fetchPostsList = async () => {
    try {
      setIsLoading(true);
      let data = [];
      try {
        data = await getPosts({
          type: filterType || undefined,
          q: searchQuery || undefined
        });
      } catch (err) {
        console.warn('Backend posts fetch error, falling back:', err);
        data = (mockStore.data && mockStore.data.posts) || [];
      }
      setPosts(data || []);
    } catch (err) {
      toast.error('Could not load projects feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsList();
  }, [filterType, searchQuery]);

  const handleOpenPostDetail = async (post) => {
    setSelectedPost(post);
    try {
      const props = await getProposals(post.id);
      setPostProposals(props || []);
    } catch {
      setPostProposals([]);
    }
  };

  const handleStartChatFromDetail = async (otherAddr, postId) => {
    try {
      const fallbackAddr = selectedPost ? (
        typeof selectedPost.author === 'object' && selectedPost.author !== null
          ? (selectedPost.author.walletAddress || '')
          : (selectedPost.author || selectedPost.creatorAddress || '')
      ) : '';
      const target = otherAddr || fallbackAddr || DEMO_ACCOUNTS.FREELANCER.address;

      const thread = await createThread({
        otherAddress: target,
        recipientId: target,
        subject: `Consultation: ${selectedPost?.title || 'Project Discussion'}`,
        postId
      });
      toast.success('Chat thread opened');
      setSelectedPost(null);
      if (onNavigateToChat) onNavigateToChat(thread.id);
    } catch (err) {
      toast.error(err.message || 'Could not start chat');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Projects & Community Marketplace
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Discover verified jobs and offerings backed by SANKALP smart milestone escrow.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          icon={Plus}
          className="self-start sm:self-auto"
        >
          Create Project Post
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-card border border-gray shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, skills, keywords..."
            className="w-full bg-ivory border border-gray rounded-[10px] pl-9 pr-3.5 py-2 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: '', label: 'All Listings' },
            { id: 'JOB', label: '💼 Jobs' },
            { id: 'SERVICE', label: '🛠 Services' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-heading font-medium whitespace-nowrap transition-all ${
                filterType === f.id
                  ? 'bg-forest text-ivory font-semibold shadow-sm'
                  : 'bg-sage/50 text-ink/70 border border-gray hover:text-ink hover:bg-sage'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 rounded-card bg-white border border-gray p-6 animate-pulse space-y-4">
              <div className="h-5 bg-gray rounded w-2/3" />
              <div className="h-4 bg-gray/60 rounded w-full" />
              <div className="h-4 bg-gray/60 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No listings found"
          description="Try adjusting your keywords or category filters, or create a new project listing."
          actionLabel="Create Project"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => handleOpenPostDetail(post)}
              className="cursor-pointer"
            >
              <PostCard
                post={post}
                onSelect={handleOpenPostDetail}
                onSelectPost={handleOpenPostDetail}
                onStartChat={onNavigateToChat}
              />
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (() => {
        const postAuthor = typeof selectedPost.author === 'object' && selectedPost.author !== null
          ? (selectedPost.author.walletAddress || '')
          : (selectedPost.author || selectedPost.creatorAddress || '');

        return (
          <Modal
            isOpen={Boolean(selectedPost)}
            onClose={() => setSelectedPost(null)}
            title={selectedPost.title}
            subtitle={`Posted by ${postAuthor ? postAuthor.slice(0, 8) + '...' : 'Anonymous'} · ${formatRelativeTime(selectedPost.createdAt)}`}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge status={selectedPost.type === 'JOB' ? 'pending' : 'success'}>
                  {selectedPost.type}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                  <span>Budget:</span>
                  <AmountDisplay amount={selectedPost.budget} size="sm" />
                </div>
                {postAuthor && <AddressChip address={postAuthor} />}
              </div>

              <div className="space-y-2">
                <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-ink/60">
                  Description & Deliverables
                </h4>
                <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line bg-ivory p-4 rounded-card border border-gray font-sans">
                  {selectedPost.description}
                </p>
              </div>

              {selectedPost.skills && selectedPost.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2 py-0.5 rounded-full bg-sage text-forest border border-forest/10"
                    >
                      #{skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Received Proposals Section */}
              <div className="space-y-3 pt-4 border-t border-gray">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-ink/70 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-forest" />
                    <span>Submitted Proposals ({postProposals.length})</span>
                  </h4>
                  {postProposals.length > 0 && (
                    <span className="text-[11px] text-forest font-semibold bg-sage/60 px-2.5 py-0.5 rounded-full border border-forest/20">
                      {postProposals.length} Received
                    </span>
                  )}
                </div>

                {postProposals.length === 0 ? (
                  <div className="p-4 rounded-card bg-ivory border border-gray text-center space-y-1">
                    <p className="text-xs text-ink/60 font-medium">No proposals submitted yet for this post.</p>
                    <p className="text-[11px] text-ink/40">Freelancers can apply with customized milestone estimates and proposals.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {postProposals.map((prop, idx) => {
                      const propAuthor = prop.author || prop.freelancer?.walletAddress || '';
                      const propName = prop.authorName || prop.freelancer?.name || 'Freelancer';
                      const propMessage = prop.message || prop.coverLetter || '';
                      const propRate = prop.price || (prop.proposedBudget ? `${prop.proposedBudget} ETH` : 'Negotiable');
                      const isAccepted = prop.status === 'ACCEPTED';

                      return (
                        <div
                          key={prop.id || idx}
                          className={`p-3.5 rounded-card bg-white border transition-all shadow-xs space-y-2.5 ${
                            isAccepted ? 'border-emerald-400/80 bg-emerald-50/20' : 'border-gray hover:border-forest/40'
                          }`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-forest text-ivory flex items-center justify-center text-xs font-bold font-heading">
                                {propName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-heading font-bold text-ink flex items-center gap-2">
                                  <span>{propName}</span>
                                  {isAccepted && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.2 rounded-full">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      Accepted
                                    </span>
                                  )}
                                </div>
                                {propAuthor && (
                                  <span className="text-[10px] font-mono text-ink/50">
                                    {propAuthor.startsWith('0x') ? `${propAuthor.slice(0, 8)}...${propAuthor.slice(-4)}` : propAuthor}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-mono font-bold text-forest">
                                {propRate}
                              </div>
                              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                {prop.proposedDuration && (
                                  <span className="text-[10px] text-ink/50 bg-gray/50 px-1.5 py-0.5 rounded font-sans">
                                    {prop.proposedDuration}
                                  </span>
                                )}
                                {prop.createdAt && (
                                  <span className="text-[10px] text-ink/40">
                                    {formatRelativeTime(prop.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-ink/80 leading-relaxed bg-ivory/60 p-2.5 rounded-[8px] border border-gray/50 whitespace-pre-wrap font-sans line-clamp-3">
                            {propMessage}
                          </p>

                          <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingProposal(prop)}
                              icon={Eye}
                              className="text-xs py-1 px-3"
                            >
                              See Proposal
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStartChatFromDetail(propAuthor, selectedPost.id)}
                              icon={MessageSquare}
                              className="text-xs py-1 px-3"
                            >
                              Chat
                            </Button>

                            {isAccepted ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                  let targetId = prop.agreementId;
                                  if (!targetId) {
                                    try {
                                      const all = await getAgreements();
                                      const matched = all.find(
                                        (a) =>
                                          a.title === selectedPost?.title ||
                                          a.terms?.title === selectedPost?.title
                                      );
                                      if (matched) targetId = matched.id;
                                    } catch {}
                                  }
                                  setSelectedPost(null);
                                  setViewingProposal(null);
                                  if (onOpenDraft) {
                                    onOpenDraft(targetId);
                                  }
                                }}
                                icon={CheckCircle2}
                                className="text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                View Agreement
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                loading={isAcceptingId === prop.id}
                                onClick={() => handleAcceptProposal(prop)}
                                icon={CheckCircle2}
                                className="text-xs py-1 px-3 bg-forest hover:bg-forest/90 text-white"
                              >
                                Accept Proposal
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray">
                <div className="text-xs text-ink/60">
                  {postProposals.length} proposal(s) available
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartChatFromDetail(postAuthor, selectedPost.id)}
                    icon={MessageSquare}
                  >
                    Start Chat
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsProposalModalOpen(true);
                    }}
                    icon={Send}
                  >
                    Submit Proposal
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        onPostCreated={() => {
          handleCloseCreate();
          fetchPostsList();
        }}
        onCreated={() => {
          handleCloseCreate();
          fetchPostsList();
        }}
      />

      {/* Proposal Details Modal */}
      {viewingProposal && (
        <Modal
          isOpen={!!viewingProposal}
          onClose={() => setViewingProposal(null)}
          title={`Proposal from ${viewingProposal.authorName || 'Freelancer'}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5 text-ink">
            {/* Freelancer Header */}
            <div className="flex items-center justify-between p-3.5 bg-ivory rounded-card border border-gray flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest text-ivory flex items-center justify-center text-sm font-bold font-heading shadow-xs">
                  {(viewingProposal.authorName || 'F').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-heading font-bold text-sm text-ink">
                    {viewingProposal.authorName || 'Freelancer'}
                  </div>
                  {viewingProposal.author && (
                    <AddressChip address={viewingProposal.author} showCopy />
                  )}
                </div>
              </div>

              {viewingProposal.status === 'ACCEPTED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Accepted</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending Client Review</span>
                </span>
              )}
            </div>

            {/* Key Proposed Terms Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-card border border-gray">
                <span className="block text-[11px] font-heading font-semibold text-ink/60 uppercase">
                  Proposed Rate / Budget
                </span>
                <span className="text-base font-mono font-bold text-forest mt-0.5 block">
                  {viewingProposal.price || (viewingProposal.proposedBudget ? `${viewingProposal.proposedBudget} ETH` : '1.00 ETH')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-card border border-gray">
                <span className="block text-[11px] font-heading font-semibold text-ink/60 uppercase">
                  Estimated Timeline
                </span>
                <span className="text-base font-sans font-semibold text-ink mt-0.5 block">
                  {viewingProposal.proposedDuration || '14 business days'}
                </span>
              </div>
            </div>

            {/* Pitch & Cover Letter */}
            <div className="space-y-1.5">
              <h5 className="font-heading font-semibold text-xs uppercase tracking-wider text-ink/70">
                Freelancer Pitch & Approach
              </h5>
              <div className="p-3.5 rounded-card bg-ivory/80 border border-gray text-xs text-ink/80 leading-relaxed font-sans whitespace-pre-wrap max-h-56 overflow-y-auto">
                {viewingProposal.message || viewingProposal.coverLetter || 'No pitch description provided.'}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingProposal(null)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const targetAddr = viewingProposal.author || viewingProposal.freelancer?.walletAddress;
                    setViewingProposal(null);
                    handleStartChatFromDetail(targetAddr, selectedPost?.id);
                  }}
                  icon={MessageSquare}
                >
                  Chat with Freelancer
                </Button>

                {viewingProposal.status === 'ACCEPTED' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      let targetId = viewingProposal.agreementId;
                      if (!targetId) {
                        try {
                          const all = await getAgreements();
                          const matched = all.find(
                            (a) =>
                              a.title === selectedPost?.title ||
                              a.terms?.title === selectedPost?.title
                          );
                          if (matched) targetId = matched.id;
                        } catch {}
                      }
                      setSelectedPost(null);
                      setViewingProposal(null);
                      if (onOpenDraft) {
                        onOpenDraft(targetId);
                      }
                    }}
                    icon={CheckCircle2}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Open Agreement Draft
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isAcceptingId === viewingProposal.id}
                    onClick={() => handleAcceptProposal(viewingProposal)}
                    icon={CheckCircle2}
                    className="bg-forest hover:bg-forest/90 text-white"
                  >
                    Accept Proposal & Create Agreement
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Submit Proposal Modal */}
      {selectedPost && (
        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          post={selectedPost}
          onSubmitted={async (newProp) => {
            setIsProposalModalOpen(false);
            if (newProp) {
              setPostProposals((prev) => [newProp, ...prev]);
            }
            try {
              const refreshed = await getProposals(selectedPost.id);
              if (Array.isArray(refreshed)) setPostProposals(refreshed);
            } catch {}
            fetchPostsList();
          }}
          onProposalSubmitted={async (newProp) => {
            setIsProposalModalOpen(false);
            if (newProp) {
              setPostProposals((prev) => [newProp, ...prev]);
            }
            try {
              const refreshed = await getProposals(selectedPost.id);
              if (Array.isArray(refreshed)) setPostProposals(refreshed);
            } catch {}
            fetchPostsList();
          }}
        />
      )}
    </div>
  );
}
