import { describe, it, expect, vi } from 'vitest';

// The service object talks to Firestore; only the pure functions are tested.
vi.mock('../repositories/priceAlertRepo.js', () => ({ default: {} }));

import { filterAnnouncedChanges } from './priceAlertService.js';

describe('filterAnnouncedChanges', () => {
    const announcement = {
        type: 'announcement',
        subscriptionId: 'sub1',
        previousAmount: 15.99,
        newAmount: 17.99,
        effectiveDate: '2026-11-01',
        dismissed: true,
    };

    function change(overrides) {
        return {
            paymentId: 'pay1',
            paymentDate: '2026-11-01',
            previousAmount: 15.99,
            newAmount: 17.99,
            ...overrides,
        };
    }

    it('drops a charge at the announced price once the new price takes effect', () => {
        const changes = [change({ paymentDate: '2026-11-03' })];

        expect(filterAnnouncedChanges('sub1', changes, [announcement])).toEqual([]);
    });

    it('drops a charge at the announced price billed a few days before the effective date', () => {
        const changes = [change({ paymentDate: '2026-10-29' })];

        expect(filterAnnouncedChanges('sub1', changes, [announcement])).toEqual([]);
    });

    it('keeps a charge whose amount differs from the announced price', () => {
        const changes = [change({ newAmount: 19.99 })];

        expect(filterAnnouncedChanges('sub1', changes, [announcement])).toEqual(changes);
    });

    it('keeps a charge at the announced price made well before the effective date', () => {
        const changes = [change({ paymentDate: '2026-09-01' })];

        expect(filterAnnouncedChanges('sub1', changes, [announcement])).toEqual(changes);
    });

    it('keeps a charge when the announcement was for a different subscription', () => {
        const changes = [change()];
        const other = { ...announcement, subscriptionId: 'sub2' };

        expect(filterAnnouncedChanges('sub1', changes, [other])).toEqual(changes);
    });

    it('does not treat an earlier charge-based alert as an announcement', () => {
        const changes = [change()];
        const chargeAlert = {
            subscriptionId: 'sub1',
            previousAmount: 15.99,
            newAmount: 17.99,
            paymentDate: '2026-10-01',
        };

        expect(filterAnnouncedChanges('sub1', changes, [chargeAlert])).toEqual(changes);
    });
});
