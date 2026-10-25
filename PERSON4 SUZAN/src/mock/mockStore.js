import { canonicalHash } from '../lib/canonicalHash.js';

// Pre-configured demo accounts
export const DEMO_ACCOUNTS = {
  CLIENT: {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    name: 'Alice Client',
    role: 'CLIENT',
    bio: 'Web3 DAO founder looking for top engineering talent.',
    skills: ['Product Management', 'Tokenomics', 'Web3 Strategy'],
    githubUsername: 'alice-crypto',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
  },
  FREELANCER: {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    name: 'Bob Freelancer',
    role: 'FREELANCER',
    bio: 'Senior Full Stack Engineer specializing in TypeScript, React, and Solidity.',
    skills: ['TypeScript', 'Express', 'React', 'Solidity', 'ethers.js'],
    githubUsername: 'bob-builder',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
  },
  DEPLOYER: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    name: 'Deployer / Admin',
    role: 'ADMIN',
    bio: 'Contract deployer and platform admin.',
    skills: ['Solidity', 'Architecture'],
    githubUsername: 'deployer-admin',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  },
  ARBITRATOR_1: {
    address: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
    name: 'Charlie Arbitrator',
    role: 'ARBITRATOR',
    bio: 'Security researcher and smart contract audit specialist.',
    skills: ['Auditing', 'Arbitration', 'Solidity Security'],
    githubUsername: 'charlie-sec',
    privateKey: '0x47e179ec34004871170f8138c2c25237190f5182ff6dbd192c84140c0107727b'
  },
  ARBITRATOR_2: {
    address: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4df',
    name: 'Dana Justice',
    role: 'ARBITRATOR',
    bio: 'Decentralized dispute resolution specialist and DAO contributor.',
    skills: ['Legal Tech', 'DAO Governance'],
    githubUsername: 'dana-justice',
    privateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba'
  },
  ARBITRATOR_3: {
    address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    name: 'Evan Arbitrator',
    role: 'ARBITRATOR',
    bio: 'Smart contract security reviewer and certified mediator.',
    skills: ['Arbitration', 'Smart Contracts', 'Security'],
    githubUsername: 'evan-arb',
    privateKey: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e'
  }
};

const STORAGE_KEY = 'fairwork_mock_store_v5';

function getInitialState() {
  const aliceAddr = DEMO_ACCOUNTS.CLIENT.address;
  const bobAddr = DEMO_ACCOUNTS.FREELANCER.address;
  const deployerAddr = DEMO_ACCOUNTS.DEPLOYER.address;
  const arb1 = DEMO_ACCOUNTS.ARBITRATOR_1.address;
  const arb2 = DEMO_ACCOUNTS.ARBITRATOR_2.address;
  const arb3 = DEMO_ACCOUNTS.ARBITRATOR_3.address;

  const agreement1Terms = {
    schemaVersion: '1.0',
    title: 'FairWork Frontend & Escrow Integration',
    description: 'Implement responsive React Web3 frontend with direct MetaMask wallet signing and milestone verification.',
    client: aliceAddr,
    freelancer: bobAddr,
    currency: 'MATIC',
    totalAmount: '2.5',
    paymentMode: 'MILESTONE',
    latePenaltyBpsPerDay: 100,
    maxLatePenaltyBps: 3000,
    reviewWindowDays: 5,
    graceDays: 3,
    maxRevisions: 2,
    github: {
      repoUrl: 'https://github.com/fairwork-platform/fairwork-core',
      branch: 'main'
    },
    milestones: [
      {
        index: 0,
        title: 'Milestone 1: Web3 Wallet & Auth Architecture',
        description: 'Complete MetaMask connection, nonce verification, JWT sessions, and role detection.',
        amount: '0.8',
        deadline: new Date(Date.now() - 3 * 86400000).toISOString(),
        requiredProgressBps: 8000,
        acceptanceCriteria: [
          'MetaMask connection & network switch supported',
          'JWT signed auth flow tested',
          'Mock and live API toggle operational'
        ]
      },
      {
        index: 1,
        title: 'Milestone 2: Agreement Dashboard & Milestone Flow',
        description: 'Deliver contract creation wizard, milestone submission, and AI verification card.',
        amount: '1.0',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
        requiredProgressBps: 8500,
        acceptanceCriteria: [
          'Interactive milestone review & submission modal',
          'AI Github signal analysis breakdown display',
          'Countdown timers for review & grace period'
        ]
      },
      {
        index: 2,
        title: 'Milestone 3: Dispute Panel & Arbitrator Voting',
        description: 'Deliver dispute evidence uploads, AI advisory summaries, and 3-arbitrator vote sliders.',
        amount: '0.7',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        requiredProgressBps: 9000,
        acceptanceCriteria: [
          'Evidence submission and canonical hash generation',
          'Advisory AI split recommendation',
          'Arbitrator voting slider and finalization'
        ]
      }
    ],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  };

  const agreement2Terms = {
    schemaVersion: '1.0',
    title: 'Solidity Smart Contract Security Audit',
    description: 'Audit core FairWork escrow contracts, verify gas optimizations, and provide audit report.',
    client: aliceAddr,
    freelancer: bobAddr,
    currency: 'MATIC',
    totalAmount: '1.2',
    paymentMode: 'MILESTONE',
    latePenaltyBpsPerDay: 150,
    maxLatePenaltyBps: 3000,
    reviewWindowDays: 3,
    graceDays: 2,
    maxRevisions: 1,
    github: {
      repoUrl: 'https://github.com/fairwork-platform/contracts',
      branch: 'main'
    },
    milestones: [
      {
        index: 0,
        title: 'Complete Contract Slither & Mythril Analysis',
        description: 'Static analysis and manual code review of reentrancy & access control.',
        amount: '1.2',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        requiredProgressBps: 8000,
        acceptanceCriteria: [
          'Zero critical or high vulnerabilities remaining',
          'Comprehensive markdown report in repo',
          'Signed verification commit'
        ]
      }
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  };

  const agreement3Terms = {
    schemaVersion: '1.0',
    title: 'Smart Contract Architecture & Test Suite',
    description: 'Deliver core escrow smart contracts, reentrancy guards, events, and 100% automated test coverage.',
    client: aliceAddr,
    freelancer: bobAddr,
    currency: 'MATIC',
    totalAmount: '1.8',
    paymentMode: 'MILESTONE',
    latePenaltyBpsPerDay: 100,
    maxLatePenaltyBps: 2000,
    reviewWindowDays: 3,
    graceDays: 2,
    maxRevisions: 1,
    github: {
      repoUrl: 'https://github.com/fairwork-platform/contracts',
      branch: 'main'
    },
    milestones: [
      {
        index: 0,
        title: 'Core Escrow Vault & Multi-Sig Logic',
        description: 'Complete EVM contract design with reentrancy guards and state tracking.',
        amount: '0.9',
        deadline: new Date(Date.now() - 25 * 86400000).toISOString(),
        requiredProgressBps: 8000,
        acceptanceCriteria: [
          'Contracts compile without warnings in solc 0.8.20',
          'Unit test coverage exceeds 90%'
        ]
      },
      {
        index: 1,
        title: 'Deployment Scripts & Testnet Verification',
        description: 'Hardhat deployment scripts, Polygon Amoy verification, and gas reporting.',
        amount: '0.9',
        deadline: new Date(Date.now() - 15 * 86400000).toISOString(),
        requiredProgressBps: 8500,
        acceptanceCriteria: [
          'Contract deployed and verified on testnet explorer',
          'Integration tests pass with simulated mock callers'
        ]
      }
    ],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  };

  return {
    users: {
      [aliceAddr]: DEMO_ACCOUNTS.CLIENT,
      [aliceAddr.toLowerCase()]: DEMO_ACCOUNTS.CLIENT,
      [bobAddr]: DEMO_ACCOUNTS.FREELANCER,
      [bobAddr.toLowerCase()]: DEMO_ACCOUNTS.FREELANCER,
      [deployerAddr]: DEMO_ACCOUNTS.DEPLOYER,
      [deployerAddr.toLowerCase()]: DEMO_ACCOUNTS.DEPLOYER,
      [arb1]: DEMO_ACCOUNTS.ARBITRATOR_1,
      [arb1.toLowerCase()]: DEMO_ACCOUNTS.ARBITRATOR_1,
      [arb2]: DEMO_ACCOUNTS.ARBITRATOR_2,
      [arb2.toLowerCase()]: DEMO_ACCOUNTS.ARBITRATOR_2,
      [arb3]: DEMO_ACCOUNTS.ARBITRATOR_3,
      [arb3.toLowerCase()]: DEMO_ACCOUNTS.ARBITRATOR_3
    },
    posts: [
      {
        id: 'post-1',
        author: aliceAddr,
        authorName: 'Alice Vanguard',
        type: 'JOB',
        title: 'Fullstack React + Ethers Web3 Frontend Engineer',
        description: 'Looking for a skilled frontend developer to build the user interface for FairWork. Requires React, Vite, Tailwind, ethers v6, and seamless MetaMask integration. The candidate will implement draft reviews, milestone escrow submissions, and dispute resolution modules.',
        budget: '2.5 MATIC',
        skills: ['React', 'Ethers.js', 'Tailwind CSS', 'Web3', 'MetaMask'],
        proposalsCount: 2,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id: 'post-2',
        author: aliceAddr,
        authorName: 'Alice Vanguard',
        type: 'JOB',
        title: 'Smart Contract Auditor for Milestone-Based Escrow',
        description: 'Need an experienced Solidity auditor to review our FairWork.sol contract before deployment to Polygon Amoy testnet. Check reentrancy, fee math, arbitrator voting, and timeout logic.',
        budget: '1.2 MATIC',
        skills: ['Solidity', 'Hardhat', 'Auditing', 'OpenZeppelin'],
        proposalsCount: 1,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
      },
      {
        id: 'post-3',
        author: bobAddr,
        authorName: 'Bob Builder',
        type: 'SERVICE',
        title: 'Web3 & dApp Frontend Prototyping (Fast Delivery)',
        description: 'I deliver production-grade React & Tailwind frontends integrated with smart contracts in under 5 days. Full wallet state handling, rich responsive dark mode, and vitest unit tests included.',
        budget: '1.5 MATIC',
        skills: ['React', 'Vite', 'UI/UX', 'Tailwind', 'Ethers.js'],
        proposalsCount: 0,
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
      }
    ],
    proposals: {
      'post-1': [
        {
          id: 'prop-1',
          postId: 'post-1',
          author: bobAddr,
          authorName: 'Bob Builder',
          price: '2.5 MATIC',
          message: 'Hi Alice! I have built several Web3 escrow dApps with ethers v6 and Tailwind. I can deliver the complete FairWork dashboard including milestone wizards and dispute arbitration.',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
        },
        {
          id: 'prop-2',
          postId: 'post-1',
          author: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
          authorName: 'Vitalik Fan',
          price: '2.8 MATIC',
          message: 'Interested in this project. Extensive experience in Ethereum smart contracts and frontends.',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ],
      'post-2': [
        {
          id: 'prop-3',
          postId: 'post-2',
          author: arb1,
          authorName: 'Charlie Arbiter',
          price: '1.2 MATIC',
          message: 'I can thoroughly audit your FairWork.sol contract with Slither, Mythril, and manual invariant analysis.',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
        }
      ]
    },
    threads: [
      {
        id: 'thread-1',
        postId: 'post-1',
        postTitle: 'Fullstack React + Ethers Web3 Frontend Engineer',
        participants: [aliceAddr, bobAddr],
        lastMessage: 'I reviewed the draft terms and they look great. Let us move to on-chain creation!',
        updatedAt: new Date(Date.now() - 10 * 60000).toISOString()
      }
    ],
    messages: {
      'thread-1': [
        {
          id: 'msg-1',
          threadId: 'thread-1',
          sender: aliceAddr,
          text: 'Hello Bob! Thanks for applying. Can you walk me through your planned milestones for the FairWork frontend?',
          ts: new Date(Date.now() - 120 * 60000).toISOString()
        },
        {
          id: 'msg-2',
          threadId: 'thread-1',
          sender: bobAddr,
          text: 'Sure! I propose 3 milestones: 1) Wallet connection & auth (0.8 MATIC), 2) Agreement dashboard and milestone submission (1.0 MATIC), and 3) Dispute panel and arbitrator voting (0.7 MATIC). Total: 2.5 MATIC.',
          ts: new Date(Date.now() - 90 * 60000).toISOString()
        },
        {
          id: 'msg-3',
          threadId: 'thread-1',
          sender: aliceAddr,
          text: 'Sounds great. Review window of 5 days, 3 days grace period, and GitHub analysis on main branch. Let us generate an agreement!',
          ts: new Date(Date.now() - 60 * 60000).toISOString()
        },
        {
          id: 'msg-4',
          threadId: 'thread-1',
          sender: bobAddr,
          text: 'I reviewed the draft terms and they look great. Let us move to on-chain creation!',
          ts: new Date(Date.now() - 10 * 60000).toISOString()
        }
      ]
    },
    agreements: [
      {
        id: 'ag-1',
        onchainId: 1,
        txHash: '0x8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c2d5e8f1a4c7d0e3b6a9c2d5e8f1a',
        status: 'Active', // Draft, AwaitingFunding, Active, Completed, Cancelled, Disputed
        terms: agreement1Terms,
        termsHash: canonicalHash(agreement1Terms),
        clientApproved: true,
        freelancerApproved: true,
        createdAt: agreement1Terms.createdAt,
        openQuestions: [
          'Should commit SHAs be verified against GPG signed tags in git?',
          'Will the client provide custom Figma design tokens before Milestone 2?'
        ],
        warnings: [
          'Late penalty is set to 100 bps/day (1%/day), capped at 30% total.',
          'Client silence during the 5-day review window will trigger automatic approval.'
        ],
        milestones: [
          {
            idx: 0,
            status: 'Paid',
            amount: '0.8',
            paid: '0.792',
            penalty: '0',
            fee: '0.008',
            submission: {
              commitSha: '9f8b3c1a2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
              prUrl: 'https://github.com/fairwork-platform/fairwork-core/pull/1',
              notes: 'Milestone 1 completed with MetaMask wallet connection and JWT session management.'
            },
            aiReport: {
              progress_bps: 8800,
              confidence: 0.94,
              signals: {
                commits: 14,
                prs_merged: 1,
                files_changed: 22,
                lines_added: 1240,
                tests_status: 'PASSED',
                release_tag: 'v0.1.0',
                contributors: 1
              },
              criteria_results: [
                { criterion: 'MetaMask connection & network switch supported', met: true, evidence: 'WalletContext.jsx contains window.ethereum listeners and network switch RPC' },
                { criterion: 'JWT signed auth flow tested', met: true, evidence: 'E2E tests pass for nonce signature and bearer token generation' },
                { criterion: 'Mock and live API toggle operational', met: true, evidence: 'VITE_USE_MOCK fallback tested across all endpoints' }
              ],
              summary: 'Freelancer delivered robust Web3 architecture with comprehensive unit test coverage and clean error normalization.',
              risks: ['Hardhat local RPC tests pass; Polygon Amoy testnet latency should be verified.']
            }
          },
          {
            idx: 1,
            status: 'Submitted',
            amount: '1.0',
            paid: '0',
            penalty: '0',
            fee: '0',
            submission: {
              commitSha: '4c7e0f3b6a9c2d5e8f1a4c7d0e3b6a9c2d5e8f1a',
              prUrl: 'https://github.com/fairwork-platform/fairwork-core/pull/2',
              notes: 'Milestone 2 completed. Wizard, dashboard, and countdown timers are functional.'
            },
            aiReport: {
              progress_bps: 8900,
              confidence: 0.92,
              signals: {
                commits: 18,
                prs_merged: 2,
                files_changed: 31,
                lines_added: 1850,
                tests_status: 'PASSED',
                release_tag: null,
                contributors: 1
              },
              criteria_results: [
                { criterion: 'Interactive milestone review & submission modal', met: true, evidence: 'Components implement modal dialogs with form validation' },
                { criterion: 'AI Github signal analysis breakdown display', met: true, evidence: 'AI Progress card renders signals, criteria checklist, and confidence metrics' },
                { criterion: 'Countdown timers for review & grace period', met: true, evidence: 'CountdownTimer component dynamically calculates seconds remaining' }
              ],
              summary: 'Deliverables match acceptance criteria with high quality code and intuitive UI states.',
              risks: ['Review window active: 4 days remaining for client approval.']
            }
          },
          {
            idx: 2,
            status: 'Pending',
            amount: '0.7',
            paid: '0',
            penalty: '0',
            fee: '0',
            submission: null,
            aiReport: null
          }
        ],
        disputes: {}
      },
      {
        id: 'ag-2',
        onchainId: null,
        txHash: null,
        status: 'Draft',
        terms: agreement2Terms,
        termsHash: canonicalHash(agreement2Terms),
        clientApproved: true,
        freelancerApproved: false,
        createdAt: agreement2Terms.createdAt,
        openQuestions: [
          'Will the audit include formal fuzzing with Foundry/Echidna?'
        ],
        warnings: [
          'High penalty rate: 150 bps/day.'
        ],
        milestones: [
          {
            idx: 0,
            status: 'Pending',
            amount: '1.2',
            paid: '0',
            penalty: '0',
            fee: '0',
            submission: null,
            aiReport: null
          }
        ],
        disputes: {}
      },
      {
        id: 'ag-3',
        onchainId: 0,
        txHash: '0x3b6a9c2d5e8f1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f',
        status: 'Completed',
        terms: agreement3Terms,
        termsHash: canonicalHash(agreement3Terms),
        clientApproved: true,
        freelancerApproved: true,
        createdAt: agreement3Terms.createdAt,
        openQuestions: [],
        warnings: [],
        milestones: [
          {
            idx: 0,
            status: 'Paid',
            amount: '0.9',
            paid: '0.891',
            penalty: '0',
            fee: '0.009',
            submission: {
              commitSha: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
              prUrl: 'https://github.com/fairwork-platform/contracts/pull/1',
              notes: 'Core contracts delivered and 98% test coverage achieved.'
            },
            aiReport: {
              progress_bps: 9500,
              confidence: 0.98,
              signals: {
                commits: 24,
                prs_merged: 2,
                files_changed: 15,
                lines_added: 890,
                tests_status: 'PASSED',
                release_tag: 'v0.1.0-alpha',
                contributors: 1
              },
              criteria_results: [
                { criterion: 'Contracts compile without warnings in solc 0.8.20', met: true, evidence: 'Compiled with solc 0.8.20 with zero warnings' },
                { criterion: 'Unit test coverage exceeds 90%', met: true, evidence: 'LCOV coverage report: 98.2% statement coverage' }
              ],
              summary: 'Deliverables verified with outstanding test coverage and clean contract design.',
              risks: []
            }
          },
          {
            idx: 1,
            status: 'Paid',
            amount: '0.9',
            paid: '0.891',
            penalty: '0',
            fee: '0.009',
            submission: {
              commitSha: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
              prUrl: 'https://github.com/fairwork-platform/contracts/pull/2',
              notes: 'Polygon Amoy testnet deployment scripts and verification complete.'
            },
            aiReport: {
              progress_bps: 9600,
              confidence: 0.97,
              signals: {
                commits: 12,
                prs_merged: 1,
                files_changed: 8,
                lines_added: 450,
                tests_status: 'PASSED',
                release_tag: 'v0.2.0',
                contributors: 1
              },
              criteria_results: [
                { criterion: 'Contract deployed and verified on testnet explorer', met: true, evidence: 'Verified on Polygon Amoy Explorer' },
                { criterion: 'Integration tests pass with simulated mock callers', met: true, evidence: '28 integration scenarios executed successfully' }
              ],
              summary: 'Testnet deployment scripts and verified contract address documented.',
              risks: []
            }
          }
        ],
        disputes: {}
      }
    ],
    timeline: {
      'ag-1': [
        {
          id: 'tl-1',
          type: 'AGREEMENT_CREATED',
          title: 'Agreement Created On-Chain',
          actor: aliceAddr,
          actorRole: 'Client',
          txHash: '0x8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c2d5e8f1a4c7d0e3b6a9c2d5e8f1a',
          timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
          details: 'Created agreement with 3 milestones totaling 2.5 MATIC.'
        },
        {
          id: 'tl-2',
          type: 'AGREEMENT_ACCEPTED',
          title: 'Agreement Accepted by Freelancer',
          actor: bobAddr,
          actorRole: 'Freelancer',
          txHash: '0x7e0f3b6a9c2d5e8f1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d',
          timestamp: new Date(Date.now() - 8 * 86400000).toISOString(),
          details: 'Freelancer accepted agreement terms on-chain.'
        },
        {
          id: 'tl-3',
          type: 'AGREEMENT_FUNDED',
          title: 'Escrow Funded (2.5 MATIC)',
          actor: aliceAddr,
          actorRole: 'Client',
          txHash: '0x1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c2d5e8f',
          timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
          details: 'Client locked 2.5 MATIC into smart contract escrow.'
        },
        {
          id: 'tl-4',
          type: 'MILESTONE_SUBMITTED',
          title: 'Milestone 1 Submitted',
          actor: bobAddr,
          actorRole: 'Freelancer',
          txHash: '0x2d5e8f1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c',
          timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
          details: 'Freelancer submitted commit 9f8b3c1a2d with pull request.'
        },
        {
          id: 'tl-5',
          type: 'MILESTONE_APPROVED',
          title: 'Milestone 1 Approved & Paid',
          actor: aliceAddr,
          actorRole: 'Client',
          txHash: '0x3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c2d5e8f1a4c7d0e',
          timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
          details: 'Client approved milestone. 0.792 MATIC released to freelancer (0.008 MATIC fee).'
        },
        {
          id: 'tl-6',
          type: 'MILESTONE_SUBMITTED',
          title: 'Milestone 2 Submitted',
          actor: bobAddr,
          actorRole: 'Freelancer',
          txHash: '0x4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c2d5e8f1a',
          timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
        }
      ],
      'ag-3': [
        {
          id: 'tl-301',
          type: 'AGREEMENT_CREATED',
          title: 'Agreement Created On-Chain',
          actor: aliceAddr,
          actorRole: 'Client',
          txHash: '0x3b6a9c2d5e8f1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f',
          timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
          details: 'Created agreement with 2 milestones totaling 1.8 MATIC.'
        },
        {
          id: 'tl-302',
          type: 'MILESTONE_PAID',
          title: 'Milestone 1 Approved & Paid (0.9 MATIC)',
          actor: aliceAddr,
          actorRole: 'Client',
          txHash: '0x1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c2d5e8f',
          timestamp: new Date(Date.now() - 24 * 86400000).toISOString(),
          details: '0.9 MATIC released to freelancer upon verified deliverable.'
        },
        {
          id: 'tl-303',
          type: 'MILESTONE_PAID',
          title: 'Milestone 2 Approved & Paid (0.9 MATIC)',
          actor: aliceAddr,
          actorRole: 'Client',
          txHash: '0x2d5e8f1a4c7d0e3b6a9c2d5e8f1a8f2d6e4b1a7c9d0e2f5b8a1c4d7e0f3b6a9c',
          timestamp: new Date(Date.now() - 14 * 86400000).toISOString(),
          details: 'Final milestone completed. Agreement marked completed.'
        }
      ]
    },
    amendments: {
      'ag-1': [],
      'ag-3': []
    }
  };
}

class MockStore {
  constructor() {
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const initial = getInitialState();
        if (parsed && typeof parsed === 'object') {
          this.data = {
            ...initial,
            ...parsed,
            posts: Array.isArray(parsed.posts) && parsed.posts.length > 0 ? parsed.posts : initial.posts,
            agreements: Array.isArray(parsed.agreements) ? parsed.agreements : initial.agreements,
            users: { ...initial.users, ...(parsed.users || {}) },
            threads: Array.isArray(parsed.threads) ? parsed.threads : initial.threads,
            messages: parsed.messages || initial.messages,
            proposals: parsed.proposals || initial.proposals,
            disputes: parsed.disputes || initial.disputes,
            timeline: parsed.timeline || initial.timeline,
          };
          return;
        }
      }
    } catch {
      // ignore
    }
    this.data = getInitialState();
    this.save();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  reset() {
    this.data = getInitialState();
    this.save();
  }
}

export const mockStore = new MockStore();
