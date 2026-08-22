import userService from '../services/userService.js';

const userController = {
    async register(req, res) {
        const profile = await userService.registerProfile(req.userId, req.body);
        res.status(201).json(profile);
    },

    async getMe(req, res) {
        const profile = await userService.getProfile(req.userId);
        res.json(profile);
    },
};

export default userController;