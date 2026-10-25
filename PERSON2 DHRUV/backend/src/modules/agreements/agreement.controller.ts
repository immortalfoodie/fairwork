import { Response, NextFunction } from 'express';
import { AgreementService } from './agreement.service';
import { draftAgreementRequestSchema, editAgreementSchema } from './agreement.schema';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';
import { z } from 'zod';

const linkAgreementSchema = z
  .object({
    onChainAgreementId: z.union([z.string(), z.number()]).optional(),
    onchainId: z.union([z.string(), z.number()]).optional(),
    transactionHash: z.string().optional(),
    txHash: z.string().optional(),
  })
  .transform((data) => ({
    onChainAgreementId: String(data.onChainAgreementId ?? data.onchainId ?? ''),
    transactionHash: data.transactionHash || data.txHash,
  }));

export class AgreementController {
  static async draftAgreement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = draftAgreementRequestSchema.parse(req.body);
      const agreement = await AgreementService.draftAgreement(req.user!.id, data);
      return sendSuccess(res, agreement, 201, 'Agreement draft generated');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agreement = await AgreementService.getById(req.params.id);
      return sendSuccess(res, agreement);
    } catch (error) {
      next(error);
    }
  }

  static async listUserAgreements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agreements = await AgreementService.listUserAgreements(req.user!.id);
      return sendSuccess(res, agreements);
    } catch (error) {
      next(error);
    }
  }

  static async editAgreement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = editAgreementSchema.parse(req.body);
      const updated = await AgreementService.editAgreement(req.params.id, req.user!.id, data);
      return sendSuccess(res, updated, 200, 'Agreement updated and approvals reset');
    } catch (error) {
      next(error);
    }
  }

  static async approveAgreement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const mutualLock = Boolean(req.body?.mutualLock || req.query?.mutualLock);
      const approved = await AgreementService.approveAgreement(req.params.id, req.user!.id, mutualLock);
      return sendSuccess(res, approved, 200, 'Agreement approval recorded');
    } catch (error) {
      next(error);
    }
  }

  static async linkAgreement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = linkAgreementSchema.parse(req.body);
      const linked = await AgreementService.linkOnChain(req.params.id, req.user!.id, data);
      return sendSuccess(res, linked, 200, 'Agreement verified and linked to on-chain contract');
    } catch (error) {
      next(error);
    }
  }
}
