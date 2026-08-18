import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import exampleController from '../controllers/exampleController.js';

const router = Router();

router.get('/items', verifyToken, exampleController.getAll);
router.post('/items', verifyToken, exampleController.create);

export default router;