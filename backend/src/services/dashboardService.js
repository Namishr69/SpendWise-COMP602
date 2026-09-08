import bankDataRepo from '../repositories/bankDataRepo.js';
import subscriptionRepo from '../repositories/subscriptionRepo.js';

/**
 * Computes the figures the dashboard shows from data already stored in
 * Firestore — no ANZ calls. Every amount is returned in NZD (the currency the
 * data is stored in); the frontend converts to the user's preferred currency,
 * keeping formatting and conversion in one place there.
 */

const RECENT_TRANSACTION_LIMIT = 8;
const UPCOMING_BILL_LIMIT = 5;
const DUE_SOON_DAYS = 7;

function startOfMonth(now) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

const dashboardService = {
    async getDashboard(userId) {
        const [transactions, subscriptions] = await Promise.all([
            bankDataRepo.listTransactions(userId, { limit: 250 }),
            subscriptionRepo.getAll(userId),
        ]);

        const now = new Date();
        const monthStart = startOfMonth(now);

        // Money out this calendar month.
        const spentThisMonth = transactions
            .filter((t) => t.direction === 'debit' && new Date(t.bookedAt) >= monthStart)
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const activeSubs = subscriptions.filter(
            (s) => (s.status || 'Active') === 'Active'
        );

        // Subscriptions falling due within the next week.
        const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
        const dueThisWeek = activeSubs
            .filter((s) => {
                if (!s.nextPaymentDate) return false;
                const due = new Date(s.nextPaymentDate);
                return due >= now && due <= dueSoonCutoff;
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        // Next few bills by date, for the "Upcoming bills" card.
        const upcomingBills = activeSubs
            .filter((s) => s.nextPaymentDate)
            .sort((a, b) => (a.nextPaymentDate < b.nextPaymentDate ? -1 : 1))
            .slice(0, UPCOMING_BILL_LIMIT)
            .map((s) => ({
                name: s.name,
                due: s.nextPaymentDate,
                amount: Number(s.amount) || 0,
                currency: 'NZD',
            }));

        const recentTransactions = transactions
            .slice(0, RECENT_TRANSACTION_LIMIT)
            .map((t) => ({
                transactionId: t.transactionId,
                description: t.description,
                merchant: t.merchant,
                amount: Number(t.amount) || 0,
                currency: t.currency || 'NZD',
                direction: t.direction,
                bookedAt: t.bookedAt,
            }));

        return {
            currency: 'NZD',
            hasData: transactions.length > 0 || subscriptions.length > 0,
            stats: {
                spentThisMonth: Number(spentThisMonth.toFixed(2)),
                activeSubs: activeSubs.length,
                dueThisWeek: Number(dueThisWeek.toFixed(2)),
                detectedSubs: subscriptions.filter((s) => s.source === 'anz-detected').length,
            },
            upcomingBills,
            recentTransactions,
        };
    },
};

export default dashboardService;
