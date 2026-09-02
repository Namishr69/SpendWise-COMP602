import { randomUUID } from 'crypto';
import anzConfig, { assertAnzConfigured } from '../config/anz.js';
import anzJwtService from './anzJwtService.js';
import anzConnectionRepo from '../repositories/anzConnectionRepo.js';

/**
 * Orchestrates the ANZ Open Banking authorisation code flow.
 *
 * The sequence, which the sandbox's discovery document dictates:
 *   1. client_credentials token  (private_key_jwt assertion)
 *   2. create an account-access consent  -> ConsentId
 *   3. sign a request object binding that ConsentId, redirect the user
 *   4. exchange the returned code for user-scoped tokens
 *
 * Access and refresh tokens are written to Firestore and never returned to the
 * browser. Callers that need to talk to ANZ go through getValidAccessToken().
 */

const AUTH_SESSION_TTL_MS = 10 * 60 * 1000;
// Refresh a little early so a token cannot expire mid-request.
const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

/** Reads an OAuth error body and turns it into something a human can act on. */
async function readOAuthError(response, context) {
    const body = await response.text().catch(() => '');

    let detail = body;
    try {
        const parsed = JSON.parse(body);
        detail = parsed.error_description || parsed.error || parsed.Message || body;
    } catch {
        // Not JSON — the raw text is the best detail available.
    }

    return new Error(
        `${context} failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`
    );
}

/** POSTs a form-encoded grant to the token endpoint with a client assertion. */
async function requestToken(params, context) {
    assertAnzConfigured();

    const clientAssertion = await anzJwtService.createClientAssertion();

    const body = new URLSearchParams({
        ...params,
        client_id: anzConfig.clientId,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
    });

    const response = await fetch(anzConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body,
    });

    if (!response.ok) {
        throw await readOAuthError(response, `${context} token request`);
    }

    return await response.json();
}

/** Turns a token response into the shape we persist. */
function toStoredTokens(tokens) {
    const expiresInMs = Number(tokens.expires_in || 300) * 1000;

    return {
        accessToken: tokens.access_token,
        // A refresh token is only issued when the offline/refresh grant applies;
        // keep any existing one if this response omits it.
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
        scope: tokens.scope || anzConfig.scopes,
        tokenType: tokens.token_type || 'Bearer',
    };
}

const anzAuthService = {
    /**
     * Step 1 — a client-level token, used to create the consent before any
     * user is involved. Also the cheapest way to prove the signing key and
     * client registration are correct.
     */
    async getClientCredentialsToken() {
        return await requestToken(
            { grant_type: 'client_credentials', scope: 'accounts' },
            'Client credentials'
        );
    },

    /**
     * Step 2 — register the user's intent with ANZ and get back the ConsentId
     * that the authorisation request must reference.
     */
    async createAccountConsent() {
        const { access_token: accessToken } = await this.getClientCredentialsToken();

        // 90 days is the standard maximum consent lifetime, and we ask for a
        // year of history so subscription detection has something to work with.
        const now = new Date();
        const expiration = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const historyFrom = new Date('2018-01-01T00:00:00.000Z');

        const response = await fetch(`${anzConfig.resourceBaseUrl}/account-access-consents`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'x-fapi-interaction-id': randomUUID(),
                'x-fapi-auth-date': now.toUTCString(),
            },
            body: JSON.stringify({
                // NZ Banking Data API v2.3 nests the consent under Data.Consent.
                // A flat Data.Permissions (UK OBIE style) is rejected with
                // HTTP 400 "Invalid parameters".
                Data: {
                    Consent: {
                        Permissions: [
                            'ReadAccountsDetail',
                            'ReadBalances',
                            'ReadTransactionsDetail',
                            'ReadTransactionsCredits',
                            'ReadTransactionsDebits',
                        ],
                        ExpirationDateTime: expiration.toISOString(),
                        TransactionFromDateTime: historyFrom.toISOString(),
                    },
                },
                Risk: {},
            }),
        });

        if (!response.ok) {
            // Surface the whole body: ANZ's 400s name the offending field only
            // in the response payload, not in the summary message.
            const body = await response.text().catch(() => '');
            console.error('ANZ account-access-consent rejected:', response.status, body);
            throw new Error(
                `Account access consent failed (HTTP ${response.status})${body ? `: ${body}` : ''}`
            );
        }

        const payload = await response.json();
        const consentId = payload?.Data?.ConsentId;

        if (!consentId) {
            throw new Error('ANZ did not return a ConsentId for the account access consent');
        }

        return consentId;
    },

    /**
     * Step 3 — create the consent, persist the handshake state, and build the
     * URL to send the user to. The state/nonce/verifier are stored server-side
     * so the callback can prove the response belongs to this request.
     */
    async buildAuthorizationUrl(userId) {
        assertAnzConfigured();

        const consentId = await this.createAccountConsent();

        const state = anzJwtService.randomToken();
        const nonce = anzJwtService.randomToken();
        const { codeVerifier, codeChallenge } = anzJwtService.generatePkcePair();

        await anzConnectionRepo.saveAuthSession(userId, state, {
            consentId,
            nonce,
            codeVerifier,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString(),
        });

        const requestObject = await anzJwtService.createRequestObject({
            state,
            nonce,
            codeChallenge,
            consentId,
        });

        // The signed request object carries the real parameters; the query
        // params are the duplicates the spec still requires alongside it.
        const params = new URLSearchParams({
            client_id: anzConfig.clientId,
            response_type: anzConfig.responseType,
            scope: anzConfig.scopes,
            redirect_uri: anzConfig.redirectUri,
        });

        if (anzConfig.usePar) {
            params.set('request_uri', await this.pushAuthorizationRequest(requestObject));
        } else {
            params.set('request', requestObject);
        }

        return {
            authorizationUrl: `${anzConfig.authorizationEndpoint}?${params.toString()}`,
            consentId,
        };
    },

    /**
     * Optional PAR leg. Pushing the request object server-side keeps it off the
     * browser's URL, which matters because a signed request object is long.
     */
    async pushAuthorizationRequest(requestObject) {
        assertAnzConfigured();
    
        const clientAssertion = await anzJwtService.createClientAssertion();
    
        const response = await fetch(anzConfig.parEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams({
                request: requestObject,
                client_id: anzConfig.clientId,
                client_assertion_type:
                    'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: clientAssertion,
            }),
        });
    
        console.log('ANZ PAR status:', response.status);
    
        if (!response.ok) {
            const body = await response.text().catch(() => '');
    
            console.error('ANZ PAR error response:', body);
    
            let detail = body;
    
            try {
                const parsed = JSON.parse(body);
                detail =
                    parsed.error_description ||
                    parsed.error ||
                    parsed.Message ||
                    body;
            } catch {
                // Keep the raw response if it isn't JSON.
            }
    
            throw new Error(
                `Pushed authorization request failed (HTTP ${response.status})${
                    detail ? `: ${detail}` : ''
                }`
            );
        }
    
        const payload = await response.json();
    
        console.log('ANZ PAR response:', payload);
    
        if (!payload.request_uri) {
            throw new Error(
                'ANZ PAR response did not include a request_uri'
            );
        }
    
        return payload.request_uri;
    },
    

    /**
     * Step 4 — validate the callback against the stored session, then swap the
     * code for tokens. The session is deleted either way, making state
     * single-use.
     */
    async exchangeCode(userId, { code, state, idToken }) {
        if (!code) throw new Error('Authorization code is missing');
        if (!state) throw new Error('State is missing');

        const session = await anzConnectionRepo.findAuthSession(userId, state);
        if (!session) {
            throw new Error('Unknown or already-used authorization state');
        }

        // Consume the session before anything else can go wrong, so a failed
        // exchange cannot be retried against the same state.
        await anzConnectionRepo.deleteAuthSession(userId, state);

        if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
            throw new Error('Authorization session expired — please try connecting again');
        }

        if (idToken) {
            // Hybrid flow: prove the response came from ANZ and matches our nonce.
            await anzJwtService.verifyIdToken(idToken, session.nonce);
        }

        const tokens = await requestToken(
            {
                grant_type: 'authorization_code',
                code,
                redirect_uri: anzConfig.redirectUri,
                code_verifier: session.codeVerifier,
            },
            'Authorization code'
        );

        const stored = toStoredTokens(tokens);

        return await anzConnectionRepo.saveConnection(userId, {
            provider: 'anz',
            bankName: 'ANZ',
            consentId: session.consentId,
            status: 'connected',
            connectedAt: new Date().toISOString(),
            ...stored,
        });
    },

    /**
     * Returns a usable access token, refreshing it first if it has expired.
     * Every ANZ resource call goes through here.
     */
    async getValidAccessToken(userId) {
        const connection = await anzConnectionRepo.getConnection(userId);

        if (!connection) {
            throw new Error('No ANZ connection found');
        }

        const expiresAt = new Date(connection.expiresAt).getTime();
        const stillValid = Number.isFinite(expiresAt)
            && expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now();

        if (stillValid) {
            return connection.accessToken;
        }

        if (!connection.refreshToken) {
            throw new Error('ANZ access token expired and no refresh token is available — please reconnect');
        }

        const tokens = await requestToken(
            { grant_type: 'refresh_token', refresh_token: connection.refreshToken },
            'Token refresh'
        );

        const stored = toStoredTokens(tokens);
        const updated = await anzConnectionRepo.updateConnection(userId, {
            ...stored,
            // Providers may rotate the refresh token or omit it; never null out
            // a working one.
            refreshToken: stored.refreshToken || connection.refreshToken,
            refreshedAt: new Date().toISOString(),
        });

        return updated.accessToken;
    },

    /** Connection status for the UI. Deliberately excludes every token. */
    async getStatus(userId) {
        const connection = await anzConnectionRepo.getConnection(userId);

        if (!connection) {
            return { connected: false };
        }

        return {
            connected: true,
            bankName: connection.bankName || 'ANZ',
            consentId: connection.consentId,
            connectedAt: connection.connectedAt,
            scope: connection.scope,
            expiresAt: connection.expiresAt,
        };
    },

    /**
     * Revokes at ANZ then forgets locally. A revocation failure must not leave
     * the user stuck connected, so it is logged rather than thrown.
     */
    async disconnect(userId) {
        const connection = await anzConnectionRepo.getConnection(userId);

        if (!connection) {
            return { disconnected: false, reason: 'No ANZ connection found' };
        }

        if (connection.refreshToken) {
            try {
                const clientAssertion = await anzJwtService.createClientAssertion();

                await fetch(anzConfig.revocationEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        token: connection.refreshToken,
                        token_type_hint: 'refresh_token',
                        client_id: anzConfig.clientId,
                        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                        client_assertion: clientAssertion,
                    }),
                });
            } catch (error) {
                console.error('ANZ token revocation failed, removing local connection anyway:', error.message);
            }
        }

        await anzConnectionRepo.deleteConnection(userId);

        return { disconnected: true };
    },
};

export default anzAuthService;