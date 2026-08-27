import { Router } from 'express';
import exchangeRateController from '../controllers/exchangeRateController.js';

const router = Router();

router.post('/convert-currency', exchangeRateController.convert);

export default router;