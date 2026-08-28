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
};

export default subscriptionRepo;
