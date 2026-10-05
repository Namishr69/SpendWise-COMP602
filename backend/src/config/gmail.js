/**
 * Google OAuth 2.0 + Gmail API configuration for the "Connect Gmail" feature.
 *
 * SpendWise reads a user's Gmail (read-only) to find subscription
 * confirmations. Reading mail is a separate authorization from Firebase
 * sign-in: Firebase proves who the user is but grants no mailbox access and
 * returns no refresh token, so we run our own OAuth flow and hold the tokens
 * server-side — mirroring the ANZ connection in config/anz.js.
 *
 * Every value comes from the environment so the same code runs locally and on
 * a hosted deploy; the OAuth/Gmail endpoints are stable Google URLs.
 */

export const gmailConfig = {
  clientId: process.env.GMAIL_CLIENT_ID || '',
  clientSecret: process.env.GMAIL_CLIENT_SECRET || '',

  // Where Google sends the browser back to. Must exactly match an "Authorized
  // redirect URI" on the OAuth client in Google Cloud Console. This is the
  // FRONTEND route (Vite dev server on 5173 by default), which forwards
  // code+state to the backend with the Firebase ID token attached — the same
  // reason the ANZ callback lands on the frontend.
  redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:5173/gmail/callback',

  // Read-only mailbox access + identity so we can show which account connected.
  scopes:
    process.env.GMAIL_SCOPES ||
    'openid email https://www.googleapis.com/auth/gmail.readonly',

  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  // Gmail REST API, scoped to the authenticated user ("me").
  gmailApiBaseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me',
};

/**
 * Fails fast with an actionable message rather than letting a half-configured
 * request reach Google and come back as an opaque invalid_client.
 */
export function assertGmailConfigured() {
  const missing = [];
  if (!gmailConfig.clientId) missing.push('GMAIL_CLIENT_ID');
  if (!gmailConfig.clientSecret) missing.push('GMAIL_CLIENT_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Gmail is not configured: missing ${missing.join(', ')}. Set them in backend/.env.`
    );
  }
}

export default gmailConfig;
