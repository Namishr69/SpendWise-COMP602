import userRepository from '../repositories/userRepository.js';

const SUPPORTED_LANGUAGES = [
    'en',
    'fil',
    'mi',
    'es',
    'fr',
];

const languageService = {
    async getPreferredLanguage(userId) {
        const user = await userRepository.getUserById(userId);

        return user?.preferredLanguage || 'en';
    },

    async updatePreferredLanguage(userId, language) {
        if (!language) {
            throw new Error('Language is required');
        }

        if (!SUPPORTED_LANGUAGES.includes(language)) {
            throw new Error('Unsupported language');
        }

        return await userRepository.updatePreferredLanguage(
            userId,
            language
        );
    },
};

export default languageService;