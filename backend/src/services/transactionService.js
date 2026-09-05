import transactionRepo from '../repositories/transactionRepo.js';

const transactionService = {
    async listTransactions(userId) {
        return await transactionRepo.getAll(userId);
    },

    async getTransaction(userId, transactionId) {
        const transaction = await transactionRepo.getById(
            userId,
            transactionId
        );

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        return transaction;
    },

    async createTransaction(userId, data) {
        const name = (data.name || '').trim();
        const amount = Number(data.amount);
        const date = (data.date || '').trim();
        const category = (data.category || '').trim();
        const currency = (data.currency || 'NZD').trim().toUpperCase();

        if (!name) {
            throw new Error('Name is required');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Amount must be greater than zero');
        }

        if (!date) {
            throw new Error('Date is required');
        }

        if (!category) {
            throw new Error('Category is required');
        }

        const transaction = {
            name,
            amount,
            date,
            category,
            currency,
            source: 'manual',
            createdAt: new Date().toISOString(),
        };

        return await transactionRepo.create(
            userId,
            transaction
        );
    },

    async updateTransaction(
        userId,
        transactionId,
        changes
    ) {
        const existing = await transactionRepo.getById(
            userId,
            transactionId
        );

        if (!existing) {
            throw new Error('Transaction not found');
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

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                throw new Error(
                    'Amount must be greater than zero'
                );
            }

            update.amount = amount;
        }

        if (changes.date !== undefined) {
            const date = String(changes.date).trim();

            if (!date) {
                throw new Error('Date is required');
            }

            update.date = date;
        }

        if (changes.category !== undefined) {
            const category = String(
                changes.category
            ).trim();

            if (!category) {
                throw new Error('Category is required');
            }

            update.category = category;
        }

        if (changes.currency !== undefined) {
            const currency = String(
                changes.currency
            )
                .trim()
                .toUpperCase();

            if (!currency) {
                throw new Error('Currency is required');
            }

            update.currency = currency;
        }

        if (Object.keys(update).length === 0) {
            return existing;
        }

        return await transactionRepo.update(
            userId,
            transactionId,
            update
        );
    },

    async deleteTransaction(userId, transactionId) {
        const existing = await transactionRepo.getById(
            userId,
            transactionId
        );

        if (!existing) {
            throw new Error('Transaction not found');
        }

        await transactionRepo.delete(
            userId,
            transactionId
        );
    },
};

export default transactionService;