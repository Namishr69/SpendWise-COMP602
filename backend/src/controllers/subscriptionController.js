import subscriptionService from '../services/subscriptionService.js';

const subscriptionController = {
    // GET /api/subscriptions — list the signed-in user's subscriptions
    async getAll(req, res) {
        try {
            const subscriptions = await subscriptionService.listSubscriptions(req.userId);
            res.json(subscriptions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/subscriptions — create a subscription
    async create(req, res) {
        try {
            const subscription = await subscriptionService.createSubscription(req.userId, req.body);
            res.status(201).json(subscription);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // GET /api/subscriptions/:id — fetch one subscription
    async getById(req, res) {
        try {
            const subscription = await subscriptionService.getSubscription(req.userId, req.params.id);
            res.json(subscription);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    // PATCH /api/subscriptions/:id — update one subscription
    async update(req, res) {
        try {
            const subscription = await subscriptionService.updateSubscription(req.userId, req.params.id, req.body);
            res.json(subscription);
        } catch (error) {
            const status = error.message === 'Subscription not found' ? 404 : 400;
            res.status(status).json({ error: error.message });
        }
    },

    // DELETE /api/subscriptions/:id — delete a subscription
    async remove(req, res) {
        try {
            await subscriptionService.deleteSubscription(req.userId, req.params.id);
            res.status(204).end();
        } catch (error) {
            const status = error.message === 'Subscription not found' ? 404 : 500;
            res.status(status).json({ error: error.message });
        }
    },

    // GET /api/subscriptions/:id/payments — list a subscription's payments
    async listPayments(req, res) {
        try {
            const payments = await subscriptionService.listPayments(req.userId, req.params.id);
            res.json(payments);
        } catch (error) {
            const status = error.message === 'Subscription not found' ? 404 : 500;
            res.status(status).json({ error: error.message });
        }
    },

    // POST /api/subscriptions/:id/payments — add a payment to a subscription
    async createPayment(req, res) {
        try {
            const payment = await subscriptionService.createPayment(req.userId, req.params.id, req.body);
            res.status(201).json(payment);
        } catch (error) {
            const status = error.message === 'Subscription not found' ? 404 : 400;
            res.status(status).json({ error: error.message });
        }
    },
};

export default subscriptionController;
