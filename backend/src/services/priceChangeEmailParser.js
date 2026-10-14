/**
 * Reads a provider's "your price is changing" email into an announcement:
 * { id, merchant, currentAmount, newAmount, effectiveDate }. Pure function of
 * the email's sender, subject and plain-text body; returns null for anything
 * that is not a price change or does not say what the new price is.
 */

// Either order: "your price is changing" or "an update to your price".
const PRICE_CHANGE_PATTERNS = [
    /\b(price|pricing|fee|cost)s?\b[^.]{0,60}?\b(chang|increas|going up|ris|updat|adjust)/i,
    /\b(chang|increas|updat|adjust|rais)\w*\b[^.]{0,60}?\b(price|pricing|fee|cost)s?\b/i,
];

// An amount with an optional currency code before the symbol, e.g. NZ$18.99.
const AMOUNT = String.raw`(?:[A-Z]{2,3}\s?)?[$£€]\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)`;
// A billing period after an amount, e.g. "$17.99/month" or "$17.99 per month".
const PERIOD = String.raw`(?:\s*(?:\/|per\s|a\s)\s*(?:month|mo|year|yr|week|wk)\b)?`;
const FROM_TO_PATTERN = new RegExp(String.raw`\bfrom\s+${AMOUNT}${PERIOD}\s+(?:to|→)\s+${AMOUNT}`, 'i');
const NEW_AMOUNT_PATTERN = new RegExp(String.raw`\b(?:to|will be|now)\s+${AMOUNT}`, 'i');

const MONTHS = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_NAME = String.raw`(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)`;
const ORDINAL = String.raw`(?:st|nd|rd|th)?`;

// Each pattern reads a match into { day, month, year }; year may be missing.
const DATE_PATTERNS = [
    {
        // 1 November 2026, 1st Nov
        regex: new RegExp(String.raw`\b(\d{1,2})${ORDINAL}\s+${MONTH_NAME}\b\.?(?:,?\s+(\d{4}))?`, 'gi'),
        read: (m) => ({ day: m[1], month: MONTHS[m[2].slice(0, 3).toLowerCase()], year: m[3] }),
    },
    {
        // November 1, 2026
        regex: new RegExp(String.raw`\b${MONTH_NAME}\.?\s+(\d{1,2})${ORDINAL}\b(?:,?\s+(\d{4}))?`, 'gi'),
        read: (m) => ({ day: m[2], month: MONTHS[m[1].slice(0, 3).toLowerCase()], year: m[3] }),
    },
    {
        // 2026-11-01
        regex: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
        read: (m) => ({ day: m[3], month: m[2], year: m[1] }),
    },
    {
        // 01/11/2026 — day first, as written in NZ
        regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
        read: (m) => ({ day: m[1], month: m[2], year: m[3] }),
    },
];

// Words that introduce the date a new price starts, e.g. "starting 1 Nov".
const EFFECTIVE_HINT = /\b(from|starting|start|beginning|begins|effective|on|as of|after)\b[^.]{0,40}$/i;

// Trailing domain labels that never name the provider, e.g. .co.nz
const DOMAIN_SUFFIXES = new Set(['com', 'co', 'nz', 'au', 'uk', 'net', 'org', 'io', 'tv']);

function toAmount(digits) {
    return Number(digits.replace(/,/g, ''));
}

function toIsoDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date.toISOString().slice(0, 10);
}

/**
 * Reads a date into YYYY-MM-DD. A date with no year ("from 1 February") is the
 * next such date on or after the day the email arrived.
 */
function resolveDate({ day, month, year }, receivedAt) {
    const d = Number(day);
    const m = Number(month);
    if (year) return toIsoDate(Number(year), m, d);

    const received = receivedAt ? new Date(receivedAt) : new Date();
    const receivedIso = received.toISOString().slice(0, 10);
    const thisYear = received.getUTCFullYear();
    const candidate = toIsoDate(thisYear, m, d);
    if (!candidate) return null;
    return candidate >= receivedIso ? candidate : toIsoDate(thisYear + 1, m, d);
}

/**
 * The date the new price takes effect: the first date introduced by a word
 * like "from" or "starting", or failing that the first date in the email.
 */
function findEffectiveDate(text, receivedAt) {
    const found = [];

    for (const { regex, read } of DATE_PATTERNS) {
        for (const match of text.matchAll(regex)) {
            const date = resolveDate(read(match), receivedAt);
            if (date) found.push({ index: match.index, date });
        }
    }

    if (found.length === 0) return null;

    found.sort((a, b) => a.index - b.index);
    const hinted = found.find(({ index }) => EFFECTIVE_HINT.test(text.slice(0, index)));
    return (hinted || found[0]).date;
}

/**
 * The provider's name: the sender's display name ("Netflix" <info@...>), or
 * else the main part of the sender's domain (billing.spotify.com → Spotify).
 */
function findMerchant(from) {
    const sender = String(from || '');

    const displayName = sender.match(/^\s*"?([^"<]*?)"?\s*</);
    if (displayName && displayName[1].trim()) return displayName[1].trim();

    const domain = sender.match(/@([^>\s]+)/);
    if (!domain) return null;

    const labels = domain[1].toLowerCase().split('.');
    while (labels.length > 1 && DOMAIN_SUFFIXES.has(labels[labels.length - 1])) {
        labels.pop();
    }
    const name = labels[labels.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parsePriceChangeEmail(email) {
    const text = `${email.subject || ''}\n${email.body || ''}`;

    if (!PRICE_CHANGE_PATTERNS.some((pattern) => pattern.test(text))) return null;

    let currentAmount = null;
    let newAmount = null;

    const fromTo = text.match(FROM_TO_PATTERN);
    if (fromTo) {
        currentAmount = toAmount(fromTo[1]);
        newAmount = toAmount(fromTo[2]);
    } else {
        const newOnly = text.match(NEW_AMOUNT_PATTERN);
        if (newOnly) newAmount = toAmount(newOnly[1]);
    }

    if (newAmount === null) return null;

    const merchant = findMerchant(email.from);
    if (!merchant) return null;

    return {
        id: email.id,
        merchant,
        currentAmount,
        newAmount,
        effectiveDate: findEffectiveDate(text, email.receivedAt),
    };
}
