import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import gmailController from '../controllers/gmailController.js';

const router = Router();

// Every route is user-scoped: the Gmail connection belongs to the signed-in
// SpendWise account, which is why the callback is forwarded here by the
// frontend with a Firebase ID token rather than hit directly by Google.
router.post('/gmail/connect', verifyToken, gmailController.connect);
router.post('/gmail/callback', verifyToken, gmailController.callback);
router.get('/gmail/status', verifyToken, gmailController.status);
router.get('/gmail/preview', verifyToken, gmailController.preview);
router.delete('/gmail/connection', verifyToken, gmailController.disconnect);

export default router;
