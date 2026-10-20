import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./gmailAuthService.js', () => ({ default: { getValidAccessToken: vi.fn() } }));
vi.mock('../repositories/gmailConnectionRepo.js', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('../repositories/subscriptionRepo.js', () => ({
    default: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), upsertPayment: vi.fn() },
}));
vi.mock('../repositories/transactionRepo.js', () => ({ default: { upsertById: vi.fn() } }));

import gmailAuthService from './gmailAuthService.js';
import gmailConnectionRepo from '../repositories/gmailConnectionRepo.js';
import subscriptionRepo from '../repositories/subscriptionRepo.js';
import transactionRepo from '../repositories/transactionRepo.js';
import gmailSyncService from './gmailSyncService.js';

function netflixReceipt(id) {
    return {
        id,
        payload: {
            mimeType: 'text/plain',
            headers: [
                { name: 'Subject', value: 'Your Netflix receipt' },
                { name: 'From', value: 'Netflix <info@account.netflix.com>' },
                { name: 'Date', value: 'Tue, 1 Sep 2026 10:00:00 +1200' },
            ],
            body: { data: Buffer.from('Total charged: $22.99 NZD per month').toString('base64url') },
        },
    };
}

function respond(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    };
}

const rateLimited = () =>
    respond(429, { error: { code: 429, message: 'Too many concurrent requests for user.' } });

/**
 * Serves the inbox list plus each message; `override(path)` can return a
 * response to use instead, e.g. a rate limit for one message.
 */
function mockGmail(ids, override = () => null) {
    let inFlight = 0;
    const stats = { maxInFlight: 0 };

    globalThis.fetch = vi.fn(async (url) => {
        const path = url.replace('https://gmail.googleapis.com/gmail/v1/users/me', '');
        if (path.startsWith('/messages?')) {
            return override(path) || respond(200, { messages: ids.map((id) => ({ id })) });
        }

        inFlight += 1;
        stats.maxInFlight = Math.max(stats.maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;

        const id = path.match(/^\/messages\/([^?]+)/)[1];
        return override(path) || respond(200, netflixReceipt(id));
    });

    return stats;
}

function requestedPaths() {
    return globalThis.fetch.mock.calls.map(([url]) => url);
}

describe('gmailSyncService.syncSubscriptions under Gmail rate limits', () => {
    const realFetch = globalThis.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        gmailConnectionRepo.getConnection.mockResolvedValue({ connected: true });
        gmailAuthService.getValidAccessToken.mockResolvedValue('token');
        subscriptionRepo.getAll.mockResolvedValue([]);
        subscriptionRepo.create.mockImplementation(async (userId, data) => ({ id: 'sub1', ...data }));
    });

    afterEach(() => {
        globalThis.fetch = realFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    async function sync() {
        const result = gmailSyncService.syncSubscriptions('user1');
        await vi.runAllTimersAsync();
        return result;
    }

    it('retries a message that hit the rate limit instead of dropping its subscription', async () => {
        let limited = false;
        mockGmail(['m1'], (path) => {
            if (path.startsWith('/messages/m1?') && !limited) {
                limited = true;
                return rateLimited();
            }
            return null;
        });

        const result = await sync();

        expect(subscriptionRepo.create).toHaveBeenCalledWith(
            'user1',
            expect.objectContaining({ name: 'Netflix', source: 'gmail-detected' })
        );
        expect(result.created).toBe(1);
    });

    it('asks Gmail to search for receipts instead of checking every inbox email', async () => {
        mockGmail(['m1']);

        await sync();

        const [listUrl] = requestedPaths();
        expect(new URL(listUrl).searchParams.get('q')).toMatch(/subject:\(.*receipt.*\)/);
        expect(requestedPaths().some((url) => url.includes('format=metadata'))).toBe(false);
    });

    it('fetches several receipts at once, but no more than 5', async () => {
        const ids = Array.from({ length: 12 }, (_, i) => `m${i}`);
        const stats = mockGmail(ids);

        const result = await sync();

        expect(result.parsed).toBe(12);
        expect(stats.maxInFlight).toBeGreaterThan(1);
        expect(stats.maxInFlight).toBeLessThanOrEqual(5);
    });

    it('saves what it already found when the rate limit does not clear', async () => {
        const ids = Array.from({ length: 10 }, (_, i) => `m${i + 1}`);
        mockGmail(ids, (path) =>
            path.startsWith('/messages/') && !path.startsWith('/messages/m1?') ? rateLimited() : null
        );

        const result = await sync();

        expect(subscriptionRepo.create).toHaveBeenCalledWith(
            'user1',
            expect.objectContaining({ name: 'Netflix' })
        );
        expect(transactionRepo.upsertById).toHaveBeenCalledWith('user1', 'gmail_m1', expect.any(Object));
        expect(result).toMatchObject({ created: 1, scanned: 1, rateLimited: true });
        // Once Gmail keeps refusing, later messages are not requested at all.
        expect(requestedPaths().some((url) => url.includes('/messages/m10'))).toBe(false);
    });
});

function email({ id, from, subject, date, body }) {
    return {
        id,
        payload: {
            mimeType: 'text/plain',
            headers: [
                { name: 'Subject', value: subject },
                { name: 'From', value: from },
                { name: 'Date', value: `${date} 10:00:00 +1200` },
            ],
            body: { data: Buffer.from(body).toString('base64url') },
        },
    };
}

/** Serves exactly these messages as the inbox. */
function mockInbox(messages) {
    const byId = new Map(messages.map((m) => [m.id, m]));

    globalThis.fetch = vi.fn(async (url) => {
        const path = url.replace('https://gmail.googleapis.com/gmail/v1/users/me', '');
        if (path.startsWith('/messages?')) {
            return respond(200, { messages: messages.map((m) => ({ id: m.id })) });
        }
        const id = path.match(/^\/messages\/([^?]+)/)[1];
        return respond(200, byId.get(id));
    });
}

const UBER = 'Uber Receipts <noreply@uber.com>';
const SHOP = 'Urban Threads <orders@urbanthreads.co.nz>';

const uberEats = (id, date, amount) =>
    email({ id, from: UBER, subject: 'Your Uber Eats order receipt', date, body: `Total $${amount}` });

const shopOrder = (id, date, amount) =>
    email({ id, from: SHOP, subject: 'Your order from URBAN THREADS', date, body: `Order total $${amount}` });

describe('gmailSyncService.syncSubscriptions telling subscriptions from regular purchases', () => {
    const realFetch = globalThis.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        gmailConnectionRepo.getConnection.mockResolvedValue({ connected: true });
        gmailAuthService.getValidAccessToken.mockResolvedValue('token');
        subscriptionRepo.getAll.mockResolvedValue([]);
        subscriptionRepo.create.mockImplementation(async (userId, data) => ({ id: 'sub1', ...data }));
    });

    afterEach(() => {
        globalThis.fetch = realFetch;
        vi.restoreAllMocks();
    });

    const created = () => subscriptionRepo.create.mock.calls.map(([, data]) => data);

    it('keeps Uber Eats orders as transactions, not a subscription', async () => {
        mockInbox([uberEats('u1', '3 Sep 2026', '32.50'), uberEats('u2', '10 Sep 2026', '18.20')]);

        const result = await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([]);
        expect(result.transactionsSaved).toBe(2);
    });

    it('still picks up an Uber One membership from one receipt', async () => {
        mockInbox([
            email({
                id: 'one',
                from: UBER,
                subject: 'Your Uber One membership receipt',
                date: '1 Sep 2026',
                body: 'Total $14.99 per month',
            }),
        ]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([expect.objectContaining({ name: 'Uber', amount: 14.99 })]);
    });

    it('prices an Uber One membership from its own receipts, not from a food order', async () => {
        mockInbox([
            email({
                id: 'one',
                from: UBER,
                subject: 'Your Uber One membership receipt',
                date: '1 Sep 2026',
                body: 'Total $14.99 per month',
            }),
            uberEats('u1', '20 Sep 2026', '45.00'),
        ]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([expect.objectContaining({ name: 'Uber', amount: 14.99 })]);
    });

    it('ignores two orders from a shop a few days apart', async () => {
        mockInbox([shopOrder('s1', '1 Sep 2026', '40.00'), shopOrder('s2', '6 Sep 2026', '40.00')]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([]);
    });

    it('ignores monthly orders from a shop when the amounts are different', async () => {
        mockInbox([shopOrder('s1', '1 Aug 2026', '25.00'), shopOrder('s2', '1 Sep 2026', '80.00')]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([]);
    });

    it('detects a shop that charges the same amount every month', async () => {
        mockInbox([
            shopOrder('s1', '1 Jul 2026', '15.00'),
            shopOrder('s2', '1 Aug 2026', '15.00'),
            shopOrder('s3', '1 Sep 2026', '15.00'),
        ]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([
            expect.objectContaining({ amount: 15, billingCycle: 'Monthly' }),
        ]);
    });

    it('detects a weekly charge once it has three receipts', async () => {
        mockInbox([
            shopOrder('w1', '1 Sep 2026', '9.00'),
            shopOrder('w2', '8 Sep 2026', '9.00'),
            shopOrder('w3', '15 Sep 2026', '9.00'),
        ]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([
            expect.objectContaining({ amount: 9, billingCycle: 'Weekly' }),
        ]);
    });

    it('does not mistake a sender with "office" in its name for Microsoft 365', async () => {
        mockInbox([
            email({
                id: 't1',
                from: 'Ticket Office <tickets@ticketoffice.co.nz>',
                subject: 'Your ticket order confirmation',
                date: '1 Sep 2026',
                body: 'Total $60.00',
            }),
        ]);

        await gmailSyncService.syncSubscriptions('user1');

        expect(created()).toEqual([]);
    });
});
