import { describe, it, expect, vi } from 'vitest';

// The service object talks to Firestore; only the pure functions are tested.
vi.mock('../repositories/priceAlertRepo.js', () => ({ default: {} }));
vi.mock('../repositories/subscriptionRepo.js', () => ({ default: {} }));

import priceAlertRepo from '../repositories/priceAlertRepo.js';
import subscriptionRepo from '../repositories/subscriptionRepo.js';
import providerPriceAlertService, {
    findProviderPriceAlerts,
    planAnnouncedPrices,
} from './providerPriceAlertService.js';

describe('findProviderPriceAlerts', () => {
    const netflix = { id: 'sub1', name: 'Netflix', amount: 15.99 };

    it('creates no alert when the announced price matches the current price', () => {
        const announcements = [
            { id: 'email1', merchant: 'Netflix', newAmount: 15.99, effectiveDate: '2026-11-01' },
        ];

        expect(findProviderPriceAlerts([netflix], announcements, [])).toEqual([]);
    });

    it('creates an alert with the subscription name, previous price and new price when the price changes', () => {
        const announcements = [
            { id: 'email2', merchant: 'Netflix', newAmount: 17.99, effectiveDate: '2026-11-01' },
        ];

        expect(findProviderPriceAlerts([netflix], announcements, [])).toEqual([
            {
                type: 'announcement',
                subscriptionId: 'sub1',
                subscriptionName: 'Netflix',
                previousAmount: 15.99,
                newAmount: 17.99,
                effectiveDate: '2026-11-01',
                announcementId: 'email2',
            },
        ]);
    });

    it('creates no alert for a provider the user is not subscribed to', () => {
        const announcements = [
            { id: 'email3', merchant: 'Spotify', newAmount: 19.99, effectiveDate: '2026-11-01' },
        ];

        expect(findProviderPriceAlerts([netflix], announcements, [])).toEqual([]);
    });

    it('does not create a duplicate alert for an announcement that already has one', () => {
        const announcements = [
            { id: 'email4', merchant: 'Netflix', newAmount: 17.99, effectiveDate: '2026-11-01' },
        ];
        const existingAlerts = [{ subscriptionId: 'sub1', announcementId: 'email4' }];

        expect(findProviderPriceAlerts([netflix], announcements, existingAlerts)).toEqual([]);
    });

    describe('subscription matching', () => {
        it('matches the sender regardless of case and punctuation', () => {
            const announcements = [
                { id: 'email5', merchant: 'NETFLIX.COM', newAmount: 17.99, effectiveDate: '2026-11-01' },
            ];

            const alerts = findProviderPriceAlerts([netflix], announcements, []);

            expect(alerts).toHaveLength(1);
            expect(alerts[0].subscriptionId).toBe('sub1');
        });

        it('matches a subscription whose name adds a plan to the provider name', () => {
            const spotify = { id: 'sub2', name: 'Spotify Premium', amount: 16.99 };
            const announcements = [
                { id: 'email6', merchant: 'Spotify', newAmount: 18.99, effectiveDate: '2026-11-01' },
            ];

            const alerts = findProviderPriceAlerts([netflix, spotify], announcements, []);

            expect(alerts).toHaveLength(1);
            expect(alerts[0].subscriptionId).toBe('sub2');
        });

        it('prefers an exact name match over a partial one', () => {
            const appleMusic = { id: 'sub3', name: 'Apple Music', amount: 10.99 };
            const apple = { id: 'sub4', name: 'Apple', amount: 4.99 };
            const announcements = [
                { id: 'email7', merchant: 'Apple', newAmount: 5.99, effectiveDate: '2026-11-01' },
            ];

            const alerts = findProviderPriceAlerts([appleMusic, apple], announcements, []);

            expect(alerts).toHaveLength(1);
            expect(alerts[0].subscriptionId).toBe('sub4');
        });

        it('ignores an announcement that partially matches more than one subscription', () => {
            const appleMusic = { id: 'sub3', name: 'Apple Music', amount: 10.99 };
            const appleTv = { id: 'sub5', name: 'Apple TV', amount: 12.99 };
            const announcements = [
                { id: 'email8', merchant: 'Apple', newAmount: 14.99, effectiveDate: '2026-11-01' },
            ];

            expect(findProviderPriceAlerts([appleMusic, appleTv], announcements, [])).toEqual([]);
        });

        it('ignores a cancelled subscription', () => {
            const cancelled = { ...netflix, status: 'Cancelled' };
            const announcements = [
                { id: 'email9', merchant: 'Netflix', newAmount: 17.99, effectiveDate: '2026-11-01' },
            ];

            expect(findProviderPriceAlerts([cancelled], announcements, [])).toEqual([]);
        });

        it('treats prices that are equal to the cent as unchanged', () => {
            const announcements = [
                { id: 'email10', merchant: 'Netflix', newAmount: 15.990000001, effectiveDate: '2026-11-01' },
            ];

            expect(findProviderPriceAlerts([netflix], announcements, [])).toEqual([]);
        });
    });

    describe('duplicate prevention', () => {
        it('does not create a second alert when a reminder email announces the same change', () => {
            const announcements = [
                { id: 'reminder', merchant: 'Netflix', newAmount: 17.99, effectiveDate: '2026-11-01' },
            ];
            const existingAlerts = [
                {
                    type: 'announcement',
                    subscriptionId: 'sub1',
                    newAmount: 17.99,
                    effectiveDate: '2026-11-01',
                    announcementId: 'original',
                },
            ];

            expect(findProviderPriceAlerts([netflix], announcements, existingAlerts)).toEqual([]);
        });

        it('creates one alert when the same change is announced twice in one scan', () => {
            const announcements = [
                { id: 'emailA', merchant: 'Netflix', newAmount: 17.99, effectiveDate: '2026-11-01' },
                { id: 'emailB', merchant: 'Netflix', newAmount: 17.99, effectiveDate: '2026-11-01' },
            ];

            expect(findProviderPriceAlerts([netflix], announcements, [])).toHaveLength(1);
        });

        it('still alerts on a later, different change for the same subscription', () => {
            const announcements = [
                { id: 'email11', merchant: 'Netflix', newAmount: 19.99, effectiveDate: '2027-06-01' },
            ];
            const existingAlerts = [
                {
                    type: 'announcement',
                    subscriptionId: 'sub1',
                    newAmount: 17.99,
                    effectiveDate: '2026-11-01',
                    announcementId: 'email2',
                },
            ];

            expect(findProviderPriceAlerts([netflix], announcements, existingAlerts)).toHaveLength(1);
        });
    });
});

describe('planAnnouncedPrices', () => {
    const netflix = { id: 'sub1', name: 'Netflix', amount: 15.99, status: 'Active' };
    const announcement = (overrides) => ({
        id: 'alert1',
        type: 'announcement',
        subscriptionId: 'sub1',
        previousAmount: 15.99,
        newAmount: 17.99,
        effectiveDate: '2026-10-20',
        ...overrides,
    });

    it('reports a change that has not started yet as upcoming', () => {
        expect(planAnnouncedPrices([netflix], [announcement()], '2026-10-18')).toEqual({
            updates: [],
            appliedAlertIds: [],
            upcoming: { sub1: { newAmount: 17.99, effectiveDate: '2026-10-20' } },
        });
    });

    it('applies the new price on the date it takes effect', () => {
        expect(planAnnouncedPrices([netflix], [announcement()], '2026-10-20')).toEqual({
            updates: [{ subscriptionId: 'sub1', amount: 17.99 }],
            appliedAlertIds: ['alert1'],
            upcoming: {},
        });
    });

    it('still applies a change the user dismissed', () => {
        const dismissed = announcement({ dismissed: true });

        expect(planAnnouncedPrices([netflix], [dismissed], '2026-10-21').updates).toEqual([
            { subscriptionId: 'sub1', amount: 17.99 },
        ]);
    });

    it('applies each change only once', () => {
        const applied = announcement({ applied: true });

        expect(planAnnouncedPrices([netflix], [applied], '2026-10-21')).toEqual({
            updates: [],
            appliedAlertIds: [],
            upcoming: {},
        });
    });

    it('ignores announcements without a start date', () => {
        const undated = announcement({ effectiveDate: null });

        expect(planAnnouncedPrices([netflix], [undated], '2026-10-21')).toEqual({
            updates: [],
            appliedAlertIds: [],
            upcoming: {},
        });
    });

    it('does not change the price of a cancelled subscription', () => {
        const cancelled = { ...netflix, status: 'Cancelled' };

        expect(planAnnouncedPrices([cancelled], [announcement()], '2026-10-21')).toEqual({
            updates: [],
            appliedAlertIds: ['alert1'],
            upcoming: {},
        });
    });

    it('applies the change that has started and shows the next one as upcoming', () => {
        const alerts = [
            announcement({ id: 'later', newAmount: 19.99, effectiveDate: '2027-01-01' }),
            announcement({ id: 'now' }),
        ];

        expect(planAnnouncedPrices([netflix], alerts, '2026-10-21')).toEqual({
            updates: [{ subscriptionId: 'sub1', amount: 17.99 }],
            appliedAlertIds: ['now'],
            upcoming: { sub1: { newAmount: 19.99, effectiveDate: '2027-01-01' } },
        });
    });
});

describe('providerPriceAlertService.applyAnnouncedPrices', () => {
    it('saves prices that take effect and returns subscriptions with the new and upcoming prices', async () => {
        const netflix = { id: 'sub1', name: 'Netflix', amount: 15.99, status: 'Active' };
        const spotify = { id: 'sub2', name: 'Spotify', amount: 12.99, status: 'Active' };

        priceAlertRepo.listByType = vi.fn(async () => [
            { id: 'a1', type: 'announcement', subscriptionId: 'sub1', newAmount: 17.99, effectiveDate: '2026-10-20' },
            { id: 'a2', type: 'announcement', subscriptionId: 'sub2', newAmount: 14.99, effectiveDate: '2026-11-01' },
        ]);
        priceAlertRepo.update = vi.fn(async () => ({}));
        subscriptionRepo.update = vi.fn(async () => ({}));

        const result = await providerPriceAlertService.applyAnnouncedPrices(
            'user1',
            [netflix, spotify],
            '2026-10-20',
        );

        expect(subscriptionRepo.update).toHaveBeenCalledWith('user1', 'sub1', { amount: 17.99 });
        expect(priceAlertRepo.update).toHaveBeenCalledWith('user1', 'a1', { applied: true });
        expect(result).toEqual([
            { ...netflix, amount: 17.99 },
            { ...spotify, upcomingPriceChange: { newAmount: 14.99, effectiveDate: '2026-11-01' } },
        ]);
    });
});
