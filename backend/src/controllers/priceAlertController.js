import priceAlertService from '../services/priceAlertService.js';
import providerPriceAlertService from '../services/providerPriceAlertService.js';

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

    // POST /api/price-alerts/gmail-scan — look for provider price change
    // emails using a gmail.readonly access token from the browser
    async scanGmail(req, res) {
        const accessToken = req.body?.accessToken;

        if (typeof accessToken !== 'string' || !accessToken) {
            return res.status(400).json({ error: 'A Gmail access token is required' });
        }

        try {
            const result = await providerPriceAlertService.scanGmail(req.userId, accessToken);
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    },
};

export default priceAlertController;
