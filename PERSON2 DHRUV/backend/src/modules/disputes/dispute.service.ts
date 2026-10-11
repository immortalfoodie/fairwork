import fs from 'fs';
import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';
import { computeSha256 } from '../../utils/canonicalHash';
import { z } from 'zod';
import { createDisputeSchema, resolveDisputeSchema } from './dispute.schema';

export class DisputeService {
  static async createDispute(userId: string, data: z.infer<typeof createDisputeSchema>) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: data.agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized: only agreement parties can raise a dispute');
    }

    const dispute = await prisma.dispute.create({
      data: {
        agreementId: data.agreementId,
        raisedById: userId,
        reason: data.reason,
        status: 'OPEN',
      },
    });

    // Update agreement status to DISPUTED
    await prisma.agreement.update({
      where: { id: data.agreementId },
      data: { status: 'DISPUTED' },
    });

    return dispute;
  }

  static async uploadEvidence(
    disputeId: string,
    userId: string,
    file: Express.Multer.File,
    description?: string
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Read file buffer safely to compute SHA-256 content hash
    const fileBuffer = fs.readFileSync(file.path);
    const contentHash = computeSha256(fileBuffer);

    const evidence = await prisma.evidence.create({
      data: {
        disputeId: dispute.id,
        agreementId: dispute.agreementId,
        uploadedById: userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        contentHash,
        description: description || null,
      },
      include: {
        uploadedBy: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    return evidence;
  }

  static async generateAiSummaryAndRecommendation(disputeId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: true,
        evidences: true,
      },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const aiResult = await AiAdapter.summarizeDispute({
      disputeReason: dispute.reason,
      agreementTitle: dispute.agreement.title,
      evidenceList: dispute.evidences.map((e) => ({
        description: e.description,
        filename: e.originalName,
        contentHash: e.contentHash,
      })),
    });

    const recommendationStr = `${aiResult.recommendation} | Client: ${aiResult.splitPercentageClient ?? 0}% / Freelancer: ${aiResult.splitPercentageFreelancer ?? 0}%. Reasoning: ${aiResult.reasoning}`;

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        aiSummary: aiResult.summary,
        oracleRecommendation: recommendationStr,
      },
      include: {
        evidences: true,
      },
    });

    return updated;
  }

  static async resolveDispute(
    disputeId: string,
    data: z.infer<typeof resolveDisputeSchema>
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: data.resolution,
      },
    });

    // Check if agreement should be marked as COMPLETED
    await prisma.agreement.update({
      where: { id: dispute.agreementId },
      data: { status: 'COMPLETED' },
    });

    return updated;
  }

  static async getById(id: string) {
    let dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        agreement: {
          include: {
            client: { select: { id: true, walletAddress: true, name: true } },
            freelancer: { select: { id: true, walletAddress: true, name: true } },
          },
        },
        evidences: {
          include: {
            uploadedBy: { select: { id: true, walletAddress: true, name: true } },
          },
        },
      },
    });

    if (!dispute) {
      dispute = await prisma.dispute.findFirst({
        where: { agreementId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          agreement: {
            include: {
              client: { select: { id: true, walletAddress: true, name: true } },
              freelancer: { select: { id: true, walletAddress: true, name: true } },
            },
          },
          evidences: {
            include: {
              uploadedBy: { select: { id: true, walletAddress: true, name: true } },
            },
          },
        },
      });
    }

    if (!dispute) {
      throw new Error('Dispute not found');
    }
    return dispute;
  }

  static async submitMilestoneEvidence(
    agreementId: string,
    idx: number,
    userId: string,
    text: string,
    files?: string[]
  ) {
    let dispute = await prisma.dispute.findFirst({
      where: { agreementId },
      orderBy: { createdAt: 'desc' },
    });

    if (!dispute) {
      dispute = await prisma.dispute.create({
        data: {
          agreementId,
          raisedById: userId,
          reason: text || `Dispute raised on Milestone #${idx + 1}`,
          status: 'OPEN',
        },
      });

      await prisma.agreement.update({
        where: { id: agreementId },
        data: { status: 'DISPUTED' },
      });

      await prisma.milestone.updateMany({
        where: { agreementId, milestoneIndex: idx },
        data: { status: 'DISPUTED' },
      });
    }

    const contentHash = computeSha256(Buffer.from(text || 'evidence', 'utf8'));
    const evidence = await prisma.evidence.create({
      data: {
        disputeId: dispute.id,
        agreementId,
        uploadedById: userId,
        filename: files?.[0] || 'evidence_statement.txt',
        originalName: files?.[0] || 'evidence_statement.txt',
        mimeType: 'text/plain',
        sizeBytes: Buffer.byteLength(text || '', 'utf8'),
        storagePath: 'memory://text',
        contentHash,
        description: text,
      },
    });

    return { dispute, evidence };
  }
}

