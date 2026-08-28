import { db } from '../config/firebase.js';

const userRepo = {
    async findById(uid) {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    async create(uid, data) {
        await db.collection('users').doc(uid).set(data);
        return { id: uid, ...data };
    },
};

export default userRepo;