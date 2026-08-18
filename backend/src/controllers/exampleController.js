import exampleService from '../services/exampleService.js';

const exampleController = {
    async getAll(req, res) {
        try {
            const items = await exampleService.getAllItems(req.userId);
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async create(req, res) {
        try {
            const item = await exampleService.createItem(req.userId, req.body);
            res.status(201).json(item);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
};

export default exampleController;