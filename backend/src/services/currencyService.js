import userRepository from '../repositories/userRepository.js';

const SUPPORTED_CURRENCIES = [
    'NZD',
    'AUD',
    'USD',
    'CAD',
    'EUR',
    'GBP',
    'JPY',
    'SGD',
    'PHP',
    'CNY',
    'KRW',
    'INR',
    'CHF',
];

const currencyService = {
    async updatePreferredCurrency(userId, currency) {
        if (!currency) {
            throw new Error('Currency is required');
        }

        if (!SUPPORTED_CURRENCIES.includes(currency)) {
            throw new Error('Unsupported currency');
        }

        return await userRepository.updatePreferredCurrency(userId, currency);
    },
};

export default currencyService;