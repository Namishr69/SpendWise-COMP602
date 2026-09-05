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