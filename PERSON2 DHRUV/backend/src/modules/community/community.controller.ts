import { Response, NextFunction } from 'express';
import { CommunityService } from './community.service';
import {
  createPostSchema,
  searchPostQuerySchema,
  submitProposalSchema,
  createThreadSchema,
  sendMessageSchema,
} from './community.schema';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth';

export class CommunityController {
  // Posts
  static async createPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = createPostSchema.parse(req.body);
      const post = await CommunityService.createPost(req.user!.id, data);
      return sendSuccess(res, post, 201, 'Post created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listPosts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = searchPostQuerySchema.parse(req.query);
      const posts = await CommunityService.listPosts(query);
      return sendSuccess(res, posts);
    } catch (error) {
      next(error);
    }
  }

  static async getPostById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const post = await CommunityService.getPostById(req.params.id);
      return sendSuccess(res, post);
    } catch (error) {
      next(error);
    }
  }

  // Proposals
  static async submitProposal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = submitProposalSchema.parse(req.body);
      const proposal = await CommunityService.submitProposal(req.params.id, req.user!.id, data);
      return sendSuccess(res, proposal, 201, 'Proposal submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProposalsForPost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const proposals = await CommunityService.getProposalsForPost(req.params.id);
      return sendSuccess(res, proposals);
    } catch (error) {
      next(error);
    }
  }

  static async acceptProposal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const proposalId = req.params.id || (req.params as any).proposalId;
      const result = await CommunityService.acceptProposal(proposalId, req.user!.id);
      return sendSuccess(res, result, 200, 'Proposal accepted');
    } catch (error) {
      next(error);
    }
  }

  // Threads & Messages
  static async createThread(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = createThreadSchema.parse(req.body);
      const thread = await CommunityService.getOrCreateThread(req.user!.id, data);
      return sendSuccess(res, thread, 201, 'Thread initialized');
    } catch (error) {
      next(error);
    }
  }

  static async listThreads(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const threads = await CommunityService.listUserThreads(req.user!.id);
      return sendSuccess(res, threads);
    } catch (error) {
      next(error);
    }
  }

  static async getThreadById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const thread = await CommunityService.getThreadById(req.params.id, req.user!.id);
      return sendSuccess(res, thread);
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const thread = await CommunityService.getThreadById(req.params.id, req.user!.id);
      return sendSuccess(res, thread.messages || []);
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = sendMessageSchema.parse(req.body);
      const message = await CommunityService.sendMessage(req.params.id, req.user!.id, data);
      return sendSuccess(res, message, 201, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  }
}
