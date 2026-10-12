import { db } from '../config/firebase.js';

/**
 * Firestore access for the user's Gmail connection.
 *
 * Two collections, both nested under the user's own document (mirroring
 * anzConnectionRepo):
 *   gmailAuthSessions/{state}   short-lived, single-use OAuth handshake state
 *   emailConnections/{provider} the long-lived stored connection + tokens
 *
 * Nesting the auth session under the user (rather than a top-level collection
 * keyed by state) means a leaked code+state pair cannot be redeemed by a
 * different account — the lookup only ever happens within one user's document.
 */

const PROVIDER = 'gmail';

function userDoc(userId) {
  return db.collection('users').doc(userId);
}

const gmailConnectionRepo = {
  async saveAuthSession(userId, state, data) {
    await userDoc(userId).collection('gmailAuthSessions').doc(state).set(data);
    return { state, ...data };
  },

  async findAuthSession(userId, state) {
    const doc = await userDoc(userId).collection('gmailAuthSessions').doc(state).get();
    if (!doc.exists) return null;
    return { state: doc.id, ...doc.data() };
  },

  async deleteAuthSession(userId, state) {
    await userDoc(userId).collection('gmailAuthSessions').doc(state).delete();
  },

  async saveConnection(userId, data) {
    await userDoc(userId).collection('emailConnections').doc(PROVIDER).set(data);
    return { id: PROVIDER, ...data };
  },

  async getConnection(userId) {
    const doc = await userDoc(userId).collection('emailConnections').doc(PROVIDER).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async updateConnection(userId, changes) {
    const docRef = userDoc(userId).collection('emailConnections').doc(PROVIDER);
    await docRef.update(changes);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  },

  async deleteConnection(userId) {
    await userDoc(userId).collection('emailConnections').doc(PROVIDER).delete();
  },
};

export default gmailConnectionRepo;
