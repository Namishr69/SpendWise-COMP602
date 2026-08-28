import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

router.get('/subscriptions', verifyToken, subscriptionController.getAll);
router.post('/subscriptions', verifyToken, subscriptionController.create);
router.get('/subscriptions/:id', verifyToken, subscriptionController.getById);
router.patch('/subscriptions/:id', verifyToken, subscriptionController.update);

export default router;
