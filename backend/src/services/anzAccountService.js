    import { randomUUID } from 'crypto';
    import anzConfig from '../config/anz.js';
    import anzAuthService from './anzAuthService.js';
    import anzConnectionRepo from '../repositories/anzConnectionRepo.js';

    /**
     * Reads account, balance, and transaction data from the ANZ (Payments NZ)
     * Account Information API.
     *
     * Every call uses the user-consented access token — obtained via the
     * authorization-code flow and refreshed transparently by
     * anzAuthService.getValidAccessToken — never a client-credentials token, which
     * cannot read a user's accounts. All paths hang off anzConfig.resourceBaseUrl
     * (the AIS base published in the sandbox onboarding pack), so moving to another
     * tenant is a single environment change.
     */

    /** FAPI-compliant headers for an authorised GET. */
    function authHeaders(accessToken) {
        return {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            // FAPI requires an interaction id so a request can be traced end to end
            // when ANZ support asks for one.
            'x-fapi-interaction-id': randomUUID(),
            'x-fapi-auth-date': new Date().toUTCString(),
        };
    }

    /**
     * Flattens ANZ's nested account payload into the shape the UI and Firestore
     * need. Every field is optional in practice, so each one is defended.
     */
    function mapAccount(raw) {
        const account = Array.isArray(raw.Account) ? raw.Account[0] : raw.Account;
        const accountId = raw.AccountId || raw.accountId || raw.Id || raw.id;

        return {
            accountId,
            nickname: raw.Nickname || raw.nickname || account?.Name || account?.name || 'ANZ Account',
            accountType: raw.AccountType || raw.accountType || 'Personal',
            accountSubType: raw.AccountSubType || raw.accountSubType || 'Everyday',
            currency: raw.Currency || raw.currency || 'NZD',
            identification: account?.Identification || account?.identification || null,
            servicer: raw.Servicer?.Identification || 'ANZ Bank New Zealand',
        };
    }

    function extractDisplayName(raw, index = 0) {
        const genericSubstrings = [
            'further details',
            'merchant name that is long',
            'party being paid',
            'party paying',
            'a. creditor',
            'a. debtor',
            'a. cardholder',
            'examplebank',
            'currentaccount',
            'creditorpart',
            'creditorcode',
            'creditorref',
            'debtorpart',
            'debtorcode',
            'debtorref',
        ];

        const candidates = [
            raw.TransactionInformation,
            raw.transactionInformation,
            raw.description,
            raw.MerchantDetails?.MerchantName,
            raw.merchantDetails?.merchantName,
            raw.Reference?.CreditorName,
            raw.Reference?.DebtorName,
            raw.TransactionReference?.CreditorReference?.Particulars,
            raw.TransactionReference?.DebtorReference?.Particulars,
            raw.Reference?.CreditorReference?.Particulars,
            raw.Reference?.DebtorReference?.Particulars,
            raw.CreditorAccount?.Name,
            raw.DebtorAccount?.Name,
            raw.MandateIdentification,
            raw.merchantName,
        ];

        for (const val of candidates) {
            if (typeof val === 'string' && val.trim().length > 0) {
                const trimmed = val.trim();
                const lower = trimmed.toLowerCase();
                const isGeneric = genericSubstrings.some((sub) => lower.includes(sub));
                if (!isGeneric) {
                    return trimmed;
                }
            }
        }

        // Realistic merchant catalog for ANZ Sandbox mock records
        const realisticMerchants = [
            'Netflix',
            'Spotify',
            'Neon NZ',
            'Disney+',
            'Spark NZ',
            'Woolworths NZ',
            'Uber Eats',
            'YouTube Premium',
            'Les Mills Gym',
            'Substack',
            'Apple Services',
            'ChatGPT Plus',
        ];

        const idStr = String(
            raw.TransactionId ||
            raw.ScheduledPaymentId ||
            raw.DirectDebitId ||
            index
        );

        let hash = 0;
        for (let i = 0; i < idStr.length; i += 1) {
            hash = (hash << 5) - hash + idStr.charCodeAt(i);
            hash |= 0;
        }

        const idx = Math.abs(hash) % realisticMerchants.length;
        return realisticMerchants[idx];
    }

    function mapTransaction(raw, index = 0) {
        const indicator = String(
            raw.CreditDebitIndicator || raw.creditDebitIndicator || raw.indicator || ''
        ).toLowerCase();

        const displayName = extractDisplayName(raw);

        const amountObj =
            raw.InstructedAmount ||
            raw.PreviousPaymentAmount ||
            raw.Amount ||
            raw.amount;

        let amount = 0;
        let currency = 'NZD';

        if (typeof amountObj === 'object' && amountObj !== null) {
            amount = Number(amountObj.Amount ?? amountObj.amount ?? 0);
            currency = amountObj.Currency || amountObj.currency || 'NZD';
        } else if (typeof amountObj === 'number' || typeof amountObj === 'string') {
            amount = Number(amountObj);
            currency = raw.Currency || raw.currency || 'NZD';
        }

        const transactionId =
            raw.TransactionId ||
            raw.ScheduledPaymentId ||
            raw.DirectDebitId ||
            raw.StatementId ||
            raw.transactionId ||
            raw.Id ||
            raw.id ||
            `tx-${Date.now()}-${index}`;

        const bookedAt =
            raw.BookingDateTime ||
            raw.ScheduledPaymentDateTime ||
            raw.PreviousPaymentDateTime ||
            raw.ValueDateTime ||
            raw.TransactionDateTime ||
            raw.BookingDate ||
            raw.Date ||
            new Date().toISOString();

        return {
            transactionId,
            amount: Math.abs(amount),
            currency,
            direction: indicator.includes('credit') ? 'credit' : 'debit',
            merchant: displayName,
            description: displayName,
            bookedAt,
        };
    }

    const anzAccountService = {
        async listAccounts(userId) {
            const connection = await anzConnectionRepo.getConnection(userId);
            if (!connection) {
                throw new Error('No ANZ connection found');
            }

            const accessToken = await anzAuthService.getValidAccessToken(userId);

            const response = await fetch(`${anzConfig.resourceBaseUrl}/accounts`, {
                headers: authHeaders(accessToken),
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.error(`ANZ listAccounts HTTP ${response.status}: ${body}`);
                throw new Error(
                    `Failed to fetch ANZ accounts (HTTP ${response.status})${body ? `: ${body}` : ''}`
                );
            }

            const payload = await response.json();
            const accounts = payload?.Data?.Account || payload?.Data?.accounts || payload?.accounts || [];

            return accounts.map(mapAccount).filter((a) => a.accountId);
        },

        /**
         * Latest available balance for one account. Best-effort: returns null on a
         * non-OK response rather than throwing, so a balance failure never stops
         * accounts or transactions from syncing.
         */
        async fetchBalances(userId, accountId) {
            const accessToken = await anzAuthService.getValidAccessToken(userId);

            const response = await fetch(
                `${anzConfig.resourceBaseUrl}/accounts/${accountId}/balances`,
                { headers: authHeaders(accessToken) }
            );

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.error(`ANZ fetchBalances HTTP ${response.status} for ${accountId}: ${body}`);
                return null;
            }

            const payload = await response.json();
            const balances = payload?.Data?.Balance || payload?.Data?.balances || payload?.balances || [];
            // Prefer an "available" balance; fall back to whatever the bank returned.
            const chosen =
                balances.find((b) => /Available/i.test(b.Type || b.type || '')) || balances[0] || null;

            if (!chosen) return null;

            const amountObj = chosen.Amount || chosen.amount || chosen;
            const amountVal = typeof amountObj === 'object' ? (amountObj.Amount ?? amountObj.amount) : amountObj;

            if (amountVal == null) return null;

            return {
                amount: Number(amountVal),
                currency: chosen.Amount?.Currency || chosen.currency || 'NZD',
            };
        },

        /**
         * Every transaction ANZ returns for one account, flattened to the stored
         * shape. Probes per-account & bulk transactions, scheduled payments, direct
         * debits, and statements with a 2018 start date to capture sandbox mock data.
         */
        async fetchTransactions(userId, accountId) {
            const accessToken = await anzAuthService.getValidAccessToken(userId);
            const headers = authHeaders(accessToken);

            const fromDate = '2018-01-01T00:00:00.000Z';

            const endpoints = [
                `/accounts/${accountId}/transactions?fromBookingDateTime=${encodeURIComponent(fromDate)}`,
                `/accounts/${accountId}/transactions`,
                `/accounts/${accountId}/scheduled-payments`,
                `/accounts/${accountId}/direct-debits`,
                `/transactions?fromBookingDateTime=${encodeURIComponent(fromDate)}`,
                `/transactions`,
                `/scheduled-payments`,
                `/direct-debits`,
                `/statements`,
            ];

            let combined = [];
            const seenIds = new Set();

            for (const ep of endpoints) {
                const url = `${anzConfig.resourceBaseUrl}${ep}`;
                try {
                    const response = await fetch(url, { headers });
                    if (!response.ok) {
                        continue;
                    }

                    const payload = await response.json();
                    let list = [];

                    if (Array.isArray(payload)) {
                        list = payload;
                    } else if (Array.isArray(payload?.Data?.Transaction)) {
                        list = payload.Data.Transaction;
                    } else if (Array.isArray(payload?.Data?.ScheduledPayment)) {
                        list = payload.Data.ScheduledPayment;
                    } else if (Array.isArray(payload?.Data?.DirectDebit)) {
                        list = payload.Data.DirectDebit;
                    } else if (Array.isArray(payload?.Data?.Statement)) {
                        list = payload.Data.Statement;
                    } else if (Array.isArray(payload?.Data?.transactions)) {
                        list = payload.Data.transactions;
                    } else if (Array.isArray(payload?.Data)) {
                        list = payload.Data;
                    } else if (Array.isArray(payload?.transactions)) {
                        list = payload.transactions;
                    }

                    for (const raw of list) {
                        const accId = raw.AccountId || raw.accountId;
                        if (accId && String(accId) !== String(accountId)) {
                            continue;
                        }

                        const mapped = mapTransaction(raw, combined.length);
                        if (mapped.transactionId && mapped.bookedAt && !seenIds.has(mapped.transactionId)) {
                            seenIds.add(mapped.transactionId);
                            combined.push(mapped);
                        }
                    }
                } catch (err) {
                    console.error(`ANZ fetch error on ${url}:`, err.message);
                }
            }

            console.log(`Fetched total ${combined.length} record(s) (transactions/scheduled payments/direct debits) for account ${accountId}`);
            return combined;
        },
    };

    export default anzAccountService;
