import { db } from '../config/firebase.js';

// Firestore's gRPC status for a create() that hits an existing document.
const ALREADY_EXISTS = 6;

// Firestore allows at most 30 values in an `in` filter.
const IN_FILTER_LIMIT = 30;

// Firestore caps a batch at 500 operations; stay comfortably under it.
const BATCH_LIMIT = 450;

function alertsCollection(userId) {
    return db.collection('users').doc(userId).collection('priceAlerts');
}

const priceAlertRepo = {
    async listActive(userId) {
        const snapshot = await alertsCollection(userId)
            .where('dismissed', '==', false)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Every alert for one subscription, dismissed or not.
    async listBySubscription(userId, subscriptionId) {
        const snapshot = await alertsCollection(userId)
            .where('subscriptionId', '==', subscriptionId)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Every alert of one type (e.g. 'announcement'), dismissed or not.
    async listByType(userId, type) {
        const snapshot = await alertsCollection(userId)
            .where('type', '==', type)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getById(userId, alertId) {
        const doc = await alertsCollection(userId).doc(alertId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    // Creates the alert under a caller-supplied id, or does nothing if it
    // already exists — so re-detecting the same charge never resurrects an
    // alert the user has dismissed. Returns the alert, or null if it existed.
    async createIfAbsent(userId, alertId, data) {
        try {
            await alertsCollection(userId).doc(alertId).create(data);
            return { id: alertId, ...data };
        } catch (error) {
            if (error.code === ALREADY_EXISTS) return null;
            throw error;
        }
    },

    async update(userId, alertId, changes) {
        const docRef = alertsCollection(userId).doc(alertId);
        await docRef.update(changes);
        const updated = await docRef.get();
        return { id: updated.id, ...updated.data() };
    },

    async removeBySubscription(userId, subscriptionId) {
        const snapshot = await alertsCollection(userId)
            .where('subscriptionId', '==', subscriptionId)
            .get();
        await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
    },

    /**
     * Deletes the alerts for many subscriptions at once. Used by the ANZ and
     * Gmail disconnect paths: both delete auto-detected subscriptions, and an
     * alert whose subscription is gone has nothing left to describe.
     *
     * The ids are chunked because Firestore caps an `in` filter at 30 values.
     */
    async removeBySubscriptions(userId, subscriptionIds) {
        if (!Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
            return 0;
        }

        let removed = 0;

        for (let i = 0; i < subscriptionIds.length; i += IN_FILTER_LIMIT) {
            const chunk = subscriptionIds.slice(i, i + IN_FILTER_LIMIT);
            const snapshot = await alertsCollection(userId)
                .where('subscriptionId', 'in', chunk)
                .get();

            for (let j = 0; j < snapshot.docs.length; j += BATCH_LIMIT) {
                const docs = snapshot.docs.slice(j, j + BATCH_LIMIT);
                const batch = db.batch();
                docs.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
                removed += docs.length;
            }
        }

        return removed;
    },
};

export default priceAlertRepo;
