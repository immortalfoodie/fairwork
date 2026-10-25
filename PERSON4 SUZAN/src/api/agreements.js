import { apiFetch } from './client.js';
import { mockStore } from '../mock/mockStore.js';

/**
 * Normalizes agreement structure across Live and Demo mode
 */
export function normalizeAgreement(ag) {
  if (!ag) return ag;
  let terms = ag.terms;
  if (!terms && ag.termsJson) {
    try {
      terms = JSON.parse(ag.termsJson);
    } catch {}
  }
  return {
    ...ag,
    id: ag.id || ag.agreementId,
    agreementId: ag.id || ag.agreementId,
    terms: terms || ag.terms || null,
    termsHash: ag.canonicalHash || ag.termsHash,
    clientApproved: ag.clientApprovedAt ? true : (ag.clientApproved || false),
    freelancerApproved: ag.freelancerApprovedAt ? true : (ag.freelancerApproved || false),
    openQuestions: ag.openQuestions || [],
    warnings: ag.warnings || []
  };
}

/**
 * Generate agreement draft from chat thread via AI service
 * POST /agreements/draft { threadId, freelancerId, ... } -> { agreementId, terms, openQuestions, warnings }
 */
export async function draftAgreement(threadIdOrOptions, extra = {}) {
  const payload = typeof threadIdOrOptions === 'object' && threadIdOrOptions !== null
    ? { ...threadIdOrOptions, ...extra }
    : { threadId: threadIdOrOptions, ...extra };

  const data = await apiFetch('/agreements/draft', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return normalizeAgreement(data);
}

/**
 * Get all agreements for user
 * GET /agreements
 */
export async function getAgreements() {
  let list = [];
  try {
    const data = await apiFetch('/agreements');
    if (Array.isArray(data)) list = data.map(normalizeAgreement);
  } catch (err) {
    console.warn('API getAgreements notice:', err);
  }

  // Cross-pollinate with mockStore agreements
  if (typeof window !== 'undefined' && mockStore?.data?.agreements) {
    const existingIds = new Set(list.map(a => a.id));
    for (const mag of mockStore.data.agreements) {
      if (!existingIds.has(mag.id)) {
        list.push(normalizeAgreement(mag));
      }
    }
  }

  return list;
}

/**
 * Get agreement details by ID with multi-layer fallback
 * GET /agreements/:id
 */
export async function getAgreement(id) {
  if (!id) return null;

  try {
    const data = await apiFetch(`/agreements/${id}`);
    if (data) return normalizeAgreement(data);
  } catch (err) {
    console.warn(`Direct fetch for agreement ${id} failed:`, err);
  }

  // Fallback 1: check user agreements list
  try {
    const all = await getAgreements();
    if (Array.isArray(all) && all.length > 0) {
      const match = all.find(a => a.id === id || a.agreementId === id || String(a.onchainId) === id);
      if (match) return match;

      // Match by title or postId prefix if synthetic
      if (id.startsWith('ag-')) {
        const rawKey = id.replace('ag-', '');
        const titleMatch = all.find(a => a.title?.includes(rawKey) || a.terms?.title?.includes(rawKey));
        if (titleMatch) return titleMatch;
      }

      // Latest pending draft fallback
      const latestDraft = all.find(a => String(a.status || '').toUpperCase() === 'DRAFT');
      if (latestDraft) return latestDraft;
    }
  } catch {}

  // Fallback 2: check mockStore directly
  if (typeof window !== 'undefined' && mockStore?.data?.agreements) {
    const match = mockStore.data.agreements.find(a => a.id === id || a.agreementId === id);
    if (match) return normalizeAgreement(match);
    const mockDraft = mockStore.data.agreements.find(a => String(a.status || '').toUpperCase() === 'DRAFT');
    if (mockDraft) return normalizeAgreement(mockDraft);
  }

  return null;
}

/**
 * Update agreement terms (resets approvals)
 * PUT /agreements/:id/terms { terms }
 */
export async function updateAgreementTerms(id, terms) {
  return apiFetch(`/agreements/${id}/terms`, {
    method: 'PUT',
    body: JSON.stringify({ terms })
  });
}

/**
 * Approve draft terms
 * POST /agreements/:id/approve-draft
 */
export async function approveDraft(id, options = {}) {
  const mutualLock = options?.mutualLock ?? false;
  return apiFetch(`/agreements/${id}/approve-draft`, {
    method: 'POST',
    body: JSON.stringify({ mutualLock })
  });
}

/**
 * Link on-chain agreement ID and txHash
 * POST /agreements/:id/link-chain { onchainId, txHash }
 */
export async function linkChain(id, { onchainId, txHash }) {
  return apiFetch(`/agreements/${id}/link-chain`, {
    method: 'POST',
    body: JSON.stringify({ onchainId, txHash })
  });
}

/**
 * Get agreement timeline
 * GET /agreements/:id/timeline
 */
export async function getTimeline(id) {
  return apiFetch(`/agreements/${id}/timeline`);
}

/**
 * Get agreement payments summary
 * GET /agreements/:id/payments
 */
export async function getPayments(id) {
  return apiFetch(`/agreements/${id}/payments`);
}

/**
 * Get agreement active alerts
 * GET /agreements/:id/alerts
 */
export async function getAlerts(id) {
  return apiFetch(`/agreements/${id}/alerts`);
}
