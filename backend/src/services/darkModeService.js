import userRepository from '../repositories/userRepository.js';

const darkModeService = {
    async updateDarkMode(userId, darkMode) {
        if (typeof darkMode !== 'boolean') {
            throw new Error('darkMode must be true or false');
        }

        return await userRepository.updateDarkMode(userId, darkMode);
    },
};

export default darkModeService;