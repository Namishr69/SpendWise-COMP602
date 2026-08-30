import { randomUUID } from 'crypto';
import anzConfig, { IS_MOCK } from '../config/anz.js';
import anzAuthService from './anzAuthService.js';
import anzConnectionRepo from '../repositories/anzConnectionRepo.js';

/**
 * Reads account data from the ANZ Account Information API.
 *
 * This exists to prove the OAuth connection actually works — a connection you
 * cannot demonstrate is not a connection. Transaction import is a later ticket.
 */

const MOCK_ACCOUNTS = [
    {
        accountId: 'mock-acc-0001',
        nickname: 'Everyday',
        accountType: 'Personal',
        accountSubType: 'CurrentAccount',
        currency: 'NZD',
        identification: '01-0123-0456789-00',
        servicer: 'ANZ Bank New Zealand',
    },
    {
        accountId: 'mock-acc-0002',
        nickname: 'Savings',
        accountType: 'Personal',
        accountSubType: 'Savings',
        currency: 'NZD',
        identification: '01-0123-0456789-01',
        servicer: 'ANZ Bank New Zealand',
    },
];

/**
 * Flattens ANZ's nested account payload into the shape the UI needs.
 * Every field is optional in practice, so each one is defended.
 */
function mapAccount(raw) {
    const account = Array.isArray(raw.Account) ? raw.Account[0] : raw.Account;

    return {
        accountId: raw.AccountId,
        nickname: raw.Nickname || account?.Name || 'Account',
        accountType: raw.AccountType,
        accountSubType: raw.AccountSubType,
        currency: raw.Currency,
        identification: account?.Identification || null,
        servicer: raw.Servicer?.Identification || 'ANZ Bank New Zealand',
    };
}

const anzAccountService = {
    /**
     * Lists the consented accounts. Relies on getValidAccessToken() to refresh
     * an expired token transparently.
     */
    async listAccounts(userId) {
        const connection = await anzConnectionRepo.getConnection(userId);
        if (!connection) {
            throw new Error('No ANZ connection found');
        }

        if (IS_MOCK) {
            return MOCK_ACCOUNTS;
        }

        const accessToken = await anzAuthService.getValidAccessToken(userId);

        const response = await fetch(`${anzConfig.resourceBaseUrl}/accounts`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                // FAPI requires an interaction id so a request can be traced
                // end to end when ANZ support asks for one.
                'x-fapi-interaction-id': randomUUID(),
                'x-fapi-auth-date': new Date().toUTCString(),
            },
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(
                `Failed to fetch ANZ accounts (HTTP ${response.status})${body ? `: ${body}` : ''}`
            );
        }

        const payload = await response.json();
        const accounts = payload?.Data?.Account || [];

        return accounts.map(mapAccount);
    },
};

export default anzAccountService;
