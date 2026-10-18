import subscriptionRepo from '../repositories/subscriptionRepo.js';
import priceAlertService, { findPriceChanges } from './priceAlertService.js';

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

        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error('Amount must be zero or greater');
        }

        const subscriptionDate = (data.subscriptionDate || '').trim();

        const subscription = {
            name,
            amount,
            billingCycle: (data.billingCycle || 'Monthly').trim(),
            nextPaymentDate: (data.nextPaymentDate || '').trim(),
            subscriptionDate,
            status: (data.status || 'Active').trim(),
            notes: (data.notes || '').trim().slice(0, 500),
            devices: [],
            createdAt: new Date().toISOString(),
        };

        const created = await subscriptionRepo.create(userId, subscription);

        // Subscribing is itself the first payment, so seed the payment history
        // with one entry instead of leaving it empty.
        await subscriptionRepo.createPayment(userId, created.id, {
            date: subscriptionDate || created.createdAt.slice(0, 10),
            amount,
        });

        return created;
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

            if (!Number.isFinite(amount) || amount < 0) {
                throw new Error('Amount must be zero or greater');
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
            const status = String(changes.status).trim();

            const allowedStatuses = [
                'Active',
                'Paused',
                'Cancelled',
            ];

            if (!allowedStatuses.includes(status)) {
                throw new Error('Invalid subscription status');
            }

            update.status = status;
        }

        if (changes.notes !== undefined) {
            update.notes = String(changes.notes).trim().slice(0, 500);
        }

        if (changes.devices !== undefined) {
            if (!Array.isArray(changes.devices)) {
                throw new Error('Devices must be a list');
            }

            update.devices = changes.devices
                .map((device) => String(device).trim())
                .filter((device) => device.length > 0);
        }

        if (Object.keys(update).length === 0) {
            return existing;
        }

        return await subscriptionRepo.update(
            userId,
            subscriptionId,
            update,
        );
    },

    async deleteSubscription(userId, subscriptionId) {
        const existing = await subscriptionRepo.getById(
            userId,
            subscriptionId,
        );

        if (!existing) {
            throw new Error('Subscription not found');
        }

        /*
         * A subscription must be cancelled before it can be removed
         * from SpendWise. This prevents users from accidentally deleting
         * a subscription that is still considered active or paused.
         */
        if (
            String(existing.status || '').toLowerCase() !==
            'cancelled'
        ) {
            throw new Error(
                'Subscription must be cancelled before it can be deleted',
            );
        }

        await subscriptionRepo.remove(
            userId,
            subscriptionId,
        );

        await priceAlertService.removeAlertsForSubscription(
            userId,
            subscriptionId,
        );
    },

    async listPayments(userId, subscriptionId) {
        const subscription = await subscriptionRepo.getById(
            userId,
            subscriptionId,
        );

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        return await subscriptionRepo.listPayments(
            userId,
            subscriptionId,
        );
    },

    async createPayment(userId, subscriptionId, data) {
        const subscription = await subscriptionRepo.getById(
            userId,
            subscriptionId,
        );

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const date = (data.date || '').trim();
        const amount = Number(data.amount);

        if (!date) {
            throw new Error('Date is required');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Amount must be greater than zero');
        }

        const payment = await subscriptionRepo.createPayment(
            userId,
            subscriptionId,
            {
                date,
                amount,
            },
        );

        // Compare the new payment against the one before it. The payment is
        // already saved, so a failure here is logged rather than reported as
        // a failed payment.
        try {
            const payments = await subscriptionRepo.listPayments(
                userId,
                subscriptionId,
            );

            const changes = findPriceChanges(
                payments,
                [payment.id],
            );

            await priceAlertService.recordPriceChanges(
                userId,
                subscription,
                changes,
            );
        } catch (error) {
            console.error(
                `Price change check failed for ${subscriptionId}:`,
                error.message,
            );
        }

        return payment;
    },
};

export default subscriptionService;