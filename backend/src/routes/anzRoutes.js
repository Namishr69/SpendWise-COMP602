import { Router } from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import anzController from '../controllers/anzController.js';

const router = Router();

// Every route is user-scoped: the ANZ connection belongs to the signed-in
// SpendWise account, which is why the callback is forwarded here by the
// frontend with a Firebase ID token rather than hit directly by ANZ.
router.post('/anz/connect', verifyToken, anzController.connect);
router.post('/anz/callback', verifyToken, anzController.callback);
router.get('/anz/status', verifyToken, anzController.status);
router.get('/anz/accounts', verifyToken, anzController.accounts);
router.delete('/anz/connection', verifyToken, anzController.disconnect);

export default router;
