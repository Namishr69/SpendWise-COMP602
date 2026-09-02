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

// Bank data: sync pulls from ANZ into Firestore; the reads below serve the
// stored copy so pages never wait on ANZ.
router.post('/anz/sync', verifyToken, anzController.sync);
router.get('/anz/bank-accounts', verifyToken, anzController.bankAccounts);
router.get('/anz/transactions', verifyToken, anzController.transactions);
router.get('/anz/dashboard', verifyToken, anzController.dashboard);

export default router;
