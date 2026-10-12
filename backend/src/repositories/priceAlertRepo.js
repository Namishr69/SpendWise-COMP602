import { db } from '../config/firebase.js';

// Firestore's gRPC status for a create() that hits an existing document.
const ALREADY_EXISTS = 6;

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
};

export default priceAlertRepo;
