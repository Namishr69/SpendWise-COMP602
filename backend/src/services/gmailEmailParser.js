/**
 * Parses a single Gmail message object (from the Gmail REST API) into a
 * structured receipt candidate, or returns null if the message does not look
 * like a purchase/order/receipt.
 *
 * Design intent
 * ─────────────
 * This is a pure function of the raw Gmail API message object — no I/O.
 * That makes it trivial to unit-test with fixture data and easy to extend with
 * new patterns without touching any database or network code.
 *
 * A candidate needs a positive money amount AND a nameable merchant AND a date,
 * so partial results are discarded (returns null) and the sync layer never
 * writes junk. The merchant comes from a known-subscription-service allowlist
 * when possible (canonical label, and `isSubscriptionMerchant: true`), else
 * from the sender's display name / domain — so a one-off order from any store
 * still becomes a transaction, just not a subscription.
 *
 * Billing-cycle detection is best-effort: the subject/body is scanned for
 * period keywords; if none match we default to 'Monthly' (only used when the
 * candidate is treated as a subscription).
 */

// ── Header helpers ──────────────────────────────────────────────────────────

/** Case-insensitive header lookup on a Gmail payload.headers array. */
function header(headers, name) {
  const match = (headers || []).find(
    (h) => h.name && h.name.toLowerCase() === name.toLowerCase()
  );
  return match ? match.value : null;
}

// ── Text extraction ─────────────────────────────────────────────────────────

/**
 * Recursively walks a Gmail message payload tree and returns the concatenated
 * plain-text body (decoded from base64url). We prefer text/plain; text/html is
 * stripped to just its printable characters as a fallback.
 */
function extractBody(payload) {
  if (!payload) return '';

  // Leaf part with inline data.
  if (payload.body && payload.body.data) {
    const raw = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    if (payload.mimeType === 'text/html') {
      // Strip tags — keep only printable runs so amounts/dates are still found.
      return decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    }
    return decoded;
  }

  // Multipart: walk children and prefer plain text.
  if (payload.parts && payload.parts.length > 0) {
    const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plain) return extractBody(plain);

    // Collect all parts and concatenate.
    return payload.parts.map(extractBody).join(' ');
  }

  return '';
}

// ── Merchant extraction ─────────────────────────────────────────────────────

/**
 * Subscription-confirmation sender patterns.
 * Each entry maps a domain fragment to a clean merchant label.
 * The list is ordered longest-first so more-specific domains win.
 */
const SENDER_PATTERNS = [
  { pattern: /netflix/i,          label: 'Netflix' },
  { pattern: /spotify/i,          label: 'Spotify' },
  { pattern: /disneyplus|disney\+/i, label: 'Disney+' },
  { pattern: /youtube/i,          label: 'YouTube Premium' },
  { pattern: /apple/i,            label: 'Apple' },
  { pattern: /microsoft|office/i, label: 'Microsoft 365' },
  { pattern: /adobe/i,            label: 'Adobe' },
  { pattern: /dropbox/i,          label: 'Dropbox' },
  { pattern: /notion/i,           label: 'Notion' },
  { pattern: /canva/i,            label: 'Canva' },
  { pattern: /slack/i,            label: 'Slack' },
  { pattern: /zoom/i,             label: 'Zoom' },
  { pattern: /github/i,           label: 'GitHub' },
  { pattern: /audible/i,          label: 'Audible' },
  { pattern: /substack/i,         label: 'Substack' },
  { pattern: /patreon/i,          label: 'Patreon' },
  { pattern: /amazon/i,           label: 'Amazon' },
  { pattern: /playstation|psn/i,  label: 'PlayStation Plus' },
  { pattern: /xbox|game\s*pass/i, label: 'Xbox / Game Pass' },
  { pattern: /nintendo/i,         label: 'Nintendo Switch Online' },
  { pattern: /steam/i,            label: 'Steam' },
  { pattern: /twitch/i,           label: 'Twitch' },
  { pattern: /paramount/i,        label: 'Paramount+' },
  { pattern: /neon/i,             label: 'Neon NZ' },
  { pattern: /spark/i,            label: 'Spark NZ' },
  { pattern: /sky\s*(tv|sport|nz)/i, label: 'Sky TV NZ' },
  { pattern: /lesmills|les mills/i, label: 'Les Mills' },
  { pattern: /uber/i,             label: 'Uber' },
];

/** Derive a merchant label from the From header, or null if unrecognised. */
function merchantFromSender(from) {
  if (!from) return null;
  for (const { pattern, label } of SENDER_PATTERNS) {
    if (pattern.test(from)) return label;
  }
  return null;
}

/** Title-cases a raw label: "URBAN THREADS" / "urban threads" → "Urban Threads". */
function titleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim();
}

// Second-level labels that are part of a public suffix (co.nz, com.au, org.uk…)
// rather than the business name.
const PUBLIC_SLD = new Set(['co', 'com', 'org', 'net', 'ac', 'govt', 'gov', 'gen']);

/** Business label from a domain: mail.urbanthreads.co.nz → "urbanthreads". */
function domainMerchant(domain) {
  const labels = String(domain).toLowerCase().split('.').filter(Boolean);
  if (labels.length === 0) return null;

  let idx = labels.length - 2; // the label just before the TLD
  // Step past a two-part suffix like ".co.nz" / ".com.au".
  if (
    labels.length >= 3 &&
    labels[labels.length - 1].length === 2 &&
    PUBLIC_SLD.has(labels[labels.length - 2])
  ) {
    idx = labels.length - 3;
  }
  return labels[idx] || labels[0];
}

/**
 * Fallback merchant name for a sender that is NOT a known subscription service.
 * Prefers the From header's display name ("URBAN THREADS <orders@…>" → "Urban
 * Threads"); otherwise derives one from the email domain. Null if nothing
 * usable is present (e.g. an empty/garbled From).
 */
function merchantFromSenderName(from) {
  if (!from) return null;

  // "Display Name <local@domain>" — the display name is the best label.
  const display = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (display && display[1].trim()) {
    return titleCase(display[1]);
  }

  // Bare address — fall back to the domain's business label.
  const email = from.match(/([^<>\s@]+)@([^<>\s]+)/);
  if (email) {
    const core = domainMerchant(email[2]);
    if (core) return titleCase(core);
  }

  return null;
}

/** Just the address part of a From header: "Shop <a@b.co.nz>" → "a@b.co.nz". */
function senderEmail(from) {
  const match = String(from || '').match(/([^<>\s@]+@[^<>\s]+)/);
  return match ? match[1].replace(/[>,;]+$/, '') : null;
}

// Merchant phrases that commonly appear in receipt subjects. Each capture class
// deliberately excludes - : # so it stops before trailing reference numbers
// ("… URBAN THREADS - Order Number: UT-36482").
const SUBJECT_MERCHANT_PATTERNS = [
  /\b(?:order|receipt|invoice|purchase)\s+from\s+([A-Za-z0-9&'. ]{2,40})/i,
  /\bpayment\s+to\s+([A-Za-z0-9&'. ]{2,40})/i,
  /\byour\s+([A-Za-z0-9&'. ]{2,40}?)\s+(?:receipt|invoice|order|subscription|payment|membership|plan|renewal)\b/i,
  /^([A-Za-z0-9&'. ]{2,40}?)\s+(?:order\s+confirmation|tax\s+invoice|receipt|invoice)\b/i,
];

// Captures that are grammar rather than a business name.
const SUBJECT_STOPWORDS = new Set([
  'the', 'your', 'our', 'a', 'an', 'this', 'new', 'latest',
  'order', 'payment', 'receipt', 'invoice', 'purchase', 'subscription',
]);

/**
 * Merchant name taken from the subject line. Often the most reliable source —
 * "Your order from URBAN THREADS - Order Number: UT-36482" names the merchant
 * even when the sender is a generic bulk mailer (shopifyemail.com, mailgun…)
 * or the receipt was forwarded, where the From header would name the wrong
 * party and collapse unrelated merchants together.
 */
function merchantFromSubject(subject) {
  if (!subject) return null;

  for (const pattern of SUBJECT_MERCHANT_PATTERNS) {
    const match = subject.match(pattern);
    if (!match) continue;

    const raw = match[1]
      .replace(/\s+/g, ' ')
      .replace(/^the\s+/i, '')
      .trim();

    if (raw.length < 2) continue;
    if (SUBJECT_STOPWORDS.has(raw.toLowerCase())) continue;

    return titleCase(raw);
  }

  return null;
}

// ── Amount extraction ────────────────────────────────────────────────────────

/**
 * Scans `text` for the money amount that was actually charged.
 * Returns a positive number or null.
 *
 * Accepted formats (case-insensitive):
 *   $12.99   NZ$12.99   NZD 12.99   AU$12.99   AUD 12.99   USD 12.99
 *   $1,299.00                      (thousands separators)
 *
 * Picking the right amount matters as much as finding one. A receipt usually
 * contains several: line items, GST, a discount, a loyalty balance. The
 * selection rules below prefer a labelled total, then ignore anything that
 * reads as marketing, and only then fall back to the largest figure.
 */
const AMOUNT_RE =
  /(?:NZ\$|AU\$|US\$|NZD|AUD|USD|\$)\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d{1,6}(?:\.\d{2})?)/gi;

// Marks an amount as the real charge. "subtotal" and "sub-total" are excluded
// by the lookbehind, since the subtotal is not what left the account.
const TOTAL_CONTEXT_RE =
  /\b(?:(?<!sub[\s-]?)total|amount\s+(?:paid|due|charged)|you\s+paid|charged|payment\s+of)\b/i;

// Marks an amount as a discount, credit or marketing figure rather than a charge.
const PROMO_CONTEXT_RE =
  /\b(?:save|saved|saving|savings|discount|coupon|voucher|credit|rrp|worth|earn|off|was|up\s+to)\b/i;

// How much text before an amount counts as its label.
const CONTEXT_WINDOW = 30;

function extractAmount(text) {
  const found = [];
  let match;
  AMOUNT_RE.lastIndex = 0;

  while ((match = AMOUNT_RE.exec(text)) !== null) {
    // Thousands separators have to come out before parsing, or "$1,299.00"
    // would read as 1.
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) continue;

    const before = text.slice(
      Math.max(0, match.index - CONTEXT_WINDOW),
      match.index
    );

    found.push({
      value,
      isTotal: TOTAL_CONTEXT_RE.test(before),
      isPromo: PROMO_CONTEXT_RE.test(before),
    });
  }

  if (found.length === 0) return null;

  const largest = (list) =>
    list.reduce((a, b) => (b.value > a.value ? b : a)).value;

  // 1. A labelled total is the charge, whatever its size.
  const totals = found.filter((a) => a.isTotal && !a.isPromo);
  if (totals.length > 0) return largest(totals);

  // 2. Otherwise ignore marketing figures, so "Save $500 on your next order!
  //    Total: $49.99" cannot record $500.
  const genuine = found.filter((a) => !a.isPromo);
  if (genuine.length > 0) return largest(genuine);

  // 3. Everything read as promotional — fall back rather than drop a receipt
  //    we would previously have captured.
  return largest(found);
}

// ── Date extraction ──────────────────────────────────────────────────────────

/**
 * Parse the RFC 2822 Date header into an ISO date string (YYYY-MM-DD).
 * Falls back to today on any parse failure — a subscription confirmed today
 * is better than no record at all.
 */
function extractDate(dateHeader) {
  if (dateHeader) {
    const d = new Date(dateHeader);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

// ── Billing-cycle detection ──────────────────────────────────────────────────

const CYCLE_PATTERNS = [
  { cycle: 'Weekly',      re: /\bweekly\b/i },
  { cycle: 'Fortnightly', re: /\bfortnightly\b|\bevery\s+2\s+weeks\b/i },
  { cycle: 'Quarterly',   re: /\bquarterly\b|\bevery\s+3\s+months\b/i },
  { cycle: 'Annually',    re: /\bannual(ly)?\b|\byearly\b|\bper\s+year\b/i },
  { cycle: 'Monthly',     re: /\bmonthly\b|\bper\s+month\b|\bmonth\b/i },
];

/** Scan `text` for billing-cycle keywords; defaults to Monthly. */
function detectBillingCycle(text) {
  for (const { cycle, re } of CYCLE_PATTERNS) {
    if (re.test(text)) return cycle;
  }
  return 'Monthly';
}

// ── Subject filter ───────────────────────────────────────────────────────────

/**
 * Quickly checks whether a message subject looks like a receipt / order /
 * payment email. Checked before fetching the full body so we don't download
 * thousands of irrelevant messages. Broad on purpose (it includes "order" and
 * "purchase"): the real gate is the body having a parseable amount.
 */
const RECEIPT_SUBJECT_RE =
  /receipt|invoice|payment|subscription|billing|renewal|charge|confirmation|\border\b|purchase/i;

export function looksLikeReceiptEmail(subject) {
  return RECEIPT_SUBJECT_RE.test(subject || '');
}

// ── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse one Gmail API message object (full format) into a receipt candidate,
 * or return null when it can't be confidently parsed.
 *
 * A candidate is produced whenever the message has a parseable money amount AND
 * a nameable merchant — so it covers any store's order/receipt, not just known
 * subscription services. `isSubscriptionMerchant` flags the known-service case
 * so the sync layer knows whether to also treat it as a subscription.
 *
 * @param {object} message  Raw Gmail REST API message (format=full)
 * @returns {{ merchant, amount, currency, date, billingCycle, gmailMessageId, isSubscriptionMerchant, subject, sender } | null}
 */
export function parseReceiptEmail(message) {
  const headers = message.payload?.headers || [];
  const from    = header(headers, 'From') || '';
  const subject = header(headers, 'Subject') || '';
  const dateHdr = header(headers, 'Date') || '';

  // Extract body text for amount + cycle detection.
  const bodyText = extractBody(message.payload);
  const searchText = `${subject} ${bodyText}`;

  const amount = extractAmount(searchText);
  if (!amount) return null; // No parseable charge amount — not a spend we can record.

  // Known subscription services get a canonical label and feed subscription
  // detection; any other sender still becomes a transaction, labelled from the
  // sender's display name / domain.
  const knownMerchant = merchantFromSender(from);
  const merchant =
    knownMerchant || merchantFromSubject(subject) || merchantFromSenderName(from);
  if (!merchant) return null; // Couldn't name the merchant at all — skip.

  const date         = extractDate(dateHdr);
  const billingCycle = detectBillingCycle(searchText);

  // Currency: prefer an explicit NZD/AUD/USD tag if present, else NZD (our
  // default since SpendWise is NZ-focused).
  const currencyMatch = searchText.match(/\b(NZD|AUD|USD)\b/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : 'NZD';

  return {
    merchant,
    amount: Number(amount.toFixed(2)),
    currency,
    date,
    billingCycle,
    gmailMessageId: message.id,
    isSubscriptionMerchant: Boolean(knownMerchant),
    // Kept for display: the subject usually names the merchant more precisely
    // than the sender does ("Your order from URBAN THREADS - Order UT-36482"),
    // and the address lets a user verify where a row came from.
    subject: subject || null,
    sender: senderEmail(from),
  };
}
