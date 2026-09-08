import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import budgetController from '../controllers/budgetController.js';

const router = Router();

router.put('/budget', verifyToken, budgetController.updateBudget);

export default router;