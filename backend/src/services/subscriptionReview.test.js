import { describe, it, expect } from 'vitest';

import { isPendingReview, countsAsSubscription } from './subscriptionReview.js';

describe('isPendingReview', () => {
    it('treats an unreviewed email-detected subscription as pending', () => {
        expect(isPendingReview({ source: 'gmail-detected' })).toBe(true);
    });

    it('is not pending once confirmed or rejected', () => {
        expect(isPendingReview({ source: 'gmail-detected', reviewStatus: 'confirmed' })).toBe(false);
        expect(isPendingReview({ source: 'gmail-detected', reviewStatus: 'rejected' })).toBe(false);
    });

    it('never holds bank-detected or manual subscriptions for review', () => {
        expect(isPendingReview({ source: 'anz-detected' })).toBe(false);
        expect(isPendingReview({})).toBe(false);
    });
});

describe('countsAsSubscription', () => {
    it('counts manual, bank-detected and confirmed email subscriptions', () => {
        expect(countsAsSubscription({})).toBe(true);
        expect(countsAsSubscription({ source: 'anz-detected' })).toBe(true);
        expect(countsAsSubscription({ source: 'gmail-detected', reviewStatus: 'confirmed' })).toBe(true);
    });

    it('leaves out pending and rejected subscriptions', () => {
        expect(countsAsSubscription({ source: 'gmail-detected' })).toBe(false);
        expect(countsAsSubscription({ source: 'gmail-detected', reviewStatus: 'rejected' })).toBe(false);
    });
});
