import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import currencyController from '../controllers/currencyController.js';

const router = Router();

router.put(
    '/preferred-currency',
    verifyToken,
    currencyController.updatePreferredCurrency
);

export default router;