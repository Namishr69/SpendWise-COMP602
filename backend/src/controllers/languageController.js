import languageService from '../services/languageService.js';

const languageController = {
    async getPreferredLanguage(req, res) {
        try {
            const preferredLanguage =
                await languageService.getPreferredLanguage(
                    req.userId
                );

            res.json({
                preferredLanguage,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async updatePreferredLanguage(req, res) {
        try {
            const { language } = req.body;

            const updatedLanguage =
                await languageService.updatePreferredLanguage(
                    req.userId,
                    language
                );

            res.json({
                preferredLanguage: updatedLanguage,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
};

export default languageController;