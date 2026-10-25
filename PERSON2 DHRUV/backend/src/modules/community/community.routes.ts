import { Router } from 'express';
import { CommunityController } from './community.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public routes: anyone can browse community posts and proposals
router.get('/posts', CommunityController.listPosts);
router.get('/posts/:id', CommunityController.getPostById);
router.get('/posts/:id/proposals', CommunityController.getProposalsForPost);

// Protected routes: require wallet authentication
router.post('/posts', authenticate, CommunityController.createPost);
router.post('/posts/:id/proposals', authenticate, CommunityController.submitProposal);
router.post('/posts/:postId/proposals/:id/accept', authenticate, CommunityController.acceptProposal);
router.post('/proposals/:id/accept', authenticate, CommunityController.acceptProposal);

// Threads & Messages (require authentication)
router.post('/threads', authenticate, CommunityController.createThread);
router.get('/threads', authenticate, CommunityController.listThreads);
router.get('/threads/:id', authenticate, CommunityController.getThreadById);
router.get('/threads/:id/messages', authenticate, CommunityController.getMessages);
router.post('/threads/:id/messages', authenticate, CommunityController.sendMessage);

export default router;
