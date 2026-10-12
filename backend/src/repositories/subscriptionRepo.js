import { db } from '../config/firebase.js';

const subscriptionRepo = {
    async getAll(userId) {
        const snapshot = await db.collection('users').doc(userId).collection('subscriptions').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getById(userId, subscriptionId) {
        const doc = await db.collection('users').doc(userId).collection('subscriptions').doc(subscriptionId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    async create(userId, data) {
        const docRef = await db.collection('users').doc(userId).collection('subscriptions').add(data);
        return { id: docRef.id, ...data };
    },

    async update(userId, subscriptionId, changes) {
        const docRef = db.collection('users').doc(userId).collection('subscriptions').doc(subscriptionId);
        await docRef.update(changes);
        const updated = await docRef.get();
        return { id: updated.id, ...updated.data() };
    },

    async remove(userId, subscriptionId) {
        await db.collection('users').doc(userId).collection('subscriptions').doc(subscriptionId).delete();
    },

    async listPayments(userId, subscriptionId) {
        const snapshot = await db.collection('users').doc(userId)
            .collection('subscriptions').doc(subscriptionId)
            .collection('payments')
            .orderBy('date', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createPayment(userId, subscriptionId, data) {
        const docRef = await db.collection('users').doc(userId)
            .collection('subscriptions').doc(subscriptionId)
            .collection('payments')
            .add(data);
        return { id: docRef.id, ...data };
    },

    // Upserts a payment under a caller-supplied id (the bank transaction id),
    // so re-syncing the same transaction updates rather than duplicates it.
    async upsertPayment(userId, subscriptionId, paymentId, data) {
        const docRef = db.collection('users').doc(userId)
            .collection('subscriptions').doc(subscriptionId)
            .collection('payments').doc(paymentId);
        await docRef.set(data, { merge: true });
        return { id: paymentId, ...data };
    },

    /**
     * Deletes every subscription that was created by ANZ auto-detection
     * (source === 'anz-detected'). Called when the user disconnects their ANZ
     * account so detected subscriptions don't linger after the data that
     * produced them is gone. Manually-added subscriptions are never touched.
     *
     * Payment sub-collections are deleted first — Firestore does not cascade
     * deletes to sub-collections when the parent document is removed.
     */
    async deleteAllDetected(userId) {
        const col = db.collection('users').doc(userId).collection('subscriptions');
        const snapshot = await col.where('source', '==', 'anz-detected').get();

        const BATCH_LIMIT = 450;

        // Delete payments sub-collections first.
        for (const subDoc of snapshot.docs) {
            const payments = await subDoc.ref.collection('payments').get();
            for (let i = 0; i < payments.docs.length; i += BATCH_LIMIT) {
                const chunk = payments.docs.slice(i, i + BATCH_LIMIT);
                const batch = db.batch();
                chunk.forEach((p) => batch.delete(p.ref));
                await batch.commit();
            }
        }

        // Now delete the subscription documents themselves.
        for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
            const chunk = snapshot.docs.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();
            chunk.forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }

        return snapshot.docs.length;
    },
};

export default subscriptionRepo;
