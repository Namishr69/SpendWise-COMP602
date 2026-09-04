import { db } from '../config/firebase.js';

/**
 * Firestore access for ANZ bank connections.
 *
 * Two collections, both nested under the user's own document:
 *   anzAuthSessions/{state}   short-lived, single-use OAuth handshake state
 *   bankConnections/{provider} the long-lived stored connection
 *
 * Nesting the auth session under the user (rather than a top-level collection
 * keyed by state) means a leaked code+state pair cannot be redeemed by a
 * different account — the lookup only ever happens within one user's document.
 */

const PROVIDER = 'anz';

function userDoc(userId) {
    return db.collection('users').doc(userId);
}

const anzConnectionRepo = {
    async saveAuthSession(userId, state, data) {
        await userDoc(userId).collection('anzAuthSessions').doc(state).set(data);
        return { state, ...data };
    },

    async findAuthSession(userId, state) {
        const doc = await userDoc(userId).collection('anzAuthSessions').doc(state).get();
        if (!doc.exists) return null;
        return { state: doc.id, ...doc.data() };
    },

    async deleteAuthSession(userId, state) {
        await userDoc(userId).collection('anzAuthSessions').doc(state).delete();
    },

    async saveConnection(userId, data) {
        await userDoc(userId).collection('bankConnections').doc(PROVIDER).set(data);
        return { id: PROVIDER, ...data };
    },

    async getConnection(userId) {
        const doc = await userDoc(userId).collection('bankConnections').doc(PROVIDER).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    async updateConnection(userId, changes) {
        const docRef = userDoc(userId).collection('bankConnections').doc(PROVIDER);
        await docRef.update(changes);
        const updated = await docRef.get();
        return { id: updated.id, ...updated.data() };
    },

    async deleteConnection(userId) {
        await userDoc(userId).collection('bankConnections').doc(PROVIDER).delete();
    },
};

export default anzConnectionRepo;
