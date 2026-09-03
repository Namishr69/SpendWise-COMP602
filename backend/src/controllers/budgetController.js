import budgetService from '../services/budgetService.js';

const budgetController = {
    async updateBudget(req, res) {
        try {
            const { amount, period } = req.body;

            const budget = await budgetService.updateBudget(req.userId, {
                amount,
                period,
            });

            res.json({ budget });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
};

export default budgetController;