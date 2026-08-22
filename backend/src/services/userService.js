import userRepo from '../repositories/userRepo.js';

const userService = {
    /**
     * Called once, right after the frontend creates the Firebase Auth
     * account (sign up). Stores the user's profile in Firestore.
     * uid comes from the verified ID token, never from the request body.
     */
    async registerProfile(uid, { firstName, lastName, email }) {
        if (!email) {
            throw new Error('Email is required');
        }

        const existing = await userRepo.findById(uid);
        if (existing) {
            // Profile already created for this account — do not overwrite.
            return existing;
        }

        const profile = {
            firstName: firstName || '',
            lastName: lastName || '',
            email,
            createdAt: new Date().toISOString(),
        };

        return await userRepo.create(uid, profile);
    },

    /**
     * Called after login (or on any authenticated page load) to fetch
     * the signed-in user's profile.
     */
    async getProfile(uid) {
        const profile = await userRepo.findById(uid);
        if (!profile) {
            throw new Error('User profile not found');
        }
        return profile;
    },
};

export default userService;