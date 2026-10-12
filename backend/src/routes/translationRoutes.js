import { Router } from 'express';

import verifyToken from '../middleware/authMiddleware.js';
import translationController from '../controllers/translationController.js';

const router = Router();

router.post(
    '/translate',
    verifyToken,
    translationController.translate
);

export default router;
