import anzAuthService from '../services/anzAuthService.js';
import anzAccountService from '../services/anzAccountService.js';
import anzSyncService from '../services/anzSyncService.js';
import dashboardService from '../services/dashboardService.js';
import bankDataRepo from '../repositories/bankDataRepo.js';

/**
 * Nothing here returns an ANZ access or refresh token. The browser only ever
 * receives connection status and account data.
 */

function statusForError(message) {
    if (message === 'No ANZ connection found') return 404;
    if (message.startsWith('ANZ is not configured')) return 503;
    if (message.startsWith('ANZ private key')) return 503;
    return 400;
}

const anzController = {
    // POST /api/anz/connect — begin the OAuth flow
    async connect(req, res) {
        try {
            const result = await anzAuthService.buildAuthorizationUrl(req.userId);
            res.json(result);
        } catch (error) {
            console.error('ANZ connect failed:', error.message);
            res.status(statusForError(error.message)).json({ error: error.message });
        }
    },

    // POST /api/anz/callback — finish the OAuth flow and prove it worked
    async callback(req, res) {
        try {
            const { code, state, id_token: idToken } = req.body || {};

            await anzAuthService.exchangeCode(req.userId, { code, state, idToken });

            // Fetching accounts here turns "tokens stored" into visible proof.
            // A failure at this point still leaves a valid connection, so it
            // must not fail the whole request.
            let accounts = [];
            let accountsError = null;

            try {
                accounts = await anzAccountService.listAccounts(req.userId);
            } catch (error) {
                console.error('ANZ connected but fetching accounts failed:', error.message);
                accountsError = error.message;
            }

            // Kick off the first data sync so the dashboard has something to
            // show immediately. Best-effort for the same reason as above.
            try {
                await anzSyncService.sync(req.userId);
            } catch (error) {
                console.error('ANZ connected but initial sync failed:', error.message);
            }

            const status = await anzAuthService.getStatus(req.userId);

            res.json({ ...status, accounts, accountsError });
        } catch (error) {
            console.error('ANZ callback failed:', error.message);
            res.status(statusForError(error.message)).json({ error: error.message });
        }
    },

    // GET /api/anz/status — is this user connected?
    async status(req, res) {
        try {
            const status = await anzAuthService.getStatus(req.userId);
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/anz/accounts — consented account list
    async accounts(req, res) {
        try {
            const accounts = await anzAccountService.listAccounts(req.userId);
            res.json(accounts);
        } catch (error) {
            console.error('ANZ accounts fetch failed:', error.message);
            res.status(statusForError(error.message)).json({ error: error.message });
        }
    },

    // POST /api/anz/sync — pull balances + transactions into Firestore and
    // re-run subscription detection
    async sync(req, res) {
        try {
            const summary = await anzSyncService.sync(req.userId);
            res.json(summary);
        } catch (error) {
            console.error('ANZ sync failed:', error.message);
            res.status(statusForError(error.message)).json({ error: error.message });
        }
    },

    // GET /api/anz/bank-accounts — synced accounts + balances, read locally
    async bankAccounts(req, res) {
        try {
            const accounts = await bankDataRepo.listAccounts(req.userId);
            res.json(accounts);
        } catch (error) {
            console.error('Bank accounts read failed:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/anz/transactions — recent transactions, read locally
    async transactions(req, res) {
        try {
            const { accountId, limit } = req.query;
            const transactions = await bankDataRepo.listTransactions(req.userId, {
                accountId: accountId || undefined,
                limit: limit ? Number(limit) : undefined,
            });
            res.json(transactions);
        } catch (error) {
            console.error('Transactions read failed:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/anz/dashboard — computed dashboard figures, read locally
    async dashboard(req, res) {
        try {
            const data = await dashboardService.getDashboard(req.userId);
            res.json(data);
        } catch (error) {
            console.error('Dashboard read failed:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // DELETE /api/anz/connection — revoke and forget
    async disconnect(req, res) {
        try {
            const result = await anzAuthService.disconnect(req.userId);
            // Remove synced bank data too, so unlinking leaves nothing behind.
            try {
                await bankDataRepo.deleteAllBankData(req.userId);
            } catch (error) {
                console.error('Bank data cleanup failed on disconnect:', error.message);
            }
            res.json(result);
        } catch (error) {
            console.error('ANZ disconnect failed:', error.message);
            res.status(statusForError(error.message)).json({ error: error.message });
        }
    },
};

export default anzController;
