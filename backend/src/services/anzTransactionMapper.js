/**
 * Pure transaction-shaping helpers for the ANZ Account Information API.
 *
 * Kept free of I/O and network imports so the mapping — especially the merchant
 * name derivation that subscription detection depends on — can be unit tested.
 * anzAccountService imports mapTransaction from here and does the fetching.
 */

// Realistic merchant catalog used only for ANZ Sandbox mock records, which
// arrive with generic placeholder names. Kept module-level so the list is
// shared by every call rather than rebuilt per transaction.
const SANDBOX_MERCHANTS = [
    'Netflix',
    'Spotify',
    'Neon NZ',
    'Disney+',
    'Spark NZ',
    'Woolworths NZ',
    'Uber Eats',
    'YouTube Premium',
    'Les Mills Gym',
    'Substack',
    'Apple Services',
    'ChatGPT Plus',
];

// Placeholder fragments the ANZ sandbox returns in name fields. Anything
// containing one of these is treated as "no real name" so we fall back to the
// synthetic catalog below.
const GENERIC_SUBSTRINGS = [
    'further details',
    'merchant name that is long',
    'party being paid',
    'party paying',
    'a. creditor',
    'a. debtor',
    'a. cardholder',
    'examplebank',
    'currentaccount',
    'creditorpart',
    'creditorcode',
    'creditorref',
    'debtorpart',
    'debtorcode',
    'debtorref',
];

/** Small stable string hash (same algorithm the sandbox fallback has always used). */
function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/**
 * Derives a human merchant name for a raw ANZ record.
 *
 * Real ANZ data carries a usable name in one of the candidate fields and is
 * returned as-is. ANZ *sandbox* data carries only generic placeholders, so we
 * synthesise a realistic merchant from a catalog.
 *
 * The catalog pick is keyed on the payment AMOUNT, not the transaction id. A
 * recurring payment (e.g. $19.99 every month) has a different, unique id on
 * every charge, so keying on the id scattered one real subscription across many
 * different synthetic names and stopped detection from ever grouping them.
 * Keying on the amount means every charge in a recurring series maps to the
 * same merchant, so the pattern can be recognised and turned into a subscription.
 */
export function extractDisplayName(raw, { amount, index = 0 } = {}) {
    const candidates = [
        raw.TransactionInformation,
        raw.transactionInformation,
        raw.description,
        raw.MerchantDetails?.MerchantName,
        raw.merchantDetails?.merchantName,
        // Direct-debit payee: OBIE carries it as a top-level Name, which the
        // candidate list used to miss entirely, so real payees fell through to
        // the synthetic catalog.
        raw.Name,
        raw.name,
        raw.Reference?.CreditorName,
        raw.Reference?.DebtorName,
        raw.TransactionReference?.CreditorReference?.Particulars,
        raw.TransactionReference?.DebtorReference?.Particulars,
        raw.Reference?.CreditorReference?.Particulars,
        raw.Reference?.DebtorReference?.Particulars,
        raw.CreditorAccount?.Name,
        raw.DebtorAccount?.Name,
        raw.MandateIdentification,
        raw.merchantName,
    ];

    for (const val of candidates) {
        if (typeof val === 'string' && val.trim().length > 0) {
            const trimmed = val.trim();
            const lower = trimmed.toLowerCase();
            const isGeneric = GENERIC_SUBSTRINGS.some((sub) => lower.includes(sub));
            if (!isGeneric) {
                return trimmed;
            }
        }
    }

    // Stable key: the amount (in cents) keeps a recurring series on one merchant.
    // Fall back to an id only when no usable amount is available.
    const stableKey =
        Number.isFinite(amount) && amount >= 0
            ? `amt:${Math.round(amount * 100)}`
            : String(
                  raw.TransactionId ||
                  raw.ScheduledPaymentId ||
                  raw.DirectDebitId ||
                  index
              );

    return SANDBOX_MERCHANTS[hashString(stableKey) % SANDBOX_MERCHANTS.length];
}

/**
 * Classifies a raw ANZ record.
 *
 * ANZ returns two very different things in the same feed: ordinary settled
 * transactions, and records that *declare* themselves recurring — a scheduled
 * payment or a direct debit. A declared record is a single row that always
 * describes a repeating payment, so it must never be held to the
 * multiple-occurrence bar that a plain charge is.
 *
 * Field names follow the OBIE / NZ Banking Data API shape. A record that
 * declares an id but no recurring metadata still classifies as a plain
 * transaction, which is the safe default.
 */
export function classifyRecordType(raw) {
    if (raw.DirectDebitId || raw.directDebitId || raw.MandateIdentification) {
        return 'directDebit';
    }

    if (
        raw.ScheduledPaymentId ||
        raw.scheduledPaymentId ||
        raw.StandingOrderId ||
        raw.standingOrderId
    ) {
        return 'scheduledPayment';
    }

    return 'transaction';
}

/** Pulls the declared frequency string, whatever field the bank put it in. */
function extractFrequency(raw) {
    const value =
        raw.Frequency ||
        raw.frequency ||
        raw.PreviousPaymentFrequency ||
        raw.ScheduledPaymentFrequency;

    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** The next date a declared recurring payment is due, if the bank stated one. */
function extractDeclaredNextDate(raw) {
    return (
        raw.NextPaymentDateTime ||
        raw.nextPaymentDateTime ||
        raw.ScheduledPaymentDateTime ||
        null
    );
}

/** The bank's own id for the mandate / standing arrangement. */
function extractMandateId(raw, recordType) {
    if (recordType === 'directDebit') {
        return raw.DirectDebitId || raw.MandateIdentification || null;
    }

    if (recordType === 'scheduledPayment') {
        return raw.ScheduledPaymentId || raw.StandingOrderId || null;
    }

    return null;
}

/**
 * Flattens one raw ANZ record into the stored transaction shape the UI,
 * Firestore and subscription detection all read.
 */
export function mapTransaction(raw, index = 0) {
    const indicator = String(
        raw.CreditDebitIndicator || raw.creditDebitIndicator || raw.indicator || ''
    ).toLowerCase();

    const amountObj =
        raw.InstructedAmount ||
        raw.PreviousPaymentAmount ||
        raw.Amount ||
        raw.amount;

    let amount = 0;
    let currency = 'NZD';

    if (typeof amountObj === 'object' && amountObj !== null) {
        amount = Number(amountObj.Amount ?? amountObj.amount ?? 0);
        currency = amountObj.Currency || amountObj.currency || 'NZD';
    } else if (typeof amountObj === 'number' || typeof amountObj === 'string') {
        amount = Number(amountObj);
        currency = raw.Currency || raw.currency || 'NZD';
    }

    const absAmount = Math.abs(Number.isFinite(amount) ? amount : 0);

    const recordType = classifyRecordType(raw);

    // Derive the merchant AFTER the amount is known: the sandbox fallback keys
    // the synthetic merchant on the amount so repeated charges of one recurring
    // payment share a name and can be detected as a subscription. Declared
    // records stay amount-keyed too, so a direct debit and the charges it
    // produces resolve to the same merchant and group together rather than
    // appearing twice.
    const displayName = extractDisplayName(raw, { amount: absAmount, index });

    const transactionId =
        raw.TransactionId ||
        raw.ScheduledPaymentId ||
        raw.DirectDebitId ||
        raw.StandingOrderId ||
        raw.StatementId ||
        raw.transactionId ||
        raw.Id ||
        raw.id ||
        `tx-${Date.now()}-${index}`;

    const bookedAt =
        raw.BookingDateTime ||
        raw.ScheduledPaymentDateTime ||
        raw.PreviousPaymentDateTime ||
        raw.ValueDateTime ||
        raw.TransactionDateTime ||
        raw.BookingDate ||
        raw.Date ||
        new Date().toISOString();

    return {
        transactionId,
        amount: absAmount,
        currency,
        // Declared records carry no CreditDebitIndicator, so they default to
        // 'debit' — which is what we want for an outgoing arrangement, and what
        // lets them through detection's outgoing-only filter.
        direction: indicator.includes('credit') ? 'credit' : 'debit',
        merchant: displayName,
        description: displayName,
        bookedAt,
        // Recurring metadata. Present on every record so stored transactions are
        // self-describing: 'transaction' records are ordinary spending, the
        // others declare a repeating payment.
        recordType,
        frequency: extractFrequency(raw),
        declaredNextDate: extractDeclaredNextDate(raw),
        mandateId: extractMandateId(raw, recordType),
    };
}

export default { extractDisplayName, classifyRecordType, mapTransaction };
