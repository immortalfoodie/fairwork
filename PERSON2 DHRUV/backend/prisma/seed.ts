import { PrismaClient } from '@prisma/client';
import { computeCanonicalHash } from '../src/utils/canonicalHash';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FairWork database seeding...');

  // Clean existing records in correct relation order
  await prisma.chainEvent.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.progressReport.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users
  console.log('Seeding users...');
  const userClient = await prisma.user.create({
    data: {
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      nonce: 'seed_nonce_client_alice',
      role: 'CLIENT',
      name: 'Alice Client',
      bio: 'Web3 DAO founder looking for top engineering talent.',
      skills: 'Product Management, Tokenomics, Web3 Strategy',
      githubUsername: 'alice-crypto',
    },
  });

  const userFreelancer = await prisma.user.create({
    data: {
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      nonce: 'seed_nonce_freelancer_bob',
      role: 'FREELANCER',
      name: 'Bob Freelancer',
      bio: 'Senior Full Stack Engineer specializing in TypeScript, React, and Solidity.',
      skills: 'TypeScript, Express, React, Solidity, ethers.js',
      githubUsername: 'bob-builder',
    },
  });

  const userDeployer = await prisma.user.create({
    data: {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      nonce: 'seed_nonce_deployer_admin',
      role: 'ADMIN',
      name: 'Deployer / Admin',
      bio: 'Contract deployer and platform admin.',
      skills: 'Solidity, Architecture',
      githubUsername: 'deployer-admin',
    },
  });

  // 2. Seed Two Posts
  console.log('Seeding 2 posts...');
  const post1 = await prisma.post.create({
    data: {
      authorId: userClient.id,
      type: 'JOB',
      title: 'Decentralized Escrow Backend & AI Integration',
      description:
        'Seeking an experienced backend engineer to implement a mock-first Express.js and Prisma system with ethers verification, automated milestone reports, and AI arbitration.',
      budget: 2500,
      tags: JSON.stringify(['Web3', 'Express', 'Prisma', 'Escrow', 'AI']),
      status: 'OPEN',
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: userDeployer.id,
      type: 'SERVICE',
      title: 'Comprehensive Smart Contract Security Audit',
      description:
        'Offering thorough manual and automated code analysis for EVM contracts, invariant testing with Foundry, and a formal vulnerability report.',
      budget: 1200,
      tags: JSON.stringify(['Audit', 'Security', 'Foundry', 'Solidity']),
      status: 'OPEN',
    },
  });

  // 3. Seed One Thread with Messages
  console.log('Seeding 1 thread and negotiation messages...');
  const thread = await prisma.thread.create({
    data: {
      postId: post1.id,
      clientId: userClient.id,
      freelancerId: userFreelancer.id,
      subject: 'Discussion on Escrow Backend Architecture',
    },
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: thread.id,
        senderId: userClient.id,
        content:
          'Hi Bob! We reviewed your profile and want to discuss deliverables for the Escrow backend module.',
      },
      {
        threadId: thread.id,
        senderId: userFreelancer.id,
        content:
          'Hi Alice! Sounds great. I can deliver the architecture in two distinct milestones: Core API + DB, followed by Oracle verification and indexer.',
      },
      {
        threadId: thread.id,
        senderId: userClient.id,
        content:
          'Perfect! Let us generate the draft agreement and finalize terms.',
      },
    ],
  });

  // 4. Seed One Agreement with Milestones & Canonical Hash
  console.log('Seeding 1 agreement with structured terms and milestones...');
  const agreementTerms = {
    title: 'FairWork Escrow Backend Implementation Agreement',
    summary:
      'Full delivery of mock-first Express.js backend with Prisma SQLite, wallet signatures, milestone AI analysis, and event indexer.',
    totalBudget: 2500,
    currency: 'USDC',
    revisionPolicy: 'Up to 2 revision rounds per milestone within 3 days of submission.',
    cancellationPolicy: 'Mutual consensus or Escrow arbitration upon formal dispute filing.',
    milestones: [
      {
        milestoneIndex: 0,
        title: 'Milestone 1: Express Server, Auth & Database Schema',
        description: 'Complete setup of Prisma SQLite models, Zod validation, JWT and ethers auth.',
        amount: 1000,
        deadlineDays: 7,
        deliverables: ['Prisma Schema', 'Auth Middleware', 'Community Endpoints'],
      },
      {
        milestoneIndex: 1,
        title: 'Milestone 2: Milestone Verification, Disputes & Indexer',
        description: 'AI code review adapter, Oracle progress recorder, event indexer and timeline.',
        amount: 1500,
        deadlineDays: 14,
        deliverables: ['AI Adapter', 'Chain Adapter', 'Alerts Engine', 'Requests Test Suite'],
      },
    ],
  };

  const canonicalHash = computeCanonicalHash(agreementTerms);
  const now = new Date();
  const m1Deadline = new Date(now.getTime() + 7 * 86400000);
  const m2Deadline = new Date(now.getTime() + 14 * 86400000);

  const agreement = await prisma.agreement.create({
    data: {
      threadId: thread.id,
      clientId: userClient.id,
      freelancerId: userFreelancer.id,
      title: agreementTerms.title,
      termsJson: JSON.stringify(agreementTerms),
      canonicalHash,
      status: 'LOCKED',
      clientApprovedAt: now,
      freelancerApprovedAt: now,
      lockedAt: now,
      onChainAgreementId: '1',
      onChainTxHash: '0xmock_agreement_created_tx_hash_seed',
      milestones: {
        create: [
          {
            milestoneIndex: 0,
            title: agreementTerms.milestones[0].title,
            description: agreementTerms.milestones[0].description,
            amount: agreementTerms.milestones[0].amount,
            deadline: m1Deadline,
            status: 'PENDING',
          },
          {
            milestoneIndex: 1,
            title: agreementTerms.milestones[1].title,
            description: agreementTerms.milestones[1].description,
            amount: agreementTerms.milestones[1].amount,
            deadline: m2Deadline,
            status: 'PENDING',
          },
        ],
      },
    },
  });

  // Seed initial chain event
  await prisma.chainEvent.create({
    data: {
      agreementId: agreement.id,
      eventName: 'AgreementCreated',
      transactionHash: '0xmock_agreement_created_tx_hash_seed',
      blockNumber: 100,
      logIndex: 0,
      argsJson: JSON.stringify({
        agreementId: '1',
        client: userClient.walletAddress,
        freelancer: userFreelancer.walletAddress,
        termsHash: canonicalHash,
      }),
      timestamp: now,
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log(`- Users seeded: 3 (${userClient.walletAddress}, ${userFreelancer.walletAddress}, ${userDeployer.walletAddress})`);
  console.log(`- Posts seeded: 2 (Post ID: ${post1.id}, Post ID: ${post2.id})`);
  console.log(`- Thread seeded: 1 (Thread ID: ${thread.id})`);
  console.log(`- Agreement seeded: 1 (Agreement ID: ${agreement.id}, Status: LOCKED, Canonical Hash: ${canonicalHash})`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
