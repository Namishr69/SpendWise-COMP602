import userRepo from '../repositories/userRepo.js';

const userService = {
    async registerProfile(uid, { firstName, lastName, email }) {
        const profile = {
            firstName,
            lastName,
            email,
            createdAt: new Date().toISOString(),
        };
        return await userRepo.create(uid, profile);
    },

    async getProfile(uid) {
        return await userRepo.findById(uid);
    },
};

export default userService;