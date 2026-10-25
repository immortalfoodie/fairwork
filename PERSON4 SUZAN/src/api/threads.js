import { apiFetch } from './client.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';

/**
 * Normalizes message object from backend or mock
 */
export function normalizeMessage(m) {
  if (!m) return m;
  const senderAddr = typeof m.sender === 'object' && m.sender !== null
    ? (m.sender.walletAddress || '')
    : (typeof m.sender === 'string' ? m.sender : (m.senderAddress || ''));

  return {
    ...m,
    id: m.id || `msg-${Date.now()}-${Math.random()}`,
    sender: senderAddr,
    senderAddress: senderAddr,
    senderName: (typeof m.sender === 'object' && m.sender?.name) ? m.sender.name : '',
    content: m.content || m.text || '',
    text: m.text || m.content || '',
    createdAt: m.createdAt || m.ts || new Date().toISOString()
  };
}

/**
 * Get chat threads for authenticated user
 * GET /threads
 */
export async function getThreads() {
  return apiFetch('/threads');
}

/**
 * Start or open thread with address
 * POST /threads { otherAddress, recipientId, subject, postId? }
 */
export async function createThread({ otherAddress, recipientId, subject, postId }) {
  const target = otherAddress || recipientId || DEMO_ACCOUNTS.FREELANCER.address;
  return apiFetch('/threads', {
    method: 'POST',
    body: JSON.stringify({
      otherAddress: target,
      recipientId: target,
      subject: subject || 'Project Consultation',
      postId: postId || undefined
    })
  });
}

/**
 * Get messages for a thread
 * GET /threads/:id/messages
 */
export async function getMessages(threadId) {
  const data = await apiFetch(`/threads/${threadId}/messages`);
  if (Array.isArray(data)) {
    return data.map(normalizeMessage);
  }
  return [];
}

/**
 * Send message in a thread
 * POST /threads/:id/messages { text, content }
 */
export async function sendMessage(threadId, text) {
  const data = await apiFetch(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      content: text
    })
  });
  return normalizeMessage(data);
}
