/**
 * Reads likely price change emails from the user's Gmail with a short-lived
 * OAuth access token (gmail.readonly) obtained in the browser. The token is
 * used for this one request and never stored.
 */

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Narrows the inbox to recent emails that talk about a price changing; the
// parser makes the final call on each one.
const PRICE_CHANGE_QUERY =
    'newer_than:180d (subject:price OR subject:pricing OR "price is changing" OR "price increase" OR "new price")';

const MAX_MESSAGES = 25;

function gmailError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function gmailGet(accessToken, path) {
    const res = await fetch(`${GMAIL_API}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
        throw gmailError(401, 'Gmail access has expired. Connect Gmail again to scan.');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        // A 403 usually means the scope was not granted or the Gmail API is not
        // enabled for the project; Google's message says which.
        throw gmailError(502, `Gmail request failed: ${data?.error?.message || res.status}`);
    }

    return data;
}

function decodeBase64Url(data) {
    return Buffer.from(data || '', 'base64url').toString('utf8');
}

function htmlToText(html) {
    return html
        .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&#36;|&dollar;/gi, '$')
        .replace(/&pound;/gi, '£')
        .replace(/&euro;/gi, '€')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&quot;/gi, '"');
}

/** Collects every part of a (possibly nested multipart) message payload. */
function flattenParts(part) {
    return [part, ...(part.parts || []).flatMap(flattenParts)];
}

/** The message body as plain text, preferring the text/plain part. */
function extractBody(payload) {
    const parts = flattenParts(payload);
    const plain = parts.find((part) => part.mimeType === 'text/plain' && part.body?.data);
    if (plain) return decodeBase64Url(plain.body.data);

    const html = parts.find((part) => part.mimeType === 'text/html' && part.body?.data);
    if (html) return htmlToText(decodeBase64Url(html.body.data));

    return '';
}

function header(payload, name) {
    const found = (payload.headers || []).find(
        (h) => h.name.toLowerCase() === name.toLowerCase()
    );
    return found ? found.value : '';
}

const gmailService = {
    /**
     * Returns recent candidate emails as { id, from, subject, body, receivedAt }.
     */
    async fetchPriceChangeEmails(accessToken) {
        const query = new URLSearchParams({ q: PRICE_CHANGE_QUERY, maxResults: String(MAX_MESSAGES) });
        const list = await gmailGet(accessToken, `/messages?${query}`);
        const ids = (list.messages || []).map((message) => message.id);

        const messages = await Promise.all(
            ids.map((id) => gmailGet(accessToken, `/messages/${id}?format=full`))
        );

        return messages.map((message) => ({
            id: message.id,
            from: header(message.payload, 'From'),
            subject: header(message.payload, 'Subject'),
            body: extractBody(message.payload).replace(/\s+/g, ' ').trim(),
            receivedAt: new Date(Number(message.internalDate)).toISOString(),
        }));
    },
};

export default gmailService;
