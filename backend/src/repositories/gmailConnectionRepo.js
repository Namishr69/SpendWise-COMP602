import { db } from '../config/firebase.js';

/**
 * Firestore access for Gmail connections.
 *
 * Two sub-collections, nested under the user's own document:
 *   gmailAuthSessions/{state}   short-lived, single-use OAuth handshake state
 *   emailConnections/gmail     the long-lived token record
 *
 * Nesting both under the user's document means a leaked state value cannot be
 * redeemed by a different account — the lookup only ever happens within one
 * user's sub-collection (mirrors the ANZ pattern in anzConnectionRepo.js).
 */

const PROVIDER = 'gmail';

function userDoc(userId) {
  return db.collection('users').doc(userId);
}

const gmailConnectionRepo = {
  // ── OAuth handshake sessions ─────────────────────────────────────────────

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

  // ── Long-lived connection record ─────────────────────────────────────────

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
