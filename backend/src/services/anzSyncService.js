import anzAccountService from './anzAccountService.js';
import subscriptionDetectionService from './subscriptionDetectionService.js';
import bankDataRepo from '../repositories/bankDataRepo.js';
import anzConnectionRepo from '../repositories/anzConnectionRepo.js';

/**
 * Orchestrates a full pull of bank data from ANZ into Firestore, then runs
 * subscription detection over what was stored. This is the single writer of
 * bank data; every page reads the stored copy via bankDataRepo, never ANZ
 * directly.
 */
const anzSyncService = {
    async sync(userId) {
        const connection = await anzConnectionRepo.getConnection(userId);
        if (!connection) {
            throw new Error('No ANZ connection found');
        }

        const accounts = await anzAccountService.listAccounts(userId);

        let transactionsSynced = 0;
        const allTransactions = [];

        for (const account of accounts) {
            // Balance is best-effort — never let it stop the sync.
            let balance = null;
            try {
                balance = await anzAccountService.fetchBalances(userId, account.accountId);
            } catch (error) {
                console.error(`Balance fetch failed for ${account.accountId}:`, error.message);
            }

            await bankDataRepo.upsertAccount(userId, {
                ...account,
                balance: balance?.amount ?? null,
                balanceCurrency: balance?.currency ?? account.currency ?? 'NZD',
                balanceUpdatedAt: balance ? new Date().toISOString() : null,
                lastSyncedAt: new Date().toISOString(),
            });

            // Transactions are best-effort per account, so one account failing
            // (or an endpoint the sandbox has not enabled yet) still leaves the
            // accounts and balances synced. The error is logged with its HTTP
            // status so a live sync problem is diagnosable from the backend log.
            let transactions = [];
            try {
                transactions = await anzAccountService.fetchTransactions(userId, account.accountId);
            } catch (error) {
                console.error(`Transaction fetch failed for ${account.accountId}:`, error.message);
            }

            if (transactions.length > 0) {
                await bankDataRepo.upsertTransactions(userId, account.accountId, transactions);
                transactionsSynced += transactions.length;
                allTransactions.push(...transactions);
            }
        }

        const detection = await subscriptionDetectionService.detectAndPersist(
            userId,
            allTransactions
        );

        return {
            accounts: accounts.length,
            transactionsSynced,
            subscriptionsDetected: detection.detected,
            subscriptionsCreated: detection.created,
            lastSyncedAt: new Date().toISOString(),
        };
    },
};

export default anzSyncService;
