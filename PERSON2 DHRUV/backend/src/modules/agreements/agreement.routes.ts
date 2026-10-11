import { Router } from 'express';
import { AgreementController } from './agreement.controller';
import { EventController } from '../events/event.controller';
import { PaymentController } from '../payments/payment.controller';
import { AlertController } from '../deadlines/alert.controller';
import { MilestoneController } from '../milestones/milestone.controller';
import { DisputeController } from '../disputes/dispute.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/draft', AgreementController.draftAgreement);
router.get('/', AgreementController.listUserAgreements);
router.get('/:id', AgreementController.getById);
router.put('/:id', AgreementController.editAgreement);
router.put('/:id/terms', AgreementController.editAgreement);
router.post('/:id/approve', AgreementController.approveAgreement);
router.post('/:id/approve-draft', AgreementController.approveAgreement);
router.post('/:id/link', AgreementController.linkAgreement);
router.post('/:id/link-chain', AgreementController.linkAgreement);

// Timeline & Payments sub-routes
router.get('/:id/timeline', EventController.getAgreementTimeline);
router.get('/:id/payments', PaymentController.getPaymentSummary);
router.get('/:id/alerts', AlertController.listAlerts);

// Milestone sub-routes
router.post('/:id/milestones/:idx/submit', MilestoneController.submitMilestone);
router.get('/:id/milestones/:idx/progress', MilestoneController.getById);

// Dispute sub-routes
router.get('/:id/milestones/:idx/dispute', DisputeController.getById);
router.post('/:id/milestones/:idx/evidence', DisputeController.submitMilestoneEvidence);
router.post('/:id/milestones/:idx/ai-summary', DisputeController.generateAiSummary);

export default router;
