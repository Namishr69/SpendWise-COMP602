import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import priceAlertController from '../controllers/priceAlertController.js';

const router = Router();

router.get('/price-alerts', verifyToken, priceAlertController.getActive);
router.patch('/price-alerts/:id/dismiss', verifyToken, priceAlertController.dismiss);

export default router;
