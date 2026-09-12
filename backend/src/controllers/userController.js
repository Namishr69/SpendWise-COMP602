import userService from '../services/userService.js';

const userController = {
    // POST /api/users — create profile after Firebase Auth sign up
    async register(req, res) {
        try {
            const profile = await userService.registerProfile(req.userId, req.body);
            res.status(201).json(profile);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // GET /api/users/me — fetch profile after login
    async getMe(req, res) {
        try {
            const profile = await userService.getProfile(req.userId);
            res.json(profile);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    // PUT /api/users/me — update the signed-in user's profile details
    async updateMe(req, res) {
        try {
            const profile = await userService.updateProfile(req.userId, req.body);
            res.json(profile);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
};

export default userController;