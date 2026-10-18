import priceAlertService from '../services/priceAlertService.js';

const priceAlertController = {
    // GET /api/price-alerts — list undismissed price change alerts, optionally
    // narrowed to one subscription with ?subscriptionId=
    async getActive(req, res) {
        try {
            const alerts = await priceAlertService.listActiveAlerts(
                req.userId,
                req.query.subscriptionId
            );
            res.json(alerts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // PATCH /api/price-alerts/:id/dismiss — acknowledge and hide an alert
    async dismiss(req, res) {
        try {
            const alert = await priceAlertService.dismissAlert(req.userId, req.params.id);
            res.json(alert);
        } catch (error) {
            const status = error.message === 'Price alert not found' ? 404 : 500;
            res.status(status).json({ error: error.message });
        }
    },
};

export default priceAlertController;
