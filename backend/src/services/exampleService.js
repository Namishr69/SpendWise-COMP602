import exampleRepo from '../repositories/exampleRepo.js';

const exampleService = {
  async getAllItems(userId) {
    return await exampleRepo.getAll(userId);
  },

  async createItem(userId, data) {
    if (!data.name) {
      throw new Error('Name is required');
    }
    return await exampleRepo.create(userId, {
      name: data.name,
      createdAt: new Date().toISOString(),
    });
  },
};

export default exampleService;