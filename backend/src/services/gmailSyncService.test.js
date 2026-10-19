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
