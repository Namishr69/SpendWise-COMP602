import { db } from '../config/firebase.js';

const usersCollection = db.collection('users');

const userRepository = {
    async getUserById(userId) {
        const userDoc = await usersCollection.doc(userId).get();

        if (!userDoc.exists) {
            return null;
        }

        return {
            id: userDoc.id,
            ...userDoc.data(),
        };
    },

    async updatePreferredCurrency(userId, preferredCurrency) {
        await usersCollection.doc(userId).set(
            {
                preferredCurrency,
            },
            { merge: true }
        );

        return preferredCurrency;
    },

    async updateBudget(userId, budget) {
        await usersCollection.doc(userId).set(
            {
                budget,
            },
            { merge: true }
        );

        return budget;
    },
};
export default userRepository;