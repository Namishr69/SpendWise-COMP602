import userRepository from '../repositories/userRepository.js';

const BUDGET_PERIODS = ['Weekly', 'Monthly', 'Yearly'];

const budgetService = {
    async updateBudget(userId, data) {
        const amount = Number(data.amount);
        const period = data.period;

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Budget amount must be greater than zero');
        }
        if (!BUDGET_PERIODS.includes(period)) {
            throw new Error('Budget period must be Weekly, Monthly, or Yearly');
        }

        const budget = { amount, period };
        return await userRepository.updateBudget(userId, budget);
    },
};

export default budgetService;