import { detectRecurring } from '../src/services/subscriptionDetection.js';

const neonTxns = Array(9).fill(0).map((_, i) => ({
    merchant: 'Neon NZ',
    amount: 0.00,
    direction: 'debit',
    bookedAt: `2026-10-03T00:00:00.000Z`,
    transactionId: `neon-${i}`
}));

const disneyTxns = [
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-09-10' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-10-20' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-11-04' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-11-07' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-11-10' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-12-02' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-12-03' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-12-04' },
    { merchant: 'Disney+', amount: 10, direction: 'debit', bookedAt: '2018-12-27' },
];

const candidates = detectRecurring([...neonTxns, ...disneyTxns]);
console.log('Candidates:');
console.dir(candidates, { depth: null });
