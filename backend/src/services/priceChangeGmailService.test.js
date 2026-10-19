import { describe, it, expect, vi, afterEach } from 'vitest';
import priceChangeGmailService from './priceChangeGmailService.js';

function respondWith(status, body) {
    globalThis.fetch = vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }));
}

describe('priceChangeGmailService.fetchPriceChangeEmails errors', () => {
    const realFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = realFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('asks the user to connect again when the token has expired', async () => {
        respondWith(401, {});

        await expect(priceChangeGmailService.fetchPriceChangeEmails('token')).rejects.toMatchObject({
            status: 401,
            message: expect.stringMatching(/connect gmail again/i),
        });
    });

    it('tells the user to tick the Gmail permission when it was not granted', async () => {
        respondWith(403, {
            error: { message: 'Request had insufficient authentication scopes.' },
        });

        await expect(priceChangeGmailService.fetchPriceChangeEmails('token')).rejects.toMatchObject({
            status: 403,
            message: expect.stringMatching(/tick the gmail permission/i),
        });
    });

    it('still fails when the message list itself stays rate limited', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        respondWith(429, { error: { message: 'Too many concurrent requests for user.' } });

        const result = priceChangeGmailService.fetchPriceChangeEmails('token');
        const assertion = expect(result).rejects.toMatchObject({ status: 429 });
        await vi.runAllTimersAsync();
        await assertion;
    });

    it("passes Google's message through for other failures", async () => {
        respondWith(403, {
            error: { message: 'Gmail API has not been used in project 123 before or it is disabled.' },
        });

        await expect(priceChangeGmailService.fetchPriceChangeEmails('token')).rejects.toMatchObject({
            status: 502,
            message: expect.stringMatching(/gmail api has not been used/i),
        });
    });
});

describe('priceChangeGmailService.fetchPriceChangeEmails under Gmail rate limits', () => {
    const realFetch = globalThis.fetch;

    function message(id) {
        return {
            id,
            internalDate: String(Date.UTC(2026, 8, 1)),
            payload: {
                mimeType: 'text/plain',
                headers: [
                    { name: 'From', value: 'Netflix <info@account.netflix.com>' },
                    { name: 'Subject', value: 'Your price is changing' },
                ],
                body: { data: Buffer.from('Your new price is $24.99.').toString('base64url') },
            },
        };
    }

    function response(status, body) {
        return { ok: status >= 200 && status < 300, status, json: async () => body };
    }

    const rateLimited = () => response(429, { error: { message: 'Too many concurrent requests for user.' } });

    /** Serves the list and every message; `override(id)` can replace a message's response. */
    function mockGmail(ids, override = () => null) {
        let inFlight = 0;
        const stats = { maxInFlight: 0 };

        globalThis.fetch = vi.fn(async (url) => {
            const id = url.match(/\/messages\/([^?]+)/)?.[1];
            if (!id) return response(200, { messages: ids.map((messageId) => ({ id: messageId })) });

            inFlight += 1;
            stats.maxInFlight = Math.max(stats.maxInFlight, inFlight);
            await Promise.resolve();
            inFlight -= 1;

            return override(id) || response(200, message(id));
        });

        return stats;
    }

    afterEach(() => {
        globalThis.fetch = realFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('fetches only a few messages at a time instead of all of them at once', async () => {
        const ids = Array.from({ length: 12 }, (_, i) => `m${i}`);
        const stats = mockGmail(ids);

        const emails = await priceChangeGmailService.fetchPriceChangeEmails('token');

        expect(emails).toHaveLength(12);
        expect(stats.maxInFlight).toBeLessThanOrEqual(5);
    });

    it('retries a message that hit the rate limit', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        let limited = false;
        mockGmail(['m1', 'm2', 'm3'], (id) => {
            if (id === 'm2' && !limited) {
                limited = true;
                return rateLimited();
            }
            return null;
        });

        const result = priceChangeGmailService.fetchPriceChangeEmails('token');
        await vi.runAllTimersAsync();

        expect((await result).map((email) => email.id)).toEqual(['m1', 'm2', 'm3']);
    });

    it('returns the other emails when one message stays rate limited', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockGmail(['m1', 'm2', 'm3'], (id) => (id === 'm2' ? rateLimited() : null));

        const result = priceChangeGmailService.fetchPriceChangeEmails('token');
        await vi.runAllTimersAsync();

        expect((await result).map((email) => email.id)).toEqual(['m1', 'm3']);
    });
});
