import subscriptionRepo from '../repositories/subscriptionRepo.js';

const subscriptionService = {
    async listSubscriptions(userId) {
        return await subscriptionRepo.getAll(userId);
    },

    async getSubscription(userId, subscriptionId) {
        const subscription = await subscriptionRepo.getById(userId, subscriptionId);
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        return subscription;
    },

    async createSubscription(userId, data) {
        const name = (data.name || '').trim();
        const amount = Number(data.amount);

        if (!name) {
            throw new Error('Name is required');
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Amount must be greater than zero');
        }

        const subscription = {
            name,
            amount,
            billingCycle: (data.billingCycle || 'Monthly').trim(),
            nextPaymentDate: (data.nextPaymentDate || '').trim(),
            status: (data.status || 'Active').trim(),
            createdAt: new Date().toISOString(),
        };

        return await subscriptionRepo.create(userId, subscription);
    },

    async updateSubscription(userId, subscriptionId, changes) {
        const existing = await subscriptionRepo.getById(userId, subscriptionId);
        if (!existing) {
            throw new Error('Subscription not found');
        }

        const update = {};

        if (changes.name !== undefined) {
            const name = (changes.name || '').trim();
            if (!name) {
                throw new Error('Name is required');
            }
            update.name = name;
        }

        if (changes.amount !== undefined) {
            const amount = Number(changes.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new Error('Amount must be greater than zero');
            }
            update.amount = amount;
        }

        if (changes.billingCycle !== undefined) {
            update.billingCycle = String(changes.billingCycle).trim();
        }
        if (changes.nextPaymentDate !== undefined) {
            update.nextPaymentDate = String(changes.nextPaymentDate).trim();
        }
        if (changes.status !== undefined) {
            update.status = String(changes.status).trim();
        }

        if (Object.keys(update).length === 0) {
            return existing;
        }

        return await subscriptionRepo.update(userId, subscriptionId, update);
    },
};

export default subscriptionService;
