import anzAuthService from '../services/anzAuthService.js';
import anzAccountService from '../services/anzAccountService.js';

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

    // DELETE /api/anz/connection — revoke and forget
    async disconnect(req, res) {
        try {
            const result = await anzAuthService.disconnect(req.userId);
            res.json(result);
        } catch (error) {
            console.error('ANZ disconnect failed:', error.message);
            res.status(statusForError(error.message)).json({ error: error.message });
        }
    },
};

export default anzController;
