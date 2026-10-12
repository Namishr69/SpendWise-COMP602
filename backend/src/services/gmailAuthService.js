import { randomBytes } from 'crypto';
import gmailConfig, { assertGmailConfigured } from '../config/gmail.js';
import gmailConnectionRepo from '../repositories/gmailConnectionRepo.js';

/**
 * Orchestrates the Google OAuth 2.0 authorization-code flow for read-only Gmail
 * access.
 *
 * The sequence:
 *   1. buildAuthorizationUrl — persist handshake state, send the user to Google
 *   2. exchangeCode — validate state, swap the code for access + refresh tokens
 *   3. getValidAccessToken — hand callers a live token, refreshing transparently
 *
 * Access and refresh tokens are written to Firestore and never returned to the
 * browser (same invariant as the ANZ connection). Callers that need to read
 * Gmail go through getValidAccessToken().
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
    detail = parsed.error_description || parsed.error || body;
  } catch {
    // Not JSON — the raw text is the best detail available.
  }

  return new Error(
    `${context} failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`
  );
}

/** POSTs a form-encoded grant to Google's token endpoint. */
async function requestToken(params, context) {
  assertGmailConfigured();

  const body = new URLSearchParams({
    ...params,
    client_id: gmailConfig.clientId,
    client_secret: gmailConfig.clientSecret,
  });

  const response = await fetch(gmailConfig.tokenEndpoint, {
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
  const expiresInMs = Number(tokens.expires_in || 3600) * 1000;

  return {
    accessToken: tokens.access_token,
    // Google only returns a refresh token on the first consent (or when
    // prompt=consent forces it); keep any existing one if this response omits it.
    refreshToken: tokens.refresh_token || null,
    accessTokenExpiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    scope: tokens.scope || gmailConfig.scopes,
    tokenType: tokens.token_type || 'Bearer',
  };
}

/** Minimal Gmail profile lookup used during connect to capture the address. */
async function fetchEmailAddress(accessToken) {
  const response = await fetch(`${gmailConfig.gmailApiBaseUrl}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Gmail profile request failed (HTTP ${response.status})${body ? `: ${body}` : ''}`
    );
  }

  const payload = await response.json();
  return payload.emailAddress || null;
}

const gmailAuthService = {
  /**
   * Step 1 — persist the handshake state and build the Google consent URL.
   * access_type=offline + prompt=consent guarantee a refresh token even on a
   * reconnect, so background re-syncing keeps working without re-prompting.
   */
  async buildAuthorizationUrl(userId) {
    assertGmailConfigured();

    const state = randomBytes(32).toString('hex');

    await gmailConnectionRepo.saveAuthSession(userId, state, {
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString(),
    });

    const params = new URLSearchParams({
      client_id: gmailConfig.clientId,
      redirect_uri: gmailConfig.redirectUri,
      response_type: 'code',
      scope: gmailConfig.scopes,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return {
      authorizationUrl: `${gmailConfig.authorizationEndpoint}?${params.toString()}`,
    };
  },

  /**
   * Step 2 — validate the callback against the stored session, then swap the
   * code for tokens. The session is deleted either way, making state single-use.
   */
  async exchangeCode(userId, { code, state }) {
    if (!code) throw new Error('Authorization code is missing');
    if (!state) throw new Error('State is missing');

    const session = await gmailConnectionRepo.findAuthSession(userId, state);
    if (!session) {
      throw new Error('Unknown or already-used authorization state');
    }

    // Consume the session before anything else can go wrong, so a failed
    // exchange cannot be retried against the same state.
    await gmailConnectionRepo.deleteAuthSession(userId, state);

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      throw new Error('Authorization session expired — please try connecting again');
    }

    const tokens = await requestToken(
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: gmailConfig.redirectUri,
      },
      'Authorization code'
    );

    const stored = toStoredTokens(tokens);

    if (!stored.refreshToken) {
      // Without a refresh token we cannot read mail in the background later,
      // which is the whole point of the connection. prompt=consent is meant to
      // force one; if Google still omitted it the user previously authorized
      // and must revoke before reconnecting.
      throw new Error(
        'Google did not return a refresh token. Remove SpendWise under your ' +
        'Google account’s third-party access, then connect again.'
      );
    }

    // Capture which mailbox this is, so the UI can show it. Best-effort — a
    // valid connection still exists if this read fails.
    let emailAddress = null;
    try {
      emailAddress = await fetchEmailAddress(stored.accessToken);
    } catch (error) {
      console.error('Gmail connected but profile lookup failed:', error.message);
    }

    return await gmailConnectionRepo.saveConnection(userId, {
      provider: 'gmail',
      emailAddress,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      ...stored,
    });
  },

  /**
   * Returns a usable access token, refreshing it first if it has expired.
   * Every Gmail API call goes through here.
   */
  async getValidAccessToken(userId) {
    const connection = await gmailConnectionRepo.getConnection(userId);

    if (!connection) {
      throw new Error('No Gmail connection found');
    }

    const expiresAt = new Date(connection.accessTokenExpiresAt).getTime();
    const stillValid = Number.isFinite(expiresAt)
      && expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now();

    if (stillValid) {
      return connection.accessToken;
    }

    if (!connection.refreshToken) {
      throw new Error('Gmail access token expired and no refresh token is available — please reconnect');
    }

    const tokens = await requestToken(
      { grant_type: 'refresh_token', refresh_token: connection.refreshToken },
      'Token refresh'
    );

    const stored = toStoredTokens(tokens);
    const updated = await gmailConnectionRepo.updateConnection(userId, {
      accessToken: stored.accessToken,
      accessTokenExpiresAt: stored.accessTokenExpiresAt,
      scope: stored.scope,
      tokenType: stored.tokenType,
      // Google rarely rotates the refresh token and may omit it on refresh;
      // never null out a working one.
      refreshToken: stored.refreshToken || connection.refreshToken,
      refreshedAt: new Date().toISOString(),
    });

    return updated.accessToken;
  },

  /** Connection status for the UI. Deliberately excludes every token. */
  async getStatus(userId) {
    const connection = await gmailConnectionRepo.getConnection(userId);

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      emailAddress: connection.emailAddress || null,
      connectedAt: connection.connectedAt,
      scope: connection.scope,
    };
  },

  /**
   * Revokes at Google then forgets locally. A revocation failure must not leave
   * the user stuck connected, so it is logged rather than thrown.
   */
  async disconnect(userId) {
    const connection = await gmailConnectionRepo.getConnection(userId);

    if (!connection) {
      return { disconnected: false, reason: 'No Gmail connection found' };
    }

    const token = connection.refreshToken || connection.accessToken;
    if (token) {
      try {
        await fetch(gmailConfig.revocationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token }),
        });
      } catch (error) {
        console.error('Gmail token revocation failed, removing local connection anyway:', error.message);
      }
    }

    await gmailConnectionRepo.deleteConnection(userId);

    return { disconnected: true };
  },
};

export default gmailAuthService;
