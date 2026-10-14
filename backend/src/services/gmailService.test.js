import { describe, it, expect, vi, afterEach } from 'vitest';
import gmailService from './gmailService.js';

function respondWith(status, body) {
    globalThis.fetch = vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }));
}

describe('gmailService.fetchPriceChangeEmails errors', () => {
    const realFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = realFetch;
    });

    it('asks the user to connect again when the token has expired', async () => {
        respondWith(401, {});

        await expect(gmailService.fetchPriceChangeEmails('token')).rejects.toMatchObject({
            status: 401,
            message: expect.stringMatching(/connect gmail again/i),
        });
    });

    it('tells the user to tick the Gmail permission when it was not granted', async () => {
        respondWith(403, {
            error: { message: 'Request had insufficient authentication scopes.' },
        });

        await expect(gmailService.fetchPriceChangeEmails('token')).rejects.toMatchObject({
            status: 403,
            message: expect.stringMatching(/tick the gmail permission/i),
        });
    });

    it("passes Google's message through for other failures", async () => {
        respondWith(403, {
            error: { message: 'Gmail API has not been used in project 123 before or it is disabled.' },
        });

        await expect(gmailService.fetchPriceChangeEmails('token')).rejects.toMatchObject({
            status: 502,
            message: expect.stringMatching(/gmail api has not been used/i),
        });
    });
});
