import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { createPost } from '../../api/posts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useWallet } from '../../context/WalletContext.jsx';

const inputBase = 'w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all font-sans';
const inputMono = 'w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all font-mono';
const labelClass = 'block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5';

export default function CreatePostModal({ isOpen, onClose, onPostCreated, onCreated }) {
  const toast = useToast();
  const { isConnected, connectWallet } = useWallet();

  const [type, setType] = useState('JOB');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // JOB-specific fields (client)
  const [timeline, setTimeline] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  // SERVICE-specific fields (freelancer)
  const [availability, setAvailability] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');

  const isJob = type === 'JOB';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      toast.warning('Please connect wallet first');
      connectWallet();
      return;
    }
    if (!title.trim() || !description.trim() || !budget.trim()) {
      toast.error(isJob
        ? 'Please fill in job title, project requirements, and budget'
        : 'Please fill in service title, description, and starting price');
      return;
    }

    try {
      setIsSubmitting(true);
      const skills = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const numMatch = budget.match(/[\d.]+/);
      const parsedBudget = numMatch ? parseFloat(numMatch[0]) : 1.0;

      const postData = {
        type,
        title: title.trim(),
        description: description.trim(),
        budget: parsedBudget,
        skills,
        tags: skills,
        // Include type-specific fields
        ...(isJob
          ? {
              timeline: timeline.trim() || undefined,
              experienceLevel: experienceLevel || undefined,
            }
          : {
              availability: availability.trim() || undefined,
              portfolioLink: portfolioLink.trim() || undefined,
            }
        ),
      };

      const newPost = await createPost(postData);
      toast.success('Post created successfully in the community!');
      
      // Support both callback prop conventions safely
      if (typeof onPostCreated === 'function') onPostCreated(newPost);
      if (typeof onCreated === 'function') onCreated(newPost);
      
      onClose();

      // Reset form
      setTitle('');
      setDescription('');
      setBudget('');
      setSkillsInput('');
      setTimeline('');
      setExperienceLevel('');
      setAvailability('');
      setPortfolioLink('');
    } catch (err) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Community Post" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-ink">
        {/* Post Type Toggle */}
        <div>
          <label className={labelClass}>Post Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('JOB')}
              className={`py-2 px-3 rounded-[10px] text-xs font-heading font-semibold border transition-all ${
                type === 'JOB'
                  ? 'bg-forest text-ivory border-forest shadow-sm'
                  : 'bg-sage/40 border-gray text-ink/70 hover:bg-sage hover:text-ink'
              }`}
            >
              Hiring: Job Opportunity
            </button>
            <button
              type="button"
              onClick={() => setType('SERVICE')}
              className={`py-2 px-3 rounded-[10px] text-xs font-heading font-semibold border transition-all ${
                type === 'SERVICE'
                  ? 'bg-forest text-ivory border-forest shadow-sm'
                  : 'bg-sage/40 border-gray text-ink/70 hover:bg-sage hover:text-ink'
              }`}
            >
              Offering: Freelance Service
            </button>
          </div>
        </div>

        {/* ─── JOB (Client) Fields ─────────────────────────────── */}
        {isJob ? (
          <>
            {/* Job Title */}
            <div>
              <label className={labelClass}>Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fullstack React & Solidity Escrow Engineer"
                className={inputBase}
                required
              />
            </div>

            {/* Budget Range */}
            <div>
              <label className={labelClass}>Budget Range</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 0.5 – 1.0 ETH"
                className={inputMono}
                required
              />
            </div>

            {/* Required Skills */}
            <div>
              <label className={labelClass}>Required Skills (comma separated)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="React, Solidity, Hardhat, Ethers.js"
                className={inputBase}
              />
            </div>

            {/* Timeline & Experience Level in 2-col grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Project Timeline</label>
                <input
                  type="text"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g. 2 weeks"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className={inputBase + ' appearance-none cursor-pointer'}
                >
                  <option value="">Any level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            {/* Project Requirements */}
            <div>
              <label className={labelClass}>Project Requirements</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline requirements, milestones, expected deliverables, and repo links..."
                className={inputBase + ' resize-none'}
                required
              />
            </div>
          </>
        ) : (
          /* ─── SERVICE (Freelancer) Fields ───────────────────── */
          <>
            {/* Service Title */}
            <div>
              <label className={labelClass}>Service Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Smart Contract Audit & Gas Optimization"
                className={inputBase}
                required
              />
            </div>

            {/* Starting Price */}
            <div>
              <label className={labelClass}>Starting Price</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 0.5 ETH"
                className={inputMono}
                required
              />
            </div>

            {/* Skills & Expertise */}
            <div>
              <label className={labelClass}>Skills & Expertise (comma separated)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Solidity, OpenZeppelin, Gas Optimization, ERC-20"
                className={inputBase}
              />
            </div>

            {/* Availability & Portfolio in 2-col grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Availability</label>
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. 20 hrs/week"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Portfolio / GitHub</label>
                <input
                  type="text"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className={inputBase}
                />
              </div>
            </div>

            {/* Service Description */}
            <div>
              <label className={labelClass}>Service Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you offer, your process, past experience, and turnaround time..."
                className={inputBase + ' resize-none'}
                required
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isJob ? 'Post Job' : 'Offer Service'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
