import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import darkModeController from '../controllers/darkModeController.js';

const router = Router();

router.put('/dark-mode', verifyToken, darkModeController.updateDarkMode);

export default router;