import currencyService from '../services/currencyService.js';

const currencyController = {
    async getPreferredCurrency(req, res) {
        try {
            const preferredCurrency =
                await currencyService.getPreferredCurrency(
                    req.userId
                );

            res.json({
                preferredCurrency,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async updatePreferredCurrency(req, res) {
        try {
            const { currency } = req.body;

            const updatedCurrency =
                await currencyService.updatePreferredCurrency(
                    req.userId,
                    currency
                );

            res.json({
                preferredCurrency: updatedCurrency,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
};

export default currencyController;