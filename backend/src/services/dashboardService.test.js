import { describe, it, expect, vi, beforeEach } from 'vitest';

// The service reads Firestore through these repos; stub them with plain data.
vi.mock('../repositories/bankDataRepo.js', () => ({
    default: { listTransactions: vi.fn() },
}));
vi.mock('../repositories/subscriptionRepo.js', () => ({
    default: { getAll: vi.fn() },
}));

import bankDataRepo from '../repositories/bankDataRepo.js';
import subscriptionRepo from '../repositories/subscriptionRepo.js';
import dashboardService from './dashboardService.js';

describe('dashboardService detectedSubs', () => {
    beforeEach(() => {
        bankDataRepo.listTransactions.mockResolvedValue([]);
    });

    it('counts active subscriptions found by the bank or confirmed from email', async () => {
        subscriptionRepo.getAll.mockResolvedValue([
            { id: 'bank', source: 'anz-detected', status: 'Active' },
            { id: 'email', source: 'gmail-detected', reviewStatus: 'confirmed', status: 'Active' },
            { id: 'manual', status: 'Active' },
        ]);

        const { stats } = await dashboardService.getDashboard('user-1');

        expect(stats.detectedSubs).toBe(2);
    });

    it('leaves out pending, rejected, cancelled and paused finds', async () => {
        subscriptionRepo.getAll.mockResolvedValue([
            { id: 'pending', source: 'gmail-detected', status: 'Active' },
            { id: 'rejected', source: 'gmail-detected', reviewStatus: 'rejected', status: 'Active' },
            { id: 'cancelled', source: 'anz-detected', status: 'Cancelled' },
            { id: 'paused', source: 'anz-detected', status: 'Paused' },
        ]);

        const { stats } = await dashboardService.getDashboard('user-1');

        expect(stats.detectedSubs).toBe(0);
    });
});
