import { Response, NextFunction } from 'express';
import { DisputeService } from './dispute.service';
import { createDisputeSchema, resolveDisputeSchema } from './dispute.schema';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class DisputeController {
  static async createDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = createDisputeSchema.parse(req.body);
      const dispute = await DisputeService.createDispute(req.user!.id, data);
      return sendSuccess(res, dispute, 201, 'Dispute filed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }
      const description = req.body.description as string | undefined;
      const evidence = await DisputeService.uploadEvidence(
        req.params.id,
        req.user!.id,
        req.file,
        description
      );
      return sendSuccess(res, evidence, 201, 'Evidence stored and hashed securely');
    } catch (error) {
      next(error);
    }
  }

  static async generateAiSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await DisputeService.generateAiSummaryAndRecommendation(req.params.id);
      return sendSuccess(res, result, 200, 'AI dispute analysis and recommendation generated');
    } catch (error) {
      next(error);
    }
  }

  static async resolveDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = resolveDisputeSchema.parse(req.body);
      const result = await DisputeService.resolveDispute(req.params.id, data);
      return sendSuccess(res, result, 200, 'Dispute marked as resolved');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const dispute = await DisputeService.getById(req.params.id);
      return sendSuccess(res, dispute);
    } catch (error) {
      next(error);
    }
  }

  static async submitMilestoneEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id, idx } = req.params;
      const text = (req.body.text || req.body.reason || '') as string;
      const files = req.body.files as string[] | undefined;
      const result = await DisputeService.submitMilestoneEvidence(
        id,
        parseInt(idx, 10),
        req.user!.id,
        text,
        files
      );
      return sendSuccess(res, result, 201, 'Dispute evidence recorded');
    } catch (error) {
      next(error);
    }
  }
}

