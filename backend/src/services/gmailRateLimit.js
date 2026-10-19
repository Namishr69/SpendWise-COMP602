/**
 * Helpers that keep Gmail scans under the per-user rate limit.
 *
 * Gmail answers a request over the limit with HTTP 429 (or 403 with a
 * rateLimitExceeded reason). The callers' gmailGet functions mark those errors
 * with `rateLimited = true`; retryOnRateLimit waits and tries again, and
 * mapWithConcurrency stops a scan firing every request at once.
 */

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;

/** True when a failed Gmail response means "slow down" rather than a real error. */
export function isRateLimitResponse(status, body) {
  if (status === 429) return true;
  return status === 403 && /rateLimitExceeded|userRateLimitExceeded/i.test(body || '');
}

/**
 * Runs `request`, retrying with exponential backoff (1s, 2s, 4s, 8s plus
 * jitter) while it fails with a rate limit. Any other error, or a rate limit
 * that outlasts the retries, is rethrown.
 */
export async function retryOnRateLimit(request, label = 'request') {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!error.rateLimited || attempt > MAX_RETRIES) throw error;

      const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * BASE_DELAY_MS;
      console.warn(
        `[gmail] rate limit hit on ${label}, retrying in ${Math.round(delay)}ms ` +
          `(retry ${attempt}/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Like Promise.all(items.map(fn)) but with at most `limit` calls running at
 * once. Results keep the order of `items`.
 */
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
