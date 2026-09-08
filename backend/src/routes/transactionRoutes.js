import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import transactionController from '../controllers/transactionController.js';

const router = Router();

router.get('/transactions', verifyToken, transactionController.getAll);
router.post('/transactions', verifyToken, transactionController.create);
router.get('/transactions/:id', verifyToken, transactionController.getById);
router.patch('/transactions/:id', verifyToken, transactionController.update);
router.delete('/transactions/:id', verifyToken, transactionController.delete);

export default router;