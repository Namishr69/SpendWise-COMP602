import { db } from '../config/firebase.js';

/**
 * Firestore access for bank data synced from ANZ.
 *
 * Nested under the user's own document, mirroring subscriptionRepo/
 * anzConnectionRepo:
 *   bankAccounts/{accountId}                     account metadata + latest balance
 *   bankAccounts/{accountId}/transactions/{txnId} one document per transaction
 *
 * The ANZ transaction id is used as the document id, so re-syncing overwrites
 * the same document instead of creating a duplicate. That single choice is what
 * makes sync idempotent — no dedup pass is needed on read.
 */

// Firestore caps a batch at 500 operations; stay comfortably under it.
const BATCH_LIMIT = 450;

function userDoc(userId) {
    return db.collection('users').doc(userId);
}

function accountsCol(userId) {
    return userDoc(userId).collection('bankAccounts');
}

const bankDataRepo = {
    /** Upserts one account's metadata and latest balance. */
    async upsertAccount(userId, account) {
        const { accountId, ...rest } = account;
        await accountsCol(userId).doc(accountId).set(rest, { merge: true });
        return { accountId, ...rest };
    },

    /**
     * Upserts a batch of transactions under an account. Each transaction's id
     * is its document id, so this is safe to run repeatedly. Chunked to respect
     * Firestore's per-batch operation limit.
     */
    async upsertTransactions(userId, accountId, transactions) {
        const col = accountsCol(userId).doc(accountId).collection('transactions');

        let written = 0;
        for (let i = 0; i < transactions.length; i += BATCH_LIMIT) {
            const chunk = transactions.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();

            for (const txn of chunk) {
                const { transactionId, ...rest } = txn;
                batch.set(col.doc(transactionId), rest, { merge: true });
            }

            await batch.commit();
            written += chunk.length;
        }

        return written;
    },

    /** All synced accounts for the user, newest sync first is not required. */
    async listAccounts(userId) {
        const snapshot = await accountsCol(userId).get();
        return snapshot.docs.map((doc) => ({ accountId: doc.id, ...doc.data() }));
    },

    /**
     * Recent transactions, most recent first. Without accountId it reads across
     * every account; the per-account read uses the subcollection directly.
     */
    async listTransactions(userId, { accountId, limit = 100 } = {}) {
        if (accountId) {
            let snapshot;
            try {
                snapshot = await accountsCol(userId)
                    .doc(accountId)
                    .collection('transactions')
                    .orderBy('bookedAt', 'desc')
                    .limit(limit)
                    .get();
            } catch {
                snapshot = await accountsCol(userId)
                    .doc(accountId)
                    .collection('transactions')
                    .get();
            }
            const docs = snapshot.docs.map((doc) => ({
                transactionId: doc.id,
                accountId,
                ...doc.data(),
            }));
            return docs
                .sort((a, b) => ((a.bookedAt || '') < (b.bookedAt || '') ? 1 : -1))
                .slice(0, limit);
        }

        const accounts = await this.listAccounts(userId);
        const perAccount = await Promise.all(
            accounts.map(async (account) => {
                let snapshot;
                try {
                    snapshot = await accountsCol(userId)
                        .doc(account.accountId)
                        .collection('transactions')
                        .orderBy('bookedAt', 'desc')
                        .limit(limit)
                        .get();
                } catch {
                    snapshot = await accountsCol(userId)
                        .doc(account.accountId)
                        .collection('transactions')
                        .get();
                }
                return snapshot.docs.map((doc) => ({
                    transactionId: doc.id,
                    accountId: account.accountId,
                    ...doc.data(),
                }));
            })
        );

        return perAccount
            .flat()
            .sort((a, b) => ((a.bookedAt || '') < (b.bookedAt || '') ? 1 : -1))
            .slice(0, limit);
    },

    /**
     * Deletes every account and its transactions. Called on disconnect so a
     * user who unlinks their bank leaves nothing behind. Transactions must go
     * first — deleting a document does not delete its subcollections.
     */
    async deleteAllBankData(userId) {
        const accounts = await accountsCol(userId).get();

        for (const accountDoc of accounts.docs) {
            const txns = await accountDoc.ref.collection('transactions').get();

            for (let i = 0; i < txns.docs.length; i += BATCH_LIMIT) {
                const chunk = txns.docs.slice(i, i + BATCH_LIMIT);
                const batch = db.batch();
                chunk.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
            }

            await accountDoc.ref.delete();
        }
    },
};

export default bankDataRepo;
