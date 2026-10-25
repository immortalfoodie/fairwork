import { apiFetch } from './client.js';
import { mockStore } from '../mock/mockStore.js';

/**
 * Normalize post schema from backend or mock
 */
export function normalizePost(p) {
  if (!p) return p;
  let skills = [];
  if (Array.isArray(p.skills)) {
    skills = p.skills;
  } else if (typeof p.tags === 'string') {
    try {
      skills = JSON.parse(p.tags);
    } catch {
      skills = p.tags.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (Array.isArray(p.tags)) {
    skills = p.tags;
  }

  const authorAddr = typeof p.author === 'object' && p.author !== null
    ? (p.author.walletAddress || '')
    : (p.author || '');

  const authorName = typeof p.author === 'object' && p.author !== null
    ? (p.author.name || '')
    : (p.authorName || '');

  let budgetStr = p.budget;
  if (typeof p.budget === 'number') {
    budgetStr = `${p.budget} ETH`;
  } else if (!budgetStr) {
    budgetStr = 'Negotiable';
  }

  return {
    ...p,
    author: authorAddr,
    authorName,
    authorObj: typeof p.author === 'object' ? p.author : null,
    skills,
    budget: budgetStr,
    proposalsCount: p.proposalsCount ?? p._count?.proposals ?? 0
  };
}

/**
 * Normalize proposal schema from backend or mock
 */
export function normalizeProposal(prop) {
  if (!prop) return prop;
  const authorAddr = typeof prop.freelancer === 'object' && prop.freelancer !== null
    ? (prop.freelancer.walletAddress || '')
    : (prop.author || '');

  const authorName = typeof prop.freelancer === 'object' && prop.freelancer !== null
    ? (prop.freelancer.name || 'Freelancer')
    : (prop.authorName || 'Freelancer');

  let price = prop.price;
  if (!price && prop.proposedBudget !== undefined) {
    price = `${prop.proposedBudget} ETH`;
  } else if (!price) {
    price = 'Negotiable';
  }

  return {
    ...prop,
    author: authorAddr,
    authorName,
    message: prop.coverLetter || prop.message || '',
    price
  };
}

/**
 * Get posts feed with optional filters
 * GET /posts?type=&q=
 */
export async function getPosts({ type, q } = {}) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (q) params.append('q', q);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch(`/posts${query}`);
  if (Array.isArray(data)) {
    return data.map(normalizePost);
  }
  return data;
}

/**
 * Get single post by ID
 * GET /posts/:id
 */
export async function getPost(id) {
  const data = await apiFetch(`/posts/${id}`);
  return normalizePost(data);
}

/**
 * Create a new Job or Service post
 * POST /posts { type: "JOB" | "SERVICE", title, description, budget, skills[] }
 */
export async function createPost(postData) {
  const data = await apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(postData)
  });
  return normalizePost(data);
}

/**
 * Get proposals for a post
 * GET /posts/:id/proposals
 */
export async function getProposals(postId) {
  let list = [];
  try {
    const data = await apiFetch(`/posts/${postId}/proposals`);
    if (Array.isArray(data)) {
      list = data.map(normalizeProposal);
    }
  } catch (err) {
    console.warn('API getProposals error:', err);
  }

  // Also check mockStore proposals for this post (syncing live and demo seamlessly)
  if (typeof window !== 'undefined' && mockStore?.data?.proposals?.[postId]) {
    const mockList = (mockStore.data.proposals[postId] || []).map(normalizeProposal);
    const existingIds = new Set(list.map(p => p.id));
    for (const m of mockList) {
      if (!existingIds.has(m.id)) {
        list.push(m);
      }
    }
  }

  return list;
}

/**
 * Submit a proposal for a post
 * POST /posts/:id/proposals { message, price }
 */
export async function createProposal(postId, proposalData) {
  const data = await apiFetch(`/posts/${postId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(proposalData)
  });
  const created = normalizeProposal(data);

  // Always mirror in mockStore for seamless cross-mode accessibility
  if (typeof window !== 'undefined' && mockStore?.data && created) {
    if (!mockStore.data.proposals) mockStore.data.proposals = {};
    if (!mockStore.data.proposals[postId]) mockStore.data.proposals[postId] = [];
    mockStore.data.proposals[postId].unshift(created);
    mockStore.save();
  }

  return created;
}

/**
 * Accept a proposal and initiate/draft escrow agreement
 * POST /posts/:postId/proposals/:proposalId/accept
 */
export async function acceptProposal(proposalId, postId) {
  const data = await apiFetch(`/posts/${postId}/proposals/${proposalId}/accept`, {
    method: 'POST'
  });
  return data;
}
