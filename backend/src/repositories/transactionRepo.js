import { db } from '../config/firebase.js';

const transactionRepo = {
    async getAll(userId) {
        const snapshot = await db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    },

    async getById(userId, transactionId) {
        const doc = await db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .doc(transactionId)
            .get();

        if (!doc.exists) return null;

        return {
            id: doc.id,
            ...doc.data(),
        };
    },

    async create(userId, data) {
        const docRef = await db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .add(data);

        return {
            id: docRef.id,
            ...data,
        };
    },

    // Upserts a transaction under a caller-supplied id (e.g. a Gmail message
    // id), so re-syncing the same email updates its row instead of adding a
    // duplicate — the same idempotency trick bankDataRepo uses for bank txns.
    async upsertById(userId, transactionId, data) {
        const docRef = db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .doc(transactionId);

        await docRef.set(data, { merge: true });

        return {
            id: transactionId,
            ...data,
        };
    },

    async update(userId, transactionId, changes) {
        const docRef = db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .doc(transactionId);

        await docRef.update(changes);

        const updated = await docRef.get();

        return {
            id: updated.id,
            ...updated.data(),
        };
    },

    async delete(userId, transactionId) {
        await db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .doc(transactionId)
            .delete();
    },
};

export default transactionRepo;