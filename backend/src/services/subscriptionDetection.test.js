import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detectRecurring, frequencyToCycle } from './subscriptionDetection.js';
import { mapTransaction } from './anzTransactionMapper.js';

/** A stored-shape debit, the output of mapTransaction. */
function debit({ merchant, amount, bookedAt, recordType = 'transaction' }) {
    return {
        transactionId: `${merchant}-${bookedAt}`,
        amount,
        currency: 'NZD',
        direction: 'debit',
        merchant,
        description: merchant,
        bookedAt,
        recordType,
    };
}

test('three monthly charges of the same amount become one subscription', () => {
    const txns = [
        debit({ merchant: 'Netflix', amount: 19.99, bookedAt: '2025-01-15T00:00:00.000Z' }),
        debit({ merchant: 'Netflix', amount: 19.99, bookedAt: '2025-02-14T00:00:00.000Z' }),
        debit({ merchant: 'Netflix', amount: 19.99, bookedAt: '2025-03-16T00:00:00.000Z' }),
    ];

    const candidates = detectRecurring(txns);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, 'Netflix');
    assert.equal(candidates[0].billingCycle, 'Monthly');
    assert.equal(candidates[0].amount, 19.99);
    assert.ok(candidates[0].nextPaymentDate);
    assert.ok(candidates[0].detectionKey);
});

test('two charges on a cadence are enough to infer a subscription', () => {
    // The threshold is 2: a subscription with only one billing cycle of history
    // should still surface. (This test used to assert the opposite at 3.)
    const txns = [
        debit({ merchant: 'Spotify', amount: 14.99, bookedAt: '2025-01-10T00:00:00.000Z' }),
        debit({ merchant: 'Spotify', amount: 14.99, bookedAt: '2025-02-10T00:00:00.000Z' }),
    ];

    const candidates = detectRecurring(txns);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].billingCycle, 'Monthly');
});

test('a single charge with no cadence is still not a subscription', () => {
    const txns = [
        debit({ merchant: 'Corner Store', amount: 8.5, bookedAt: '2025-01-02T00:00:00.000Z' }),
    ];
    assert.equal(detectRecurring(txns).length, 0);
});

test('incoming credits are never treated as subscriptions', () => {
    const txns = [
        { ...debit({ merchant: 'Payroll', amount: 2500, bookedAt: '2025-01-01T00:00:00.000Z' }), direction: 'credit' },
        { ...debit({ merchant: 'Payroll', amount: 2500, bookedAt: '2025-02-01T00:00:00.000Z' }), direction: 'credit' },
        { ...debit({ merchant: 'Payroll', amount: 2500, bookedAt: '2025-03-01T00:00:00.000Z' }), direction: 'credit' },
    ];
    assert.equal(detectRecurring(txns).length, 0);
});

test('charges with no regular cadence are not a subscription', () => {
    const txns = [
        debit({ merchant: 'Corner Store', amount: 8.5, bookedAt: '2025-01-02T00:00:00.000Z' }),
        debit({ merchant: 'Corner Store', amount: 8.5, bookedAt: '2025-01-05T00:00:00.000Z' }),
        debit({ merchant: 'Corner Store', amount: 8.5, bookedAt: '2025-03-20T00:00:00.000Z' }),
    ];
    assert.equal(detectRecurring(txns).length, 0);
});

test('a weekly cadence is classified as Weekly', () => {
    const txns = [
        debit({ merchant: 'Gym', amount: 25, bookedAt: '2025-01-06T00:00:00.000Z' }),
        debit({ merchant: 'Gym', amount: 25, bookedAt: '2025-01-13T00:00:00.000Z' }),
        debit({ merchant: 'Gym', amount: 25, bookedAt: '2025-01-20T00:00:00.000Z' }),
        debit({ merchant: 'Gym', amount: 25, bookedAt: '2025-01-27T00:00:00.000Z' }),
    ];
    const candidates = detectRecurring(txns);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].billingCycle, 'Weekly');
});

test('end to end: raw ANZ sandbox records are detected as a subscription', () => {
    // The real failure the user reported: ANZ sandbox records carry generic
    // names and unique ids per charge. We map each raw record exactly as
    // anzAccountService does, then run detection — and must get one subscription.
    const rawRecords = [
        {
            TransactionInformation: 'Further Details about this payment',
            CreditDebitIndicator: 'Debit',
            InstructedAmount: { Amount: '19.99', Currency: 'NZD' },
            TransactionId: 'anz-0001',
            BookingDateTime: '2025-01-15T00:00:00.000Z',
        },
        {
            TransactionInformation: 'Further Details about this payment',
            CreditDebitIndicator: 'Debit',
            InstructedAmount: { Amount: '19.99', Currency: 'NZD' },
            TransactionId: 'anz-0002',
            BookingDateTime: '2025-02-14T00:00:00.000Z',
        },
        {
            TransactionInformation: 'Further Details about this payment',
            CreditDebitIndicator: 'Debit',
            InstructedAmount: { Amount: '19.99', Currency: 'NZD' },
            TransactionId: 'anz-0003',
            BookingDateTime: '2025-03-16T00:00:00.000Z',
        },
    ];

    const mapped = rawRecords.map((raw, i) => mapTransaction(raw, i));

    // All three must have landed on the same merchant for detection to work.
    assert.equal(mapped[0].merchant, mapped[1].merchant);
    assert.equal(mapped[1].merchant, mapped[2].merchant);

    const candidates = detectRecurring(mapped);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].billingCycle, 'Monthly');
    assert.equal(candidates[0].amount, 19.99);
});

// --- Declared recurring records -------------------------------------------
// A scheduled payment or direct debit is a single record that states it
// recurs. It can never reach an occurrence threshold, which is why these used
// to be dropped entirely.

test('a single direct debit becomes a subscription on its own', () => {
    const mapped = mapTransaction({
        DirectDebitId: 'dd-1',
        Name: 'Vector Power',
        Frequency: 'Monthly',
        PreviousPaymentAmount: { Amount: '145.00', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-03-05T00:00:00.000Z',
        NextPaymentDateTime: '2025-04-05T00:00:00.000Z',
    });

    const candidates = detectRecurring([mapped]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, 'Vector Power');
    assert.equal(candidates[0].billingCycle, 'Monthly');
    assert.equal(candidates[0].amount, 145);
    // The bank's own next-date wins over a computed one.
    assert.equal(candidates[0].nextPaymentDate, '2025-04-05');
    assert.equal(candidates[0].source, 'declared');
});

test('a scheduled payment with a weekly frequency is detected as weekly', () => {
    const mapped = mapTransaction({
        ScheduledPaymentId: 'sp-1',
        Frequency: 'Weekly',
        ScheduledPaymentDateTime: '2025-04-01T00:00:00.000Z',
        InstructedAmount: { Amount: '30.00', Currency: 'NZD' },
        CreditorAccount: { Name: 'Cleaner' },
    });

    const candidates = detectRecurring([mapped]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].billingCycle, 'Weekly');
});

test('a declared record with no stated frequency still becomes a subscription', () => {
    // The sandbox often omits Frequency; a recurring arrangement with an
    // unknown cadence is still a subscription, just a lower-confidence one.
    const mapped = mapTransaction({
        DirectDebitId: 'dd-2',
        Name: 'Insurance Co',
        PreviousPaymentAmount: { Amount: '88.00', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-02-01T00:00:00.000Z',
    });

    const candidates = detectRecurring([mapped]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].billingCycle, 'Monthly');
    assert.ok(candidates[0].confidence < 0.8);
});

test('a declared record with no amount is included and shown as $0.00', () => {
    const mapped = mapTransaction({
        DirectDebitId: 'dd-3',
        Name: 'Unknown Payee',
        PreviousPaymentDateTime: '2025-02-01T00:00:00.000Z',
    });

    assert.equal(mapped.amount, 0);
    assert.equal(detectRecurring([mapped]).length, 1);
});

test('a declaration and its settled charges produce one subscription, not two', () => {
    // The mandate is declared, and the charges it produced are also in the
    // feed. Both describe the same subscription, so they must not make two.
    const declared = mapTransaction({
        DirectDebitId: 'dd-4',
        Frequency: 'Monthly',
        PreviousPaymentAmount: { Amount: '39.99', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-03-02T00:00:00.000Z',
    });
    const settled = [
        mapTransaction({
            TransactionInformation: 'Further Details about this payment',
            CreditDebitIndicator: 'Debit',
            InstructedAmount: { Amount: '39.99', Currency: 'NZD' },
            TransactionId: 'txn-apr',
            BookingDateTime: '2025-04-02T00:00:00.000Z',
        }),
        mapTransaction({
            TransactionInformation: 'Further Details about this payment',
            CreditDebitIndicator: 'Debit',
            InstructedAmount: { Amount: '39.99', Currency: 'NZD' },
            TransactionId: 'txn-may',
            BookingDateTime: '2025-05-02T00:00:00.000Z',
        }),
    ];

    const candidates = detectRecurring([declared, ...settled]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].source, 'declared');
});

test('two distinct mandates of the same amount stay two subscriptions', () => {
    // The bug that hid subscriptions from the page: the declared candidates were
    // keyed on merchant|amount|cycle, so several different standing arrangements
    // of equal amount collapsed onto one detection key. The first created a
    // document and the rest "updated" it — four mandates, one card. Each mandate
    // must now keep its own key.
    const first = mapTransaction({
        DirectDebitId: 'dd-alpha',
        Name: 'A SP debtor',
        Frequency: 'Monthly',
        PreviousPaymentAmount: { Amount: '10.00', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-03-05T00:00:00.000Z',
    });
    const second = mapTransaction({
        DirectDebitId: 'dd-beta',
        Name: 'A SP debtor',
        Frequency: 'Monthly',
        PreviousPaymentAmount: { Amount: '10.00', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-03-07T00:00:00.000Z',
    });

    const candidates = detectRecurring([first, second]);

    assert.equal(candidates.length, 2);
    assert.notEqual(candidates[0].detectionKey, candidates[1].detectionKey);
});

test('a declared mandate and its settled charges still dedupe to one', () => {
    // Namespacing the declared key must not break the opposite guarantee: the
    // mandate record and the charges it produced are the same subscription.
    const declared = mapTransaction({
        DirectDebitId: 'dd-77',
        Frequency: 'Monthly',
        Name: 'A SP debtor',
        PreviousPaymentAmount: { Amount: '10.00', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-03-05T00:00:00.000Z',
    });
    const settled = [
        debit({ merchant: 'A SP debtor', amount: 10, bookedAt: '2025-04-05T00:00:00.000Z' }),
        debit({ merchant: 'A SP debtor', amount: 10, bookedAt: '2025-05-05T00:00:00.000Z' }),
    ];

    const candidates = detectRecurring([declared, ...settled]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].source, 'declared');
});

test('detection is idempotent: the same input yields the same detection keys', () => {    const txns = [
        mapTransaction({
            DirectDebitId: 'dd-9',
            Frequency: 'Monthly',
            Name: 'Gym Co',
            PreviousPaymentAmount: { Amount: '50.00', Currency: 'NZD' },
            PreviousPaymentDateTime: '2025-03-01T00:00:00.000Z',
        }),
    ];

    const first = detectRecurring(txns);
    const second = detectRecurring(txns);
    assert.equal(first[0].detectionKey, second[0].detectionKey);
});

// --- frequencyToCycle ------------------------------------------------------

test('frequencyToCycle maps the units a bank might send', () => {
    assert.equal(frequencyToCycle('Weekly'), 'Weekly');
    assert.equal(frequencyToCycle('every week'), 'Weekly');
    assert.equal(frequencyToCycle('Fortnightly'), 'Fortnightly');
    assert.equal(frequencyToCycle('Bi-weekly'), 'Fortnightly');
    assert.equal(frequencyToCycle('Monthly'), 'Monthly');
    assert.equal(frequencyToCycle('monthly payment'), 'Monthly');
    assert.equal(frequencyToCycle('Quarterly'), 'Quarterly');
    assert.equal(frequencyToCycle('every 3 months'), 'Quarterly');
    assert.equal(frequencyToCycle('Annually'), 'Annually');
    assert.equal(frequencyToCycle('Yearly'), 'Annually');
});

test('frequencyToCycle returns null for text it does not understand', () => {
    assert.equal(frequencyToCycle(''), null);
    assert.equal(frequencyToCycle(null), null);
    assert.equal(frequencyToCycle('whenever'), null);
});
