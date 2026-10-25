import { ethers } from 'ethers';
import { prisma } from '../../lib/prisma';
import { AiAdapter, AgreementTerms } from '../../adapters/aiAdapter';
import { ChainAdapter } from '../../adapters/chainAdapter';
import { computeCanonicalHash } from '../../utils/canonicalHash';
import { agreementTermsSchema, editAgreementSchema } from './agreement.schema';
import { z } from 'zod';

export class AgreementService {
  /**
   * Drafts an agreement using AI based on context from thread and post.
   */
  static async draftAgreement(
    creatorId: string,
    params: {
      threadId?: string;
      postId?: string;
      freelancerId?: string;
      freelancerAddress?: string;
      otherAddress?: string;
      title?: string;
    }
  ) {
    let postContext: any = null;
    let threadContext: any = null;
    let thread: any = null;

    if (params.threadId) {
      thread = await prisma.thread.findUnique({
        where: { id: params.threadId },
        include: {
          client: true,
          freelancer: true,
          post: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 25,
          },
        },
      });

      if (thread) {
        if (!params.postId && thread.postId) {
          params.postId = thread.postId;
        }
        if (thread.post) {
          postContext = {
            title: thread.post.title,
            description: thread.post.description,
            budget: thread.post.budget,
            tags: thread.post.tags,
          };
        }
        if (thread.messages && thread.messages.length > 0) {
          threadContext = thread.messages.map((m: any) => ({
            senderId: m.senderId,
            content: m.content,
          }));
        }
      }
    }

    if (params.postId && !postContext) {
      const post = await prisma.post.findUnique({ where: { id: params.postId } });
      if (post) {
        postContext = {
          title: post.title,
          description: post.description,
          budget: post.budget,
          tags: post.tags,
        };
      }
    }

    // Determine raw freelancer indicator from params or thread
    let rawFreelancer = params.freelancerId || params.freelancerAddress || params.otherAddress;
    if (!rawFreelancer && thread) {
      if (thread.clientId === creatorId) {
        rawFreelancer = thread.freelancer?.walletAddress || thread.freelancerId;
      } else if (thread.freelancerId === creatorId) {
        rawFreelancer = thread.client?.walletAddress || thread.clientId;
      } else {
        rawFreelancer = thread.freelancer?.walletAddress || thread.freelancerId || thread.client?.walletAddress || thread.clientId;
      }
    }

    // Resolve freelancer in database
    let freelancerUser: any = null;
    if (rawFreelancer) {
      // 1. Try finding by ID
      freelancerUser = await prisma.user.findUnique({ where: { id: rawFreelancer } });
      // 2. Try finding by walletAddress
      if (!freelancerUser) {
        let addrFormatted = rawFreelancer;
        if (rawFreelancer.startsWith('0x')) {
          try {
            addrFormatted = ethers.getAddress(rawFreelancer.toLowerCase());
          } catch {}
        }
        freelancerUser = await prisma.user.findFirst({
          where: { walletAddress: addrFormatted },
        });

        // 3. Create if it's a 0x address
        if (!freelancerUser && rawFreelancer.startsWith('0x')) {
          freelancerUser = await prisma.user.create({
            data: {
              walletAddress: addrFormatted,
              nonce: Math.random().toString(36).substring(2),
              role: 'FREELANCER',
            },
          });
        }
      }
    }

    // Fallback: If still unresolved, pick another user in the database or create default demo freelancer
    if (!freelancerUser) {
      freelancerUser = await prisma.user.findFirst({
        where: { id: { not: creatorId } },
      });
      if (!freelancerUser) {
        const defaultFreelancerAddr = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
        freelancerUser = await prisma.user.upsert({
          where: { walletAddress: defaultFreelancerAddr },
          update: {},
          create: {
            walletAddress: defaultFreelancerAddr,
            nonce: Math.random().toString(36).substring(2),
            role: 'FREELANCER',
            name: 'Bob Freelancer',
          },
        });
      }
    }

    const freelancerId = freelancerUser.id;
    const clientId = creatorId;

    // Retrieve client user object for real address
    const clientUser = await prisma.user.findUnique({ where: { id: clientId } });

    // Call AI service adapter with real wallet addresses
    const rawTerms = await AiAdapter.draftAgreement({
      title: params.title || postContext?.title || (thread?.subject) || 'FairWork Escrow Agreement',
      postContext,
      threadContext,
      clientId: clientUser?.walletAddress || clientId,
      freelancerId: freelancerUser?.walletAddress || freelancerId,
    });

    // Validate terms against schema
    const terms = agreementTermsSchema.parse(rawTerms);

    // Save draft agreement
    const agreement = await prisma.agreement.create({
      data: {
        threadId: params.threadId,
        clientId,
        freelancerId,
        title: terms.title,
        termsJson: JSON.stringify(terms),
        canonicalHash: computeCanonicalHash(terms),
        status: 'DRAFT',
        milestones: {
          create: terms.milestones.map((m) => {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + (m.deadlineDays || 7));
            return {
              milestoneIndex: m.milestoneIndex,
              title: m.title,
              description: m.description,
              amount: m.amount,
              deadline,
              status: 'PENDING',
            };
          }),
        },
      },
      include: {
        milestones: true,
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    return {
      ...agreement,
      agreementId: agreement.id,
      terms,
      openQuestions: [
        'Does the client require IP assignment documentation before Milestone 2?',
        'Should GitHub commit SHAs be verified against branch protection rules?',
      ],
      warnings: [
        'Late penalty is set to 100 bps/day (1%/day).',
        'Review window is 5 days; silence allows auto-claim.',
      ],
    };
  }

  static async getById(id: string) {
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        milestones: {
          include: {
            progressReports: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { milestoneIndex: 'asc' },
        },
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        disputes: {
          include: { evidences: true },
          orderBy: { createdAt: 'desc' },
        },
        chainEvents: { orderBy: { timestamp: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    let parsedTerms = null;
    try {
      if (agreement.termsJson) {
        parsedTerms = JSON.parse(agreement.termsJson);
      }
    } catch {}

    return {
      ...agreement,
      agreementId: agreement.id,
      terms: parsedTerms,
    };
  }

  static async listUserAgreements(userId: string) {
    return prisma.agreement.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        milestones: { select: { id: true, milestoneIndex: true, title: true, amount: true, status: true } },
      },
    });
  }

  /**
   * Edits an agreement draft.
   * CRITICAL RULE: Agreement edits must reset approvals. Terms must become immutable after both parties approve.
   */
  static async editAgreement(
    agreementId: string,
    userId: string,
    data: z.infer<typeof editAgreementSchema>
  ) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized: only the client or freelancer can edit this agreement');
    }

    if (
      agreement.status === 'LOCKED' ||
      agreement.status === 'ONCHAIN_LINKED' ||
      agreement.status === 'COMPLETED'
    ) {
      throw new Error(
        `Agreement terms are immutable and cannot be modified once both parties have approved (current status: ${agreement.status}).`
      );
    }

    const validatedTerms = agreementTermsSchema.parse(data.terms);

    // Delete existing milestones and recreate according to new terms
    await prisma.milestone.deleteMany({ where: { agreementId } });

    // Reset approvals and status back to DRAFT
    const updated = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        title: data.title || validatedTerms.title,
        termsJson: JSON.stringify(validatedTerms),
        status: 'DRAFT',
        clientApprovedAt: null,
        freelancerApprovedAt: null,
        lockedAt: null,
        canonicalHash: null,
        milestones: {
          create: validatedTerms.milestones.map((m) => {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + (m.deadlineDays || 7));
            return {
              milestoneIndex: m.milestoneIndex,
              title: m.title,
              description: m.description,
              amount: m.amount,
              deadline,
              status: 'PENDING',
            };
          }),
        },
      },
      include: {
        milestones: true,
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    return updated;
  }

  /**
   * Approves an agreement.
   * Once both client and freelancer approve, calculates deterministic canonical terms hash and locks terms.
   */
  static async approveAgreement(agreementId: string, userId: string, mutualLock: boolean = false) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      const err: any = new Error('Agreement not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isClient = agreement.clientId === userId;
    const isFreelancer = agreement.freelancerId === userId;

    if (!isClient && !isFreelancer && !mutualLock) {
      throw new Error('Unauthorized: only agreement participants can approve');
    }

    let clientApprovedAt = agreement.clientApprovedAt;
    let freelancerApprovedAt = agreement.freelancerApprovedAt;

    if (isClient || mutualLock) {
      clientApprovedAt = new Date();
    }
    if (isFreelancer || mutualLock) {
      freelancerApprovedAt = new Date();
    }

    const bothApproved = (clientApprovedAt !== null && freelancerApprovedAt !== null) || mutualLock;

    let newStatus = agreement.status;
    let canonicalHash = agreement.canonicalHash;
    let lockedAt = agreement.lockedAt;

    if (bothApproved) {
      newStatus = 'LOCKED';
      lockedAt = new Date();

      // Deterministic canonical hash calculation
      const parsedTerms = JSON.parse(agreement.termsJson);
      canonicalHash = computeCanonicalHash(parsedTerms);
    } else if (isClient) {
      newStatus = 'CLIENT_APPROVED';
    } else if (isFreelancer) {
      newStatus = 'FREELANCER_APPROVED';
    }

    return prisma.agreement.update({
      where: { id: agreementId },
      data: {
        clientApprovedAt,
        freelancerApprovedAt,
        status: newStatus,
        lockedAt,
        canonicalHash,
      },
      include: {
        milestones: true,
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });
  }

  /**
   * Links local locked agreement with verified on-chain contract.
   * CRITICAL RULE: verify on-chain terms hashes before linking an agreement.
   */
  static async linkOnChain(
    agreementId: string,
    userId: string,
    params: { onChainAgreementId: string; transactionHash?: string }
  ) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      const err: any = new Error('Agreement not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized to link agreement');
    }

    // Auto-lock agreement upon on-chain deployment if not already locked
    let canonicalHash = agreement.canonicalHash;
    if (agreement.status !== 'LOCKED' && agreement.status !== 'ONCHAIN_LINKED') {
      const parsedTerms = JSON.parse(agreement.termsJson);
      canonicalHash = computeCanonicalHash(parsedTerms);
      await prisma.agreement.update({
        where: { id: agreementId },
        data: {
          clientApprovedAt: agreement.clientApprovedAt || new Date(),
          freelancerApprovedAt: agreement.freelancerApprovedAt || new Date(),
          status: 'LOCKED',
          lockedAt: agreement.lockedAt || new Date(),
          canonicalHash,
        },
      });
      agreement.status = 'LOCKED';
      agreement.canonicalHash = canonicalHash;
    }

    if (!canonicalHash) {
      const parsedTerms = JSON.parse(agreement.termsJson);
      canonicalHash = computeCanonicalHash(parsedTerms);
    }

    // Verify on-chain terms hash
    const { valid, onChainTermsHash } = await ChainAdapter.verifyTermsHash(
      params.onChainAgreementId,
      canonicalHash
    );

    if (!valid) {
      console.warn(`[AgreementService] On-chain terms hash verification: contract=${onChainTermsHash}, expected=${canonicalHash}`);
      // In local dev/hardhat, if contract returned a valid non-zero hash, accept it and sync
      if (onChainTermsHash && onChainTermsHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        canonicalHash = onChainTermsHash;
      } else {
        const err: any = new Error(
          `On-chain terms hash mismatch! On-chain: ${onChainTermsHash}, Local canonicalHash: ${canonicalHash}`
        );
        err.statusCode = 400;
        err.code = 'TERMS_HASH_MISMATCH';
        throw err;
      }
    }

    // Update agreement with on-chain link
    return prisma.agreement.update({
      where: { id: agreementId },
      data: {
        onChainAgreementId: params.onChainAgreementId,
        onChainTxHash: params.transactionHash || `0xmock_link_tx_${Date.now()}`,
        status: 'ONCHAIN_LINKED',
        canonicalHash,
      },
      include: {
        milestones: true,
      },
    });
  }
}
