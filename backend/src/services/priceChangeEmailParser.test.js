import { describe, it, expect } from 'vitest';
import { parsePriceChangeEmail } from './priceChangeEmailParser.js';

describe('parsePriceChangeEmail', () => {
    it('reads the provider, old price, new price and effective date from a price change email', () => {
        const email = {
            id: 'msg1',
            from: '"Netflix" <info@account.netflix.com>',
            subject: 'Your Netflix price is changing',
            body: 'Hi Sam, your monthly price will change from $15.99 to $17.99 starting 1 November 2026.',
            receivedAt: '2026-10-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toEqual({
            id: 'msg1',
            merchant: 'Netflix',
            currentAmount: 15.99,
            newAmount: 17.99,
            effectiveDate: '2026-11-01',
        });
    });

    it('falls back to the sender domain when the email has no display name', () => {
        const email = {
            id: 'msg2',
            from: 'no-reply@billing.spotify.com',
            subject: 'An update to your Premium price',
            body: 'From your next billing date on 5 December 2026, your new price will be NZ$18.99/month.',
            receivedAt: '2026-11-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toMatchObject({
            merchant: 'Spotify',
            newAmount: 18.99,
            effectiveDate: '2026-12-05',
        });
    });

    it('reads US-style dates written month first', () => {
        const email = {
            id: 'msg3',
            from: 'Disney+ <disneyplus@mail.disneyplus.com>',
            subject: 'Upcoming price increase',
            body: 'Beginning December 5, 2026, the price of your plan will increase to $21.99.',
            receivedAt: '2026-11-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toMatchObject({
            merchant: 'Disney+',
            newAmount: 21.99,
            effectiveDate: '2026-12-05',
        });
    });

    it('reads numeric day/month/year dates', () => {
        const email = {
            id: 'msg4',
            from: 'Neon <hello@neontv.co.nz>',
            subject: 'Your Neon price is going up',
            body: 'Your price is going up to $24.99 per month from 01/11/2026.',
            receivedAt: '2026-10-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toMatchObject({
            newAmount: 24.99,
            effectiveDate: '2026-11-01',
        });
    });

    it('works out the year when the date leaves it out', () => {
        const email = {
            id: 'msg5',
            from: 'YouTube <no-reply@youtube.com>',
            subject: 'Your YouTube Premium price is changing',
            body: 'Your price will increase to $17.99 from 1 February.',
            receivedAt: '2026-12-10T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email).effectiveDate).toBe('2027-02-01');
    });

    it('leaves the effective date empty when the email does not give one', () => {
        const email = {
            id: 'msg6',
            from: 'Netflix <info@account.netflix.com>',
            subject: 'Your Netflix price is changing',
            body: 'Your price is increasing to $17.99.',
            receivedAt: '2026-10-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toMatchObject({
            newAmount: 17.99,
            effectiveDate: null,
        });
    });

    it('ignores an email that is not a price change announcement', () => {
        const email = {
            id: 'msg7',
            from: 'Netflix <info@account.netflix.com>',
            subject: 'Your receipt',
            body: 'Thanks for your payment of $15.99 on 1 October 2026.',
            receivedAt: '2026-10-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toBeNull();
    });

    it('ignores a price change email that does not say what the new price is', () => {
        const email = {
            id: 'msg8',
            from: 'Netflix <info@account.netflix.com>',
            subject: 'Your Netflix price is changing',
            body: 'We are changing our prices soon. More details to come.',
            receivedAt: '2026-10-01T09:00:00.000Z',
        };

        expect(parsePriceChangeEmail(email)).toBeNull();
    });
});
