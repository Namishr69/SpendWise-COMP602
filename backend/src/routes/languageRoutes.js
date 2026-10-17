import { Router } from 'express';

import verifyToken from '../middleware/authMiddleware.js';

import languageController from '../controllers/languageController.js';

const router = Router();

router.get(
    '/preferred-language',
    verifyToken,
    languageController.getPreferredLanguage
);

router.put(
    '/preferred-language',
    verifyToken,
    languageController.updatePreferredLanguage
);

export default router;