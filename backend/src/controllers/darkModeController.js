import darkModeService from '../services/darkModeService.js';

const darkModeController = {
    async updateDarkMode(req, res) {
        try {
            const { darkMode } = req.body;
            const updated = await darkModeService.updateDarkMode(req.userId, darkMode);
            res.json({ darkMode: updated });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
};

export default darkModeController;