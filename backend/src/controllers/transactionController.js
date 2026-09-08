import transactionService from '../services/transactionService.js';

const transactionController = {
    // GET /api/transactions — list the signed-in user's transactions
    async getAll(req, res) {
        try {
            const transactions = await transactionService.listTransactions(req.userId);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/transactions — create a manual transaction
    async create(req, res) {
        try {
            const transaction = await transactionService.createTransaction(req.userId, req.body);
            res.status(201).json(transaction);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // GET /api/transactions/:id — fetch one transaction
    async getById(req, res) {
        try {
            const transaction = await transactionService.getTransaction(
                req.userId,
                req.params.id
            );

            res.json(transaction);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    // PATCH /api/transactions/:id — update a manual transaction
    async update(req, res) {
        try {
            const transaction = await transactionService.updateTransaction(
                req.userId,
                req.params.id,
                req.body
            );

            res.json(transaction);
        } catch (error) {
            const status =
                error.message === 'Transaction not found' ? 404 : 400;

            res.status(status).json({ error: error.message });
        }
    },

    // DELETE /api/transactions/:id — delete a manual transaction
    async delete(req, res) {
        try {
            await transactionService.deleteTransaction(
                req.userId,
                req.params.id
            );

            res.status(204).send();
        } catch (error) {
            const status =
                error.message === 'Transaction not found' ? 404 : 400;

            res.status(status).json({ error: error.message });
        }
    },
};

export default transactionController;