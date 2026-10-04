import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    classifyRecordType,
    extractDisplayName,
    mapTransaction,
} from './anzTransactionMapper.js';

/**
 * A raw ANZ *sandbox* record: a generic placeholder name (so the real-name
 * candidates are rejected) plus an amount and an id. These are the records that
 * used to scatter one recurring payment across many synthetic merchants.
 */
function sandboxRecord({ amount, id, date = '2025-01-15T00:00:00.000Z' }) {
    return {
        TransactionInformation: 'Further Details about this payment',
        CreditDebitIndicator: 'Debit',
        InstructedAmount: { Amount: String(amount), Currency: 'NZD' },
        TransactionId: id,
        BookingDateTime: date,
    };
}

test('recurring charges of the same amount map to ONE merchant (the fix)', () => {
    // Same amount, three different transaction ids — exactly what a monthly
    // subscription looks like over three billing cycles.
    const a = mapTransaction(sandboxRecord({ amount: 19.99, id: 'txn-jan' }));
    const b = mapTransaction(sandboxRecord({ amount: 19.99, id: 'txn-feb' }));
    const c = mapTransaction(sandboxRecord({ amount: 19.99, id: 'txn-mar' }));

    assert.equal(a.merchant, b.merchant);
    assert.equal(b.merchant, c.merchant);
    assert.ok(a.merchant.length > 0);
});

test('merchant for a given amount is deterministic and amount-keyed', () => {
    // Previously the id drove the name, so identical amounts could still differ.
    // Now the amount (in cents) is the key, so it is stable across calls.
    const first = extractDisplayName(
        { TransactionInformation: 'party being paid' },
        { amount: 12.5 }
    );
    const again = extractDisplayName(
        { TransactionInformation: 'party being paid' },
        { amount: 12.5 }
    );
    assert.equal(first, again);
});

test('a real ANZ merchant name is preserved, never synthesised', () => {
    const mapped = mapTransaction({
        TransactionInformation: 'NETFLIX.COM',
        CreditDebitIndicator: 'Debit',
        InstructedAmount: { Amount: '19.99', Currency: 'NZD' },
        TransactionId: 'txn-real',
        BookingDateTime: '2025-01-15T00:00:00.000Z',
    });
    assert.equal(mapped.merchant, 'NETFLIX.COM');
    assert.equal(mapped.description, 'NETFLIX.COM');
});

test('generic placeholder names are rejected in favour of a real catalog name', () => {
    const name = extractDisplayName(
        { TransactionInformation: 'Merchant name that is long and generic' },
        { amount: 42 }
    );
    assert.ok(!/merchant name that is long/i.test(name));
    assert.ok(name.length > 0);
});

test('mapTransaction normalises amount, direction, currency and dates', () => {
    const mapped = mapTransaction({
        TransactionInformation: 'SPOTIFY',
        CreditDebitIndicator: 'Debit',
        InstructedAmount: { Amount: '-14.99', Currency: 'NZD' },
        TransactionId: 'txn-1',
        BookingDateTime: '2025-02-01T09:30:00.000Z',
    });

    assert.equal(mapped.amount, 14.99); // stored as a positive magnitude
    assert.equal(mapped.direction, 'debit');
    assert.equal(mapped.currency, 'NZD');
    assert.equal(mapped.transactionId, 'txn-1');
    assert.equal(mapped.bookedAt, '2025-02-01T09:30:00.000Z');
});

test('a credit indicator is classified as an incoming payment', () => {
    const mapped = mapTransaction({
        TransactionInformation: 'SALARY',
        CreditDebitIndicator: 'Credit',
        InstructedAmount: { Amount: '2500.00', Currency: 'NZD' },
        TransactionId: 'txn-credit',
        BookingDateTime: '2025-02-01T00:00:00.000Z',
    });
    assert.equal(mapped.direction, 'credit');
});

test('a scheduled payment is classified as a declared recurring record', () => {
    const mapped = mapTransaction({
        ScheduledPaymentId: 'sp-1',
        ScheduledPaymentDateTime: '2025-04-01T00:00:00.000Z',
        InstructedAmount: { Amount: '120.00', Currency: 'NZD' },
        CreditorAccount: { Name: 'Les Mills Gym' },
    });

    assert.equal(mapped.recordType, 'scheduledPayment');
    assert.equal(mapped.mandateId, 'sp-1');
    assert.equal(mapped.declaredNextDate, '2025-04-01T00:00:00.000Z');
});

test('a direct debit is classified as a declared recurring record', () => {
    const mapped = mapTransaction({
        DirectDebitId: 'dd-9',
        Name: 'Neon NZ',
        PreviousPaymentAmount: { Amount: '20.00', Currency: 'NZD' },
        PreviousPaymentDateTime: '2025-03-01T00:00:00.000Z',
        Frequency: 'Monthly',
    });

    assert.equal(mapped.recordType, 'directDebit');
    assert.equal(mapped.mandateId, 'dd-9');
    assert.equal(mapped.frequency, 'Monthly');
    assert.equal(mapped.amount, 20);
});

test('the direct-debit payee Name field is used as the merchant', () => {
    // OBIE puts the direct-debit payee in a top-level Name. It used to be
    // missed entirely, so the real payee fell through to the synthetic catalog.
    const mapped = mapTransaction({
        DirectDebitId: 'dd-5',
        Name: 'Vector Power',
        PreviousPaymentAmount: { Amount: '145.00', Currency: 'NZD' },
    });

    assert.equal(mapped.merchant, 'Vector Power');
});

test('an ordinary charge is classified as a plain transaction', () => {
    const mapped = mapTransaction({
        TransactionInformation: 'NETFLIX.COM',
        CreditDebitIndicator: 'Debit',
        InstructedAmount: { Amount: '19.99', Currency: 'NZD' },
        TransactionId: 'txn-plain',
        BookingDateTime: '2025-01-15T00:00:00.000Z',
    });

    assert.equal(mapped.recordType, 'transaction');
    assert.equal(mapped.mandateId, null);
    assert.equal(mapped.frequency, null);
});

test('classifyRecordType prefers direct debit when both ids are present', () => {
    // Direct debits can carry a mandate plus a scheduled date; the mandate is
    // the stronger signal and must win.
    assert.equal(
        classifyRecordType({ DirectDebitId: 'dd-1', ScheduledPaymentId: 'sp-1' }),
        'directDebit'
    );
});

test('a declared record and the charges it produces resolve to one merchant', () => {
    // The declared arrangement and its settled charges are keyed on the amount,
    // so detection groups them together instead of showing two subscriptions.
    const declared = mapTransaction({
        DirectDebitId: 'dd-7',
        Name: 'Party being paid',
        PreviousPaymentAmount: { Amount: '39.99', Currency: 'NZD' },
    });
    const settled = mapTransaction(sandboxRecord({ amount: 39.99, id: 'txn-apr' }));

    assert.equal(declared.merchant, settled.merchant);
});
