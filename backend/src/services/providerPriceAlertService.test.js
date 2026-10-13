import { describe, it, expect, vi } from 'vitest';

// The service object talks to Firestore; only the pure functions are tested.
vi.mock('../repositories/priceAlertRepo.js', () => ({ default: {} }));
vi.mock('../repositories/subscriptionRepo.js', () => ({ default: {} }));

import { findProviderPriceAlerts } from './providerPriceAlertService.js';

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
