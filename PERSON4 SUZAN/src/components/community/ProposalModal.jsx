import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { createProposal } from '../../api/posts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useWallet } from '../../context/WalletContext.jsx';

export default function ProposalModal({ isOpen, onClose, post, onSubmitted, onProposalSubmitted }) {
  const toast = useToast();
  const { isConnected, connectWallet } = useWallet();

  const [price, setPrice] = useState(post?.budget || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      toast.warning('Please connect wallet first');
      connectWallet();
      return;
    }
    if (!price.trim() || !message.trim()) {
      toast.error('Please enter proposed price and proposal message');
      return;
    }

    try {
      setIsSubmitting(true);
      const numMatch = price.match(/[\d.]+/);
      const parsedNum = numMatch ? parseFloat(numMatch[0]) : 1.0;

      const proposal = await createProposal(post.id, {
        price: (price.includes('ETH') || price.includes('MATIC')) ? price.replace('MATIC', 'ETH').trim() : `${price.trim()} ETH`,
        proposedBudget: parsedNum,
        message: message.trim(),
        coverLetter: message.trim()
      });
      toast.success('Proposal submitted successfully!');
      if (typeof onProposalSubmitted === 'function') onProposalSubmitted(proposal);
      if (typeof onSubmitted === 'function') onSubmitted(proposal);
      onClose();
      setMessage('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Proposal for "${post.title}"`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-ink">
        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Proposed Price / Rate
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 0.5 ETH"
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Proposal Pitch & Plan
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Highlight your Web3 experience, proposed milestone milestones, timeline, and GitHub profile..."
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 resize-none font-sans"
            required
          />
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Send Proposal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
