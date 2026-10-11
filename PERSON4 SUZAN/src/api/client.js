import { mockStore, DEMO_ACCOUNTS } from '../mock/mockStore.js';
import { canonicalHash } from '../lib/canonicalHash.js';
import abiJson from '../chain/abi.json';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Normalized API error
 */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Universal fetch wrapper
 */
export async function apiFetch(endpoint, options = {}) {
  if (USE_MOCK) {
    return handleMockRequest(endpoint, options);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const token = localStorage.getItem('fairwork_jwt');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code = data?.error?.code || `HTTP_${response.status}`;
      const message = data?.error?.message || response.statusText || 'Request failed';
      throw new ApiError(response.status, code, message);
    }

    if (data && typeof data === 'object' && 'data' in data && data.success === true) {
      return data.data;
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network or parse error
    throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Network request failed. Is backend running?');
  }
}

/**
 * High-fidelity Mock Request Handler
 */
async function handleMockRequest(endpoint, options = {}) {
  // Simulate realistic network latency
  await new Promise(r => setTimeout(r, 150));

  const path = endpoint.split('?')[0];
  const query = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;
  const currentAddress = (localStorage.getItem('fairwork_user_address') || DEMO_ACCOUNTS.CLIENT.address).toLowerCase();

  // 1. Auth
  if (path === '/auth/nonce' && method === 'POST') {
    return { nonce: `fairwork-nonce-${Date.now()}` };
  }
  if (path === '/auth/verify' && method === 'POST') {
    const addr = body.address.toLowerCase();
    const token = `mock-jwt-token-${addr}-${Date.now()}`;
    const matchedDemo = Object.values(DEMO_ACCOUNTS).find(d => d.address.toLowerCase() === addr);
    const user = matchedDemo || mockStore.data.users[addr] || {
      address: addr,
      name: `User ${addr.substring(0, 6)}`,
      role: 'FREELANCER',
      bio: '',
      skills: [],
      githubUsername: ''
    };
    mockStore.data.users[addr] = user;
    mockStore.save();
    return { token, user };
  }

  // 2. Users
  if (path === '/users/me' && method === 'GET') {
    const matchedDemo = Object.values(DEMO_ACCOUNTS).find(d => d.address.toLowerCase() === currentAddress);
    const user = matchedDemo || mockStore.data.users[currentAddress] || DEMO_ACCOUNTS.CLIENT;
    return user;
  }
  if (path === '/users/me' && method === 'PUT') {
    const updated = {
      ...(mockStore.data.users[currentAddress] || { address: currentAddress }),
      ...body
    };
    mockStore.data.users[currentAddress] = updated;
    mockStore.save();
    return updated;
  }
  if (path.startsWith('/users/') && method === 'GET') {
    const addr = path.replace('/users/', '').toLowerCase();
    const matchedDemo = Object.values(DEMO_ACCOUNTS).find(d => d.address.toLowerCase() === addr);
    const user = matchedDemo || mockStore.data.users[addr] || {
      address: addr,
      name: `User ${addr.substring(0, 6)}`,
      role: 'FREELANCER',
      bio: '',
      skills: [],
      githubUsername: ''
    };
    return user;
  }

  // 3. Posts & Proposals
  if (path === '/posts' && method === 'GET') {
    let posts = [...mockStore.data.posts];
    const type = query.get('type');
    const q = (query.get('q') || '').toLowerCase();

    if (type) posts = posts.filter(p => p.type === type);
    if (q) {
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    return posts;
  }
  if (path === '/posts' && method === 'POST') {
    const authorUser = mockStore.data.users[currentAddress] || { name: 'Anonymous' };
    const newPost = {
      id: `post-${Date.now()}`,
      author: currentAddress,
      authorName: authorUser.name || 'Anonymous',
      type: body.type || 'JOB',
      title: body.title,
      description: body.description,
      budget: body.budget,
      skills: body.skills || [],
      proposalsCount: 0,
      createdAt: new Date().toISOString()
    };
    mockStore.data.posts.unshift(newPost);
    mockStore.save();
    return newPost;
  }
  if (path.match(/^\/posts\/[^/]+$/) && method === 'GET') {
    const id = path.replace('/posts/', '');
    const post = mockStore.data.posts.find(p => p.id === id);
    if (!post) throw new ApiError(404, 'NOT_FOUND', 'Post not found');
    return post;
  }
  if (path.match(/^\/posts\/[^/]+\/proposals$/) && method === 'GET') {
    const id = path.split('/')[2];
    return mockStore.data.proposals[id] || [];
  }
  if (path.match(/^\/posts\/[^/]+\/proposals$/) && method === 'POST') {
    const id = path.split('/')[2];
    const authorUser = mockStore.data.users[currentAddress] || { name: 'Freelancer' };
    const newProp = {
      id: `prop-${Date.now()}`,
      postId: id,
      author: currentAddress,
      authorName: authorUser.name,
      price: body.price,
      message: body.message,
      createdAt: new Date().toISOString()
    };
    if (!mockStore.data.proposals[id]) mockStore.data.proposals[id] = [];
    mockStore.data.proposals[id].push(newProp);
    
    // update post proposal count
    const post = mockStore.data.posts.find(p => p.id === id);
    if (post) post.proposalsCount = (post.proposalsCount || 0) + 1;
    mockStore.save();
    return newProp;
  }

  // 4. Threads & Messages
  if (path === '/threads' && method === 'GET') {
    const userThreads = mockStore.data.threads.filter(t => {
      const parts = Array.isArray(t.participants) ? t.participants.map(p => (typeof p === 'string' ? p : p?.walletAddress || '').toLowerCase()) : [];
      return parts.includes(currentAddress);
    });
    return userThreads.length ? userThreads : mockStore.data.threads;
  }
  if (path === '/threads' && method === 'POST') {
    const rawOther = body?.otherAddress || body?.recipientId || DEMO_ACCOUNTS.FREELANCER.address;
    const otherAddr = String(rawOther).toLowerCase();
    const existing = mockStore.data.threads.find(t => {
      const parts = Array.isArray(t.participants) ? t.participants.map(p => (typeof p === 'string' ? p : p?.walletAddress || '').toLowerCase()) : [];
      return parts.includes(currentAddress) && parts.includes(otherAddr);
    });
    if (existing) return existing;

    const newThread = {
      id: `thread-${Date.now()}`,
      postId: body?.postId || null,
      postTitle: body?.postId ? mockStore.data.posts.find(p => p.id === body.postId)?.title : (body?.subject || 'Direct Consultation'),
      participants: [currentAddress, otherAddr],
      lastMessage: 'Thread opened',
      updatedAt: new Date().toISOString()
    };
    mockStore.data.threads.unshift(newThread);
    mockStore.data.messages[newThread.id] = [];
    mockStore.save();
    return newThread;
  }
  if (path.match(/^\/threads\/[^/]+\/messages$/) && method === 'GET') {
    const threadId = path.split('/')[2];
    const msgs = mockStore.data.messages[threadId] || [];
    return msgs.map(m => ({
      id: m.id,
      threadId: m.threadId,
      sender: m.sender || m.senderAddress,
      senderAddress: m.senderAddress || m.sender,
      text: m.text || m.content,
      content: m.content || m.text,
      createdAt: m.createdAt || m.ts || new Date().toISOString(),
      ts: m.ts || m.createdAt || new Date().toISOString()
    }));
  }
  if (path.match(/^\/threads\/[^/]+\/messages$/) && method === 'POST') {
    const threadId = path.split('/')[2];
    const textContent = body?.content || body?.text || '';
    const nowIso = new Date().toISOString();
    const newMsg = {
      id: `msg-${Date.now()}`,
      threadId,
      sender: currentAddress,
      senderAddress: currentAddress,
      text: textContent,
      content: textContent,
      createdAt: nowIso,
      ts: nowIso
    };
    if (!mockStore.data.messages[threadId]) mockStore.data.messages[threadId] = [];
    mockStore.data.messages[threadId].push(newMsg);

    const thread = mockStore.data.threads.find(t => t.id === threadId);
    if (thread) {
      thread.lastMessage = textContent;
      thread.updatedAt = nowIso;
    }
    mockStore.save();
    return newMsg;
  }

  // 5. Agreements
  if (path === '/agreements/draft' && method === 'POST') {
    const threadId = body.threadId;
    const thread = mockStore.data.threads.find(t => t.id === threadId);
    const post = thread?.postId ? mockStore.data.posts.find(p => p.id === thread.postId) : null;
    const client = thread?.participants[0] || currentAddress;
    const freelancer = thread?.participants[1] || DEMO_ACCOUNTS.FREELANCER.address;

    const draftId = `ag-${Date.now()}`;
    const terms = {
      schemaVersion: '1.0',
      title: post ? post.title : 'Web3 Smart Contract & Frontend Development',
      description: post ? post.description : 'Agreement generated from AI chat consultation.',
      client,
      freelancer,
      currency: 'MATIC',
      totalAmount: '2.0',
      paymentMode: 'MILESTONE',
      latePenaltyBpsPerDay: 100,
      maxLatePenaltyBps: 3000,
      reviewWindowDays: 5,
      graceDays: 3,
      maxRevisions: 2,
      github: {
        repoUrl: 'https://github.com/fairwork-platform/project-escrow',
        branch: 'main'
      },
      milestones: [
        {
          index: 0,
          title: 'Milestone 1: Core Architecture & Setup',
          description: 'Initial repo setup, contract interfaces, and testing environment.',
          amount: '0.8',
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          requiredProgressBps: 8000,
          acceptanceCriteria: ['Repository initialized', 'Passing unit test suite']
        },
        {
          index: 1,
          title: 'Milestone 2: Final Delivery & Integration',
          description: 'Frontend integration with Web3 contracts and deployment.',
          amount: '1.2',
          deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
          requiredProgressBps: 9000,
          acceptanceCriteria: ['All features verified', 'Production build ready']
        }
      ],
      createdAt: new Date().toISOString()
    };

    const newAgreement = {
      id: draftId,
      onchainId: null,
      txHash: null,
      status: 'Draft',
      terms,
      termsHash: canonicalHash(terms),
      clientApproved: false,
      freelancerApproved: false,
      createdAt: terms.createdAt,
      openQuestions: [
        'Does the client require IP assignment documentation before Milestone 2?',
        'Should GitHub commit SHAs be verified against branch protection rules?'
      ],
      warnings: [
        'Late penalty is set to 100 bps/day (1%/day).',
        'Review window is 5 days; silence allows auto-claim.'
      ],
      milestones: terms.milestones.map((m, idx) => ({
        idx,
        status: 'Pending',
        amount: m.amount,
        paid: '0',
        penalty: '0',
        fee: '0',
        submission: null,
        aiReport: null
      })),
      disputes: {}
    };

    mockStore.data.agreements.unshift(newAgreement);
    mockStore.data.timeline[draftId] = [
      {
        id: `tl-${Date.now()}`,
        type: 'DRAFT_CREATED',
        title: 'Agreement Draft Generated by AI',
        actor: currentAddress,
        actorRole: 'System',
        txHash: null,
        timestamp: new Date().toISOString(),
        details: 'AI parsed conversation context into structured AgreementTerms.'
      }
    ];
    mockStore.save();

    return {
      agreementId: draftId,
      terms,
      openQuestions: newAgreement.openQuestions,
      warnings: newAgreement.warnings
    };
  }

  if (path === '/agreements' && method === 'GET') {
    return mockStore.data.agreements;
  }

  if (path.match(/^\/agreements\/[^/]+$/) && method === 'GET') {
    const id = path.replace('/agreements/', '');
    const ag = mockStore.data.agreements.find(a => a.id === id || String(a.onchainId) === id);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');
    return ag;
  }

  if (path.match(/^\/agreements\/[^/]+\/terms$/) && method === 'PUT') {
    const id = path.split('/')[2];
    const ag = mockStore.data.agreements.find(a => a.id === id);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    // Rule: Edits reset approvals!
    ag.terms = body.terms;
    ag.termsHash = canonicalHash(body.terms);
    ag.clientApproved = false;
    ag.freelancerApproved = false;
    ag.status = 'Draft';

    if (!mockStore.data.timeline[id]) mockStore.data.timeline[id] = [];
    mockStore.data.timeline[id].push({
      id: `tl-${Date.now()}`,
      type: 'TERMS_UPDATED',
      title: 'Agreement Terms Updated',
      actor: currentAddress,
      actorRole: currentAddress === ag.terms.client.toLowerCase() ? 'Client' : 'Freelancer',
      txHash: null,
      timestamp: new Date().toISOString(),
      details: 'Terms modified off-chain. Both parties approvals have been reset.'
    });

    mockStore.save();
    return ag;
  }

  if (path.match(/^\/agreements\/[^/]+\/approve-draft$/) && method === 'POST') {
    const id = path.split('/')[2];
    const ag = mockStore.data.agreements.find(a => a.id === id);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    const isClient = currentAddress === ag.terms.client.toLowerCase();
    const isFreelancer = currentAddress === ag.terms.freelancer.toLowerCase();

    if (isClient) ag.clientApproved = true;
    if (isFreelancer) ag.freelancerApproved = true;

    if (ag.clientApproved && ag.freelancerApproved) {
      ag.status = 'AwaitingFunding';
    }

    if (!mockStore.data.timeline[id]) mockStore.data.timeline[id] = [];
    mockStore.data.timeline[id].push({
      id: `tl-${Date.now()}`,
      type: 'DRAFT_APPROVED',
      title: `Draft Approved by ${isClient ? 'Client' : 'Freelancer'}`,
      actor: currentAddress,
      actorRole: isClient ? 'Client' : 'Freelancer',
      txHash: null,
      timestamp: new Date().toISOString(),
      details: ag.clientApproved && ag.freelancerApproved
        ? 'Both parties have approved draft. Ready for on-chain creation and funding!'
        : 'Party approved terms. Awaiting counterparty approval.'
    });

    mockStore.save();
    return ag;
  }

  if (path.match(/^\/agreements\/[^/]+\/link-chain$/) && method === 'POST') {
    const id = path.split('/')[2];
    const ag = mockStore.data.agreements.find(a => a.id === id);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    ag.onchainId = Number(body.onchainId);
    ag.txHash = body.txHash;
    ag.status = 'Active';

    if (!mockStore.data.timeline[id]) mockStore.data.timeline[id] = [];
    mockStore.data.timeline[id].push({
      id: `tl-${Date.now()}`,
      type: 'CHAIN_LINKED',
      title: 'Agreement Linked On-Chain',
      actor: currentAddress,
      actorRole: 'Client',
      txHash: body.txHash,
      timestamp: new Date().toISOString(),
      details: `Linked on-chain agreement #${body.onchainId} with transaction.`
    });

    mockStore.save();
    return ag;
  }

  if (path.match(/^\/agreements\/[^/]+\/timeline$/) && method === 'GET') {
    const id = path.split('/')[2];
    return mockStore.data.timeline[id] || [];
  }

  if (path.match(/^\/agreements\/[^/]+\/payments$/) && method === 'GET') {
    const id = path.split('/')[2];
    const ag = mockStore.data.agreements.find(a => a.id === id);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    let locked = 0;
    let released = 0;
    let disputed = 0;
    let refunded = 0;
    let feesPaid = 0;

    for (const m of ag.milestones) {
      const amt = parseFloat(m.amount) || 0;
      if (m.status === 'Paid') {
        released += parseFloat(m.paid) || amt;
        feesPaid += parseFloat(m.fee) || 0;
      } else if (m.status === 'Disputed') {
        disputed += amt;
      } else if (m.status === 'Refunded') {
        refunded += amt;
      } else {
        locked += amt;
      }
    }

    return {
      locked: locked.toFixed(4),
      released: released.toFixed(4),
      disputed: disputed.toFixed(4),
      refunded: refunded.toFixed(4),
      feesPaid: feesPaid.toFixed(4),
      milestones: ag.milestones
    };
  }

  if (path.match(/^\/agreements\/[^/]+\/alerts$/) && method === 'GET') {
    const id = path.split('/')[2];
    const ag = mockStore.data.agreements.find(a => a.id === id);
    if (!ag) return [];

    const alerts = [];
    if (ag.status === 'Draft' && (!ag.clientApproved || !ag.freelancerApproved)) {
      alerts.push({
        type: 'INFO',
        message: 'Draft agreement is awaiting approvals from both parties.'
      });
    }
    if (ag.status === 'AwaitingFunding') {
      alerts.push({
        type: 'ACTION_REQUIRED',
        message: 'Draft terms approved! Client must create on-chain and lock escrow funds.'
      });
    }
    const submittedM = ag.milestones.find(m => m.status === 'Submitted');
    if (submittedM) {
      alerts.push({
        type: 'REVIEW_WINDOW',
        message: `Milestone #${submittedM.idx + 1} submitted: Client review window is open. Silence will auto-approve.`
      });
    }
    return alerts;
  }

  // 6. Milestones
  if (path.match(/^\/agreements\/[^/]+\/milestones\/\d+\/submit$/) && method === 'POST') {
    const parts = path.split('/');
    const agId = parts[2];
    const idx = parseInt(parts[4], 10);
    const ag = mockStore.data.agreements.find(a => a.id === agId);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    const m = ag.milestones[idx];
    if (!m) throw new ApiError(404, 'NOT_FOUND', 'Milestone not found');

    m.status = 'Submitted';
    m.submission = {
      commitSha: body.commitSha,
      prUrl: body.prUrl || '',
      notes: body.notes || ''
    };

    // Realistic AI report generated by AI service
    m.aiReport = {
      progress_bps: 8950,
      confidence: 0.93,
      signals: {
        commits: 12,
        prs_merged: 1,
        files_changed: 19,
        lines_added: 940,
        tests_status: 'PASSED',
        release_tag: null,
        contributors: 1
      },
      criteria_results: (ag.terms.milestones[idx]?.acceptanceCriteria || ['Acceptance criteria met']).map(c => ({
        criterion: c,
        met: true,
        evidence: `Automated AST check and commit diff verify ${c}`
      })),
      summary: `Automated analysis detected 12 commits and passing test runs matching the requirements for Milestone #${idx + 1}.`,
      risks: ['Code meets criteria. Client final manual verification recommended.']
    };

    if (!mockStore.data.timeline[agId]) mockStore.data.timeline[agId] = [];
    mockStore.data.timeline[agId].push({
      id: `tl-${Date.now()}`,
      type: 'MILESTONE_SUBMITTED',
      title: `Milestone ${idx + 1} Submitted`,
      actor: currentAddress,
      actorRole: 'Freelancer',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: new Date().toISOString(),
      details: `Submitted commit ${body.commitSha.substring(0, 8)}. AI verified progress at 89.5%.`
    });

    mockStore.save();
    return {
      milestone: m,
      aiReport: m.aiReport,
      submissionHash: canonicalHash(m.submission)
    };
  }

  if (path.match(/^\/agreements\/[^/]+\/milestones\/\d+\/progress$/) && method === 'GET') {
    const parts = path.split('/');
    const agId = parts[2];
    const idx = parseInt(parts[4], 10);
    const ag = mockStore.data.agreements.find(a => a.id === agId);
    return ag?.milestones[idx]?.aiReport || null;
  }

  // 7. Disputes
  if (path.match(/^\/agreements\/[^/]+\/milestones\/\d+\/evidence$/) && method === 'POST') {
    const parts = path.split('/');
    const agId = parts[2];
    const idx = parseInt(parts[4], 10);
    const ag = mockStore.data.agreements.find(a => a.id === agId);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    if (!ag.disputes) ag.disputes = {};
    if (!ag.disputes[idx]) {
      ag.disputes[idx] = {
        idx,
        status: 'Active',
        evidence: [],
        arbitrators: [
          DEMO_ACCOUNTS.ARBITRATOR_1.address,
          DEMO_ACCOUNTS.ARBITRATOR_2.address,
          DEMO_ACCOUNTS.ARBITRATOR_3.address
        ],
        votes: {},
        resolved: false,
        aiSummary: null
      };
      if (ag.milestones && ag.milestones[idx]) {
        ag.milestones[idx].status = 'Disputed';
      }
      ag.status = 'Disputed';
    }

    const evidenceItem = {
      id: `ev-${Date.now()}`,
      author: currentAddress,
      text: body.text,
      files: body.files || [],
      evidenceHash: canonicalHash({ text: body.text, ts: Date.now() }),
      createdAt: new Date().toISOString()
    };
    ag.disputes[idx].evidence.push(evidenceItem);

    if (!mockStore.data.timeline[agId]) mockStore.data.timeline[agId] = [];
    mockStore.data.timeline[agId].push({
      id: `tl-${Date.now()}`,
      type: 'EVIDENCE_SUBMITTED',
      title: `Dispute Evidence Submitted on Milestone ${idx + 1}`,
      actor: currentAddress,
      actorRole: currentAddress === ag.terms.client.toLowerCase() ? 'Client' : 'Freelancer',
      txHash: null,
      timestamp: new Date().toISOString(),
      details: body.text.substring(0, 100) + '...'
    });

    mockStore.save();
    return ag.disputes[idx];
  }

  if (path.match(/^\/agreements\/[^/]+\/milestones\/\d+\/dispute$/) && method === 'GET') {
    const parts = path.split('/');
    const agId = parts[2];
    const idx = parseInt(parts[4], 10);
    const ag = mockStore.data.agreements.find(a => a.id === agId);
    return ag?.disputes[idx] || null;
  }

  if (path.match(/^\/agreements\/[^/]+\/milestones\/\d+\/ai-summary$/) && method === 'POST') {
    const parts = path.split('/');
    const agId = parts[2];
    const idx = parseInt(parts[4], 10);
    const ag = mockStore.data.agreements.find(a => a.id === agId);
    if (!ag) throw new ApiError(404, 'NOT_FOUND', 'Agreement not found');

    const summaryData = {
      summary: 'Freelancer delivered 85% of core frontend functionality. Minor mobile responsive layout issues were contested by the client.',
      recommended_freelancer_share_bps: 7500, // 75%
      reasoning: 'The smart contract and core UI logic were delivered accurately on GitHub. Visual polish gaps warrant a 25% compensation adjustment in favor of the client.',
      advisoryNote: 'Advisory only. The 3 selected arbitrators cast binding votes.'
    };

    if (ag.disputes[idx]) {
      ag.disputes[idx].aiSummary = summaryData;
    }
    mockStore.save();
    return summaryData;
  }

  // 8. Config & Health
  if (path === '/config' && method === 'GET') {
    return {
      chainId: Number(import.meta.env.VITE_CHAIN_ID || 11155111),
      contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e',
      abi: abiJson
    };
  }

  if (path === '/health' && method === 'GET') {
    return { status: 'healthy', uptime: 12345, version: '1.0.0' };
  }

  throw new ApiError(404, 'ENDPOINT_NOT_FOUND', `Mock handler not found for ${method} ${path}`);
}
