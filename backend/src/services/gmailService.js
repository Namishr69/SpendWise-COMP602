import gmailConfig from '../config/gmail.js';
import gmailAuthService from './gmailAuthService.js';
import gmailConnectionRepo from '../repositories/gmailConnectionRepo.js';

/**
 * Reads from the Gmail REST API with the user's consented access token
 * (obtained via the authorization-code flow and refreshed transparently by
 * gmailAuthService.getValidAccessToken).
 *
 * This story's job is to PROVE read access works, not to parse subscriptions —
 * so it exposes the mailbox profile and a few recent message subjects. The
 * follow-up parsing story reads messages the same way and replaces
 * listRecentSubjects with real receipt detection.
 */

/** Authorised GET against the Gmail API, returning parsed JSON. */
async function gmailGet(accessToken, path) {
  const response = await fetch(`${gmailConfig.gmailApiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Gmail API GET ${path} failed (HTTP ${response.status})${body ? `: ${body}` : ''}`
    );
  }

  return await response.json();
}

/** Case-insensitive lookup of a header value in a Gmail message payload. */
function headerValue(headers, name) {
  const match = (headers || []).find(
    (h) => h.name && h.name.toLowerCase() === name.toLowerCase()
  );
  return match ? match.value : null;
}

const gmailService = {
  /** Mailbox profile: which address connected and how many messages it holds. */
  async getProfile(userId) {
    const connection = await gmailConnectionRepo.getConnection(userId);
    if (!connection) {
      throw new Error('No Gmail connection found');
    }

    const accessToken = await gmailAuthService.getValidAccessToken(userId);
    const payload = await gmailGet(accessToken, '/profile');

    return {
      emailAddress: payload.emailAddress || null,
      messagesTotal: typeof payload.messagesTotal === 'number' ? payload.messagesTotal : null,
    };
  },

  /**
   * A few recent message subjects — concrete proof SpendWise can read the inbox.
   * Metadata format only (Subject/From/Date headers), never the message body.
   */
  async listRecentSubjects(userId, { limit = 5 } = {}) {
    const connection = await gmailConnectionRepo.getConnection(userId);
    if (!connection) {
      throw new Error('No Gmail connection found');
    }

    const accessToken = await gmailAuthService.getValidAccessToken(userId);

    const list = await gmailGet(accessToken, `/messages?maxResults=${limit}`);
    const ids = (list.messages || []).map((m) => m.id);

    const messages = [];
    for (const id of ids) {
      // One message failing to load must not blank out the whole proof list.
      try {
        const msg = await gmailGet(
          accessToken,
          `/messages/${id}?format=metadata` +
            '&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date'
        );
        const headers = msg.payload?.headers;
        messages.push({
          id,
          subject: headerValue(headers, 'Subject') || '(no subject)',
          from: headerValue(headers, 'From') || '',
          date: headerValue(headers, 'Date') || '',
          snippet: msg.snippet || '',
        });
      } catch (error) {
        console.error(`Gmail message ${id} fetch failed:`, error.message);
      }
    }

    return messages;
  },
};

export default gmailService;
