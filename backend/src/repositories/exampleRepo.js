import { db } from '../config/firebase.js';

const exampleRepo = {
    async getAll(userId) {
        const snapshot = await db.collection('users').doc(userId).collection('items').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async create(userId, data) {
        const docRef = await db.collection('users').doc(userId).collection('items').add(data);
        return { id: docRef.id, ...data };
    },
};

export default exampleRepo;