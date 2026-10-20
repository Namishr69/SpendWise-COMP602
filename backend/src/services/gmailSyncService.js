import gmailAuthService from './gmailAuthService.js';
import gmailConnectionRepo from '../repositories/gmailConnectionRepo.js';
import subscriptionRepo from '../repositories/subscriptionRepo.js';
import transactionRepo from '../repositories/transactionRepo.js';
import gmailConfig from '../config/gmail.js';
import {
  looksLikeReceiptEmail,
  parseReceiptEmail,
} from './gmailEmailParser.js';
import { isRateLimitResponse, mapWithConcurrency, retryOnRateLimit } from './gmailRateLimit.js';

/**
 * Gmail → Firestore sync service.
 *
 * Fetches recent emails from the authenticated user's Gmail inbox, runs each
 * one through the subscription email parser, and upserts the results both as
 * `source: 'gmail-detected'` subscriptions (for the dashboard) AND as
 * `source: 'gmail-detected'` transactions (for the Transactions page) — the
 * same two-output shape as the bank pipeline.
 *
 * Idempotency
 * ───────────
 * Each subscription candidate is identified by a detectionKey of the form
 * `gmail|<merchant>|<billingCycle>`. If a subscription with that key already
 * exists, only the mutable fields (amount, nextPaymentDate) are refreshed —
 * the user's manual edits to name/status are never overwritten.
 *
 * Each parsed email is also recorded as a payment under its subscription,
 * keyed by the Gmail message ID. Re-running the sync against the same inbox
 * snapshot therefore produces no new documents.
 *
 * Data model
 * ──────────
 * Reuses the existing Firestore schema without any migration:
 *
 *   users/{uid}/subscriptions/{subId}
 *     name          string   e.g. "Netflix"
 *     amount        number   latest detected charge
 *     currency      string   "NZD" | "AUD" | "USD"
 *     billingCycle  string   "Monthly" | "Annually" | …
 *     nextPaymentDate string ISO date (estimated from last seen + period)
 *     status        string   "Active"
 *     source        string   "gmail-detected"   ← distinguishes from bank / manual
 *     detectionKey  string   "gmail|Netflix|Monthly"
 *     confidence    number   0–1
 *     createdAt     string   ISO timestamp
 *
 *   users/{uid}/subscriptions/{subId}/payments/{gmailMessageId}
 *     date   string  ISO date of the email
 *     amount number
 */

// How many recent receipt-like messages to fetch per sync.
const MAX_MESSAGES_TO_SCAN = 200;

// Gmail does the subject filtering, so the scan never has to read every inbox
// email just to check its subject. Gmail matches whole words, so the usual
// forms of each word in looksLikeReceiptEmail are listed; that check still
// runs on every message as the final say.
const RECEIPT_SUBJECT_QUERY =
  'subject:(receipt OR receipts OR invoice OR invoices OR payment OR payments OR ' +
  'subscription OR subscriptions OR billing OR renewal OR charge OR charged OR charges OR ' +
  'confirmation OR order OR purchase OR purchased)';

// How many messages are fetched at once. Well under Gmail's per-user limit,
// and retryOnRateLimit covers the odd "slow down".
const CONCURRENT_FETCHES = 5;

// How many receipts a merchant that is NOT a known subscription service needs
// before it is treated as recurring. Two is deliberately low — the user asked
// for repeat receipts from one merchant to surface as a subscription — so the
// receipts must also arrive on a real billing cycle (cycleFromDates) and
// charge about the same amount each time. That keeps a shop you just order
// from often as transactions only.
const MIN_EMAILS_FOR_SUBSCRIPTION = 2;

// How far each receipt may stray from the typical (median) amount and still
// look like the same recurring charge. Allows for a small price change.
const AMOUNT_TOLERANCE = 0.2;

const CADENCE_DAYS = {
  Weekly:      7,
  Fortnightly: 14,
  Monthly:     30,
  Quarterly:   91,
  Annually:    365,
};

/** Authorised GET against the Gmail API, returning parsed JSON. */
async function gmailGet(accessToken, path) {
  const response = await fetch(`${gmailConfig.gmailApiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(
      `Gmail API GET ${path} failed (HTTP ${response.status})${body ? `: ${body}` : ''}`
    );
    error.rateLimited = isRateLimitResponse(response.status, body);
    throw error;
  }

  return response.json();
}

/** Estimate next payment date as last-seen date + cadence period. */
function nextPaymentDate(lastSeenDate, billingCycle) {
  const days = CADENCE_DAYS[billingCycle] || CADENCE_DAYS.Monthly;
  const d = new Date(lastSeenDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Infers a billing cycle from when the receipts actually arrived. Returns null
 * when there is only one receipt, or when the spacing matches no known cadence
 * (two orders three days apart are not a subscription cycle) — the caller then
 * falls back to whatever the email text suggested.
 */
function cycleFromDates(dates) {
  if (dates.length < 2) return null;

  const gaps = [];
  for (let i = 1; i < dates.length; i += 1) {
    gaps.push((new Date(dates[i]) - new Date(dates[i - 1])) / 86_400_000);
  }

  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // ±40% around each nominal period, so a few days' billing drift still matches.
  const hit = Object.entries(CADENCE_DAYS).find(
    ([, days]) => median >= days * 0.6 && median <= days * 1.4
  );

  return hit ? hit[0] : null;
}

/** True when every amount is within AMOUNT_TOLERANCE of the median amount. */
function amountsConsistent(amounts) {
  const sorted = [...amounts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return amounts.every((amount) => Math.abs(amount - median) <= median * AMOUNT_TOLERANCE);
}

/**
 * Receipts from a merchant that is not a known subscription service look like
 * a subscription only when there are enough of them, on a regular cycle, for
 * about the same amount. Two orders a few days apart, or monthly orders of
 * different sizes, are just shopping.
 */
function looksRecurring(receipts) {
  const cycle = cycleFromDates(receipts.map((c) => c.date));
  if (!cycle) return false;

  // Two orders a few days apart would pass as "weekly", and a real weekly or
  // fortnightly charge sends a third receipt soon enough, so wait for it.
  const needed =
    cycle === 'Weekly' || cycle === 'Fortnightly' ? 3 : MIN_EMAILS_FOR_SUBSCRIPTION;

  return receipts.length >= needed && amountsConsistent(receipts.map((c) => c.amount));
}

const gmailSyncService = {
  /**
   * Scan the inbox, parse subscription emails, and upsert results to Firestore.
   *
   * @param {string} userId  Firebase UID of the signed-in user
   * @returns {{ scanned, parsed, created, updated, transactionsSaved, rateLimited }} sync summary
   */
  async syncSubscriptions(userId) {
    // Ensure the user has a connected Gmail account before doing anything.
    const connection = await gmailConnectionRepo.getConnection(userId);
    if (!connection) {
      throw new Error('No Gmail connection found — connect Gmail first.');
    }

    const accessToken = await gmailAuthService.getValidAccessToken(userId);

    // ── Step 1: list recent receipt-like message IDs ───────────────────────
    const query = new URLSearchParams({
      maxResults: String(MAX_MESSAGES_TO_SCAN),
      labelIds: 'INBOX',
      q: RECEIPT_SUBJECT_QUERY,
    });
    const list = await retryOnRateLimit(
      () => gmailGet(accessToken, `/messages?${query}`),
      'inbox list'
    );
    const messageIds = (list.messages || []).map((m) => m.id);

    console.log(
      `[gmail-sync] found ${messageIds.length} possible receipt email(s) for user ${userId}`
    );

    // ── Step 2: fetch and parse the matching messages ──────────────────────
    // Set when Gmail keeps refusing after the retries. No new fetches start
    // after that, and the scan saves what it already found.
    let rateLimited = false;

    const messages = await mapWithConcurrency(messageIds, CONCURRENT_FETCHES, async (id) => {
      if (rateLimited) return null;
      try {
        return await retryOnRateLimit(
          () => gmailGet(accessToken, `/messages/${id}?format=full`),
          `message ${id}`
        );
      } catch (err) {
        console.warn(`Gmail sync: fetch failed for ${id}:`, err.message);
        if (err.rateLimited) rateLimited = true;
        return null;
      }
    });

    const candidates = [];
    let scanned = 0;

    for (const full of messages) {
      if (!full) continue;
      scanned += 1;

      const headers = full.payload?.headers || [];
      const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
      const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';

      if (!looksLikeReceiptEmail(subject)) continue;

      const parsed = parseReceiptEmail(full);
      if (parsed) {
        console.log(
          `[gmail-sync] parsed "${parsed.merchant}" ${parsed.currency} ${parsed.amount} ` +
            `(subscription=${parsed.isSubscriptionMerchant}) ← ${subject}`
        );
        candidates.push(parsed);
      } else {
        console.log(
          `[gmail-sync] subject matched but NOT parsed (needs a $ amount in the body ` +
            `and a nameable sender): "${subject}" from ${from}`
        );
      }
    }

    // ── Step 3: upsert subscriptions ───────────────────────────────────────
    // A known recurring service counts from a single email. Any other merchant
    // has to show up in at least MIN_EMAILS_FOR_SUBSCRIPTION receipts before we
    // call it recurring, so a one-off shop order stays a transaction only while
    // a merchant that bills you repeatedly becomes a subscription.
    const existing = await subscriptionRepo.getAll(userId);
    const byKey = new Map(
      existing
        .filter((s) => s.detectionKey && s.source === 'gmail-detected')
        .map((s) => [s.detectionKey, s])
    );

    let created = 0;
    let updated = 0;

    // Group every candidate by merchant, so repeat receipts from one merchant
    // land in the same bucket regardless of the cycle guessed per email.
    const byMerchant = new Map();
    for (const c of candidates) {
      if (!byMerchant.has(c.merchant)) byMerchant.set(c.merchant, []);
      byMerchant.get(c.merchant).push(c);
    }

    for (const [merchant, group] of byMerchant) {
      const sorted = [...group].sort((a, b) => (a.date < b.date ? -1 : 1));

      // For a known service, only its subscription receipts count, so an Uber
      // One membership is priced from its own receipts and not a food order.
      const subscriptionReceipts = sorted.filter((c) => c.isSubscriptionMerchant);
      const isKnownService = subscriptionReceipts.length > 0;

      if (!isKnownService && !looksRecurring(sorted)) continue;

      const receipts = isKnownService ? subscriptionReceipts : sorted;
      const latest = receipts[receipts.length - 1];

      // With several dated receipts the real spacing beats a keyword guess.
      const billingCycle =
        cycleFromDates(receipts.map((c) => c.date)) || latest.billingCycle;

      const key = `gmail|${merchant}|${billingCycle}`;
      const match = byKey.get(key);
      const estimatedNext = nextPaymentDate(latest.date, billingCycle);

      let subscriptionId;

      if (match) {
        // Refresh only the fields that should track reality automatically.
        await subscriptionRepo.update(userId, match.id, {
          amount: latest.amount,
          nextPaymentDate: estimatedNext,
          // Bump confidence slightly on re-confirmation.
          confidence: Math.min(1, (match.confidence || 0.5) + 0.1),
        });
        subscriptionId = match.id;
        updated += 1;
      } else {
        const sub = await subscriptionRepo.create(userId, {
          name: merchant,
          amount: latest.amount,
          currency: latest.currency,
          billingCycle,
          nextPaymentDate: estimatedNext,
          status: 'Active',
          source: 'gmail-detected',
          detectionKey: key,
          // A repeat-detected merchant is less certain than a known service.
          confidence: isKnownService ? 0.7 : 0.6,
          createdAt: new Date().toISOString(),
        });
        subscriptionId = sub.id;
        byKey.set(key, sub);
        created += 1;
      }

      // Every subscription receipt is a payment, keyed by its Gmail message id
      // so re-syncing the same email updates rather than duplicates it.
      for (const c of receipts) {
        await subscriptionRepo.upsertPayment(
          userId,
          subscriptionId,
          c.gmailMessageId,
          { date: c.date, amount: c.amount }
        );
      }
    }

    // ── Step 4: store each parsed email as a transaction ───────────────────
    // Every receipt is a real payment, so it belongs on the Transactions page
    // too — mirroring how bank data is both stored as transactions and fed to
    // subscription detection. One row per email, keyed by the Gmail message id
    // (prefixed to avoid colliding with manually-added transaction ids) so a
    // re-scan updates rather than duplicates.
    let transactionsSaved = 0;
    for (const candidate of candidates) {
      await transactionRepo.upsertById(userId, `gmail_${candidate.gmailMessageId}`, {
        name: candidate.merchant,
        amount: candidate.amount,
        currency: candidate.currency,
        date: candidate.date,
        category: candidate.isSubscriptionMerchant ? 'Subscription' : 'Purchase',
        source: 'gmail-detected',
        gmailMessageId: candidate.gmailMessageId,
        // Shown on the Transactions page so a row is traceable to its email.
        subject: candidate.subject,
        sender: candidate.sender,
      });
      transactionsSaved += 1;
    }

    console.log(
      `[gmail-sync] done for ${userId}: scanned ${scanned}/${messageIds.length}, parsed ${candidates.length}, ` +
        `subscriptions +${created}/~${updated}, transactions saved ${transactionsSaved}` +
        (rateLimited ? ' (stopped early: Gmail rate limit)' : '')
    );

    return {
      scanned,
      parsed: candidates.length,
      created,
      updated,
      transactionsSaved,
      rateLimited,
    };
  },
};

export default gmailSyncService;
