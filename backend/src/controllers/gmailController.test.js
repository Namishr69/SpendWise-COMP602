import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/gmailAuthService.js', () => ({ default: { getValidAccessToken: vi.fn() } }));
vi.mock('../services/gmailService.js', () => ({ default: {} }));
vi.mock('../services/gmailSyncService.js', () => ({ default: { syncSubscriptions: vi.fn() } }));
vi.mock('../services/priceAlertService.js', () => ({ default: {} }));
vi.mock('../services/providerPriceAlertService.js', () => ({ default: { scanGmail: vi.fn() } }));
vi.mock('../repositories/subscriptionRepo.js', () => ({ default: {} }));
vi.mock('../repositories/transactionRepo.js', () => ({ default: {} }));

import gmailAuthService from '../services/gmailAuthService.js';
import gmailSyncService from '../services/gmailSyncService.js';
import providerPriceAlertService from '../services/providerPriceAlertService.js';
import gmailController from './gmailController.js';

function mockResponse() {
    const res = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
}

describe('gmailController.sync', () => {
    const subscriptionSummary = { scanned: 50, parsed: 2, created: 1, updated: 1, transactionsSaved: 2 };

    beforeEach(() => {
        vi.clearAllMocks();
        gmailSyncService.syncSubscriptions.mockResolvedValue({ ...subscriptionSummary });
        gmailAuthService.getValidAccessToken.mockResolvedValue('stored-token');
    });

    it('searches for price changes with the stored Gmail token after syncing subscriptions', async () => {
        providerPriceAlertService.scanGmail.mockResolvedValue({ scanned: 3, announcements: 1, created: [{ id: 'a1' }] });
        const res = mockResponse();

        await gmailController.sync({ userId: 'user1' }, res);

        expect(providerPriceAlertService.scanGmail).toHaveBeenCalledWith('user1', 'stored-token');
        expect(res.json).toHaveBeenCalledWith({ ...subscriptionSummary, priceChanges: 1 });
    });

    it('still reports the subscriptions saved when the price change search fails', async () => {
        providerPriceAlertService.scanGmail.mockRejectedValue(new Error('Gmail request failed: quota'));
        const res = mockResponse();

        await gmailController.sync({ userId: 'user1' }, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            ...subscriptionSummary,
            priceChangeError: 'Gmail request failed: quota',
        });
    });
});
