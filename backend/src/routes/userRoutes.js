import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import userController from '../controllers/userController.js';

const router = Router();

router.post('/users', verifyToken, userController.register);
router.get('/users/me', verifyToken, userController.getMe);

export default router;