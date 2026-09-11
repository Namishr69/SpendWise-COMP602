import userRepo from '../repositories/userRepo.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userService = {
    /**
     * Called once, right after the frontend creates the Firebase Auth
     * account (sign up). Stores the user's profile in Firestore.
     * uid comes from the verified ID token, never from the request body.
     */
    async registerProfile(uid, { firstName, lastName, email }) {
        const cleanEmail = (email || '').trim();

        if (!cleanEmail) {
            throw new Error('Email is required');
        }
        if (!EMAIL_REGEX.test(cleanEmail)) {
            throw new Error('Email is not valid');
        }

        const existing = await userRepo.findById(uid);
        if (existing) {
            // Profile already created for this account — do not overwrite.
            return existing;
        }

        const profile = {
            firstName: (firstName || '').trim(),
            lastName: (lastName || '').trim(),
            email: cleanEmail,
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

    /**
     * Updates the signed-in user's editable profile details. Only firstName
     * and lastName can change here — email stays tied to Firebase Auth and is
     * never overwritten from the request body.
     */
    async updateProfile(uid, { firstName, lastName, photoURL }) {
        const existing = await userRepo.findById(uid);
        if (!existing) {
            throw new Error('User profile not found');
        }

        const updates = {};

        // Name fields are edited together via the profile form.
        if (firstName !== undefined || lastName !== undefined) {
            const cleanFirstName = (firstName ?? existing.firstName ?? '').trim();
            const cleanLastName = (lastName ?? existing.lastName ?? '').trim();

            if (!cleanFirstName) {
                throw new Error('First name is required');
            }
            if (!cleanLastName) {
                throw new Error('Last name is required');
            }

            updates.firstName = cleanFirstName;
            updates.lastName = cleanLastName;
        }

        // Profile picture is a small base64 image data URL, or an empty
        // string to clear it. Stored on the user doc, so keep it small.
        if (photoURL !== undefined) {
            if (photoURL === '' || photoURL === null) {
                updates.photoURL = '';
            } else if (
                typeof photoURL !== 'string' ||
                !photoURL.startsWith('data:image/')
            ) {
                throw new Error('Profile picture must be an image');
            } else if (photoURL.length > 700000) {
                throw new Error('Profile picture is too large');
            } else {
                updates.photoURL = photoURL;
            }
        }

        if (Object.keys(updates).length === 0) {
            return existing;
        }

        return await userRepo.update(uid, updates);
    },
};

export default userService;