import { describe, it, expect } from 'vitest';
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
});
