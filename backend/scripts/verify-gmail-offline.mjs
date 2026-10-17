/*
 * Offline verification harness for the Gmail connection flow.
 *
 * The agent sandbox blocks the npm registry, Google, Firestore, and port
 * binding, so this proves the logic without any of them:
 *   - global.fetch is stubbed to return canned Google/Gmail responses
 *   - gmailConnectionRepo is swapped for an in-memory store (Object.assign onto
 *     the module singleton, same trick the ANZ offline tests use)
 *   - a throwaway service account lets config/firebase.js load (Firestore is
 *     never actually read because the repo is stubbed)
 *
 * Run from the backend package:  node scripts/verify-gmail-offline.mjs
 * Exits non-zero if any check fails. Touches no network and no real Firestore.
 */

import { generateKeyPairSync } from 'node:crypto';

// ---- 1. Environment must be set BEFORE importing app modules -------------
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

process.env.SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'demo-project',
  private_key_id: 'demo',
  private_key: privateKey,
  client_email: 'demo@demo-project.iam.gserviceaccount.com',
  client_id: '1',
  token_uri: 'https://oauth2.googleapis.com/token',
});

process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REDIRECT_URI = 'http://localhost:5173/gmail/callback';

const SRC = new URL('../src/', import.meta.url);
const mod = (p) => import(new URL(p, SRC).href).then((m) => m.default);

// ---- 2. fetch stub --------------------------------------------------------
let fetchCalls = [];
let tokenResponseOverride = null; // lets a test force "no refresh token"

function jsonResponse(obj, ok = true, status = 200) {
  const text = JSON.stringify(obj);
  return { ok, status, json: async () => obj, text: async () => text };
}

// Gmail base64url-encodes message bodies; the parser decodes them. Plain
// base64 is fine here — the parser's -/_ → +// swap is a no-op on it.
const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64');

// Inbox fixtures used by the sync tests. m1/m2 are known-service subscriptions
// (→ subscription + transaction); m3's subject fails the receipt filter (never
// body-fetched); m4 passes the subject filter but has no amount (→ null); m5 is
// a one-off order from an unknown store (→ transaction only, not a sub).
const SYNC_MESSAGES = {
  m1: {
    from: 'Netflix <info@netflix.com>',
    subject: 'Your Netflix receipt',
    date: 'Mon, 06 Oct 2026 10:00:00 +1300',
    body: 'Thanks for your payment. Your monthly subscription is NZD $15.99.',
  },
  m2: {
    from: 'Spotify <no-reply@spotify.com>',
    subject: 'Spotify payment',
    date: 'Tue, 07 Oct 2026 09:00:00 +1300',
    body: 'Your payment of $12.99 was received. You are billed monthly.',
  },
  m3: {
    from: 'A Friend <friend@example.com>',
    subject: 'Weekly digest',
    date: 'Wed, 08 Oct 2026 09:00:00 +1300',
    body: 'Just saying hello, no money involved.',
  },
  m4: {
    from: 'Local Cafe <hello@cafe.co.nz>',
    subject: 'Payment received',
    date: 'Thu, 09 Oct 2026 09:00:00 +1300',
    body: 'Thanks! Your payment has been received.',
  },
  m5: {
    from: 'URBAN THREADS <orders@urbanthreads.co.nz>',
    subject: 'Your order from URBAN THREADS - Order Number: UT-36482',
    date: 'Fri, 10 Oct 2026 09:00:00 +1300',
    body: 'Thanks for your order! Order total: NZD $89.00.',
  },
  // m6/m7 are the same unknown merchant a month apart — not on the known-service
  // allowlist, so they only become a subscription because they repeat.
  m6: {
    from: 'Harbour Gym <billing@harbourgym.co.nz>',
    subject: 'Your Harbour Gym receipt',
    date: 'Wed, 12 Aug 2026 09:00:00 +1200',
    body: 'Membership payment received: NZD $42.00.',
  },
  m7: {
    from: 'Harbour Gym <billing@harbourgym.co.nz>',
    subject: 'Your Harbour Gym receipt',
    date: 'Fri, 11 Sep 2026 09:00:00 +1200',
    body: 'Membership payment received: NZD $42.00.',
  },
};

global.fetch = async (url, options = {}) => {
  const body = options.body ? options.body.toString() : '';
  fetchCalls.push({ url, method: options.method || 'GET', body });

  if (url === 'https://oauth2.googleapis.com/token') {
    if (body.includes('grant_type=authorization_code')) {
      if (tokenResponseOverride) return jsonResponse(tokenResponseOverride);
      return jsonResponse({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 3599,
        scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        id_token: 'id-token',
      });
    }
    if (body.includes('grant_type=refresh_token')) {
      // Deliberately omit refresh_token to test "keep the existing one".
      return jsonResponse({
        access_token: 'access-refreshed',
        expires_in: 3599,
        scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
      });
    }
  }

  if (url === 'https://oauth2.googleapis.com/revoke') return jsonResponse({});

  if (url.endsWith('/users/me/profile')) {
    return jsonResponse({ emailAddress: 'tester@gmail.com', messagesTotal: 4321 });
  }

  if (url.includes('/users/me/messages?')) {
    // The inbox scan (sync) asks for INBOX and gets the full fixture set; the
    // connection-flow proof list does not, and still sees exactly two.
    if (url.includes('labelIds=INBOX')) {
      return jsonResponse({
        messages: [
          { id: 'm1' }, { id: 'm2' }, { id: 'm3' },
          { id: 'm4' }, { id: 'm5' }, { id: 'm6' }, { id: 'm7' },
        ],
      });
    }
    return jsonResponse({ messages: [{ id: 'm1' }, { id: 'm2' }] });
  }

  if (url.includes('/users/me/messages/')) {
    const id = url.split('/messages/')[1].split('?')[0];
    const m = SYNC_MESSAGES[id] || SYNC_MESSAGES.m1;
    const headers = [
      { name: 'Subject', value: m.subject },
      { name: 'From', value: m.from },
      { name: 'Date', value: m.date },
    ];

    // format=full carries the decoded body (for parsing); format=metadata
    // carries headers only (the cheap subject pre-filter).
    if (url.includes('format=full')) {
      return jsonResponse({
        id,
        snippet: m.subject,
        payload: { mimeType: 'text/plain', headers, body: { data: b64(m.body) } },
      });
    }

    return jsonResponse({ id, snippet: m.subject, payload: { headers } });
  }

  throw new Error(`Unexpected fetch to ${url}`);
};

// ---- 3. in-memory repo ----------------------------------------------------
function makeInMemoryRepo() {
  const sessions = new Map();
  const connections = new Map();
  return {
    async saveAuthSession(uid, state, data) { sessions.set(`${uid}:${state}`, { ...data }); return { state, ...data }; },
    async findAuthSession(uid, state) { const d = sessions.get(`${uid}:${state}`); return d ? { state, ...d } : null; },
    async deleteAuthSession(uid, state) { sessions.delete(`${uid}:${state}`); },
    async saveConnection(uid, data) { connections.set(uid, { ...data }); return { id: 'gmail', ...data }; },
    async getConnection(uid) { const d = connections.get(uid); return d ? { id: 'gmail', ...d } : null; },
    async updateConnection(uid, changes) { const cur = connections.get(uid) || {}; const next = { ...cur, ...changes }; connections.set(uid, next); return { id: 'gmail', ...next }; },
    async deleteConnection(uid) { connections.delete(uid); },
    _sessions: sessions,
    _connections: connections,
  };
}

// ---- 4. test runner -------------------------------------------------------
let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}`); }
}
async function expectThrows(name, fn, messageIncludes) {
  try { await fn(); check(name, false); }
  catch (e) { check(`${name} (threw: ${e.message.slice(0, 40)}…)`, !messageIncludes || e.message.includes(messageIncludes)); }
}

// ---- 5. run ---------------------------------------------------------------
const UID = 'user-123';

const repo = await mod('repositories/gmailConnectionRepo.js');
const gmailAuthService = await mod('services/gmailAuthService.js');
const gmailService = await mod('services/gmailService.js');
const gmailController = await mod('controllers/gmailController.js');
const gmailSyncService = await mod('services/gmailSyncService.js');
const subscriptionRepo = await mod('repositories/subscriptionRepo.js');
const transactionRepo = await mod('repositories/transactionRepo.js');
const { parseReceiptEmail, looksLikeReceiptEmail } = await import(
  new URL('services/gmailEmailParser.js', SRC).href
);

Object.assign(repo, makeInMemoryRepo());

console.log('\n[buildAuthorizationUrl]');
const { authorizationUrl } = await gmailAuthService.buildAuthorizationUrl(UID);
const u = new URL(authorizationUrl);
check('endpoint is Google consent', u.origin + u.pathname === 'https://accounts.google.com/o/oauth2/v2/auth');
check('client_id present', u.searchParams.get('client_id') === 'test-client-id');
check('redirect_uri present', u.searchParams.get('redirect_uri') === 'http://localhost:5173/gmail/callback');
check('response_type=code', u.searchParams.get('response_type') === 'code');
check('scope has gmail.readonly', (u.searchParams.get('scope') || '').includes('gmail.readonly'));
check('access_type=offline', u.searchParams.get('access_type') === 'offline');
check('prompt=consent', u.searchParams.get('prompt') === 'consent');
const state = u.searchParams.get('state');
check('state is 64 hex chars', /^[0-9a-f]{64}$/.test(state || ''));
check('session was persisted', repo._sessions.has(`${UID}:${state}`));

console.log('\n[exchangeCode — bad / expired state]');
await expectThrows('unknown state rejected', () => gmailAuthService.exchangeCode(UID, { code: 'x', state: 'nope' }), 'Unknown or already-used');
await expectThrows('missing code rejected', () => gmailAuthService.exchangeCode(UID, { state }), 'Authorization code is missing');
await repo.saveAuthSession(UID, 'expired-state', { expiresAt: new Date(Date.now() - 1000).toISOString() });
await expectThrows('expired session rejected', () => gmailAuthService.exchangeCode(UID, { code: 'x', state: 'expired-state' }), 'expired');

console.log('\n[exchangeCode — happy path]');
fetchCalls = [];
const conn = await gmailAuthService.exchangeCode(UID, { code: 'auth-code', state });
check('connection stored provider=gmail', conn.provider === 'gmail');
check('emailAddress captured from profile', conn.emailAddress === 'tester@gmail.com');
check('access + refresh tokens stored', conn.accessToken === 'access-1' && conn.refreshToken === 'refresh-1');
check('state consumed (single-use)', !repo._sessions.has(`${UID}:${state}`));
check('token endpoint was called', fetchCalls.some((c) => c.url.endsWith('/token')));

console.log('\n[exchangeCode — no refresh token guard]');
await repo.saveAuthSession(UID, 'state-2', { expiresAt: new Date(Date.now() + 60000).toISOString() });
tokenResponseOverride = { access_token: 'a', expires_in: 3599, token_type: 'Bearer' };
await expectThrows('missing refresh token rejected', () => gmailAuthService.exchangeCode(UID, { code: 'c', state: 'state-2' }), 'did not return a refresh token');
tokenResponseOverride = null;

console.log('\n[getValidAccessToken]');
check('returns stored token when still valid', (await gmailAuthService.getValidAccessToken(UID)) === 'access-1');
await repo.updateConnection(UID, { accessTokenExpiresAt: new Date(Date.now() - 1000).toISOString() });
check('refreshes an expired token', (await gmailAuthService.getValidAccessToken(UID)) === 'access-refreshed');
check('keeps existing refresh token on refresh', (await repo.getConnection(UID)).refreshToken === 'refresh-1');

console.log('\n[getStatus — must not leak tokens]');
const status = await gmailAuthService.getStatus(UID);
check('connected=true', status.connected === true);
check('exposes emailAddress', status.emailAddress === 'tester@gmail.com');
check('no accessToken in status', !('accessToken' in status));
check('no refreshToken in status', !('refreshToken' in status));

console.log('\n[gmailService]');
const profile = await gmailService.getProfile(UID);
check('getProfile returns address + total', profile.emailAddress === 'tester@gmail.com' && profile.messagesTotal === 4321);
const subjects = await gmailService.listRecentSubjects(UID, { limit: 5 });
check('listRecentSubjects returns 2 messages', subjects.length === 2);
check('parses Subject header', subjects[0].subject === 'Your Netflix receipt');
check('parses From header', subjects[0].from.includes('netflix.com'));

console.log('\n[controller — responses carry no tokens]');
function fakeRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
}
let res = fakeRes();
await gmailController.connect({ userId: UID }, res);
check('connect returns authorizationUrl', typeof res.body.authorizationUrl === 'string');

const u2 = new URL((await gmailAuthService.buildAuthorizationUrl(UID)).authorizationUrl);
const state2 = u2.searchParams.get('state');
res = fakeRes();
await gmailController.callback({ userId: UID, body: { code: 'auth-code', state: state2 } }, res);
check('callback 200', res.statusCode === 200);
check('callback body has recentSubjects', Array.isArray(res.body.recentSubjects));
check('callback body leaks no token', !JSON.stringify(res.body).match(/access-|refresh-/));

res = fakeRes();
await gmailController.preview({ userId: UID }, res);
check('preview returns profile + subjects', res.body.emailAddress === 'tester@gmail.com' && Array.isArray(res.body.recentSubjects));

await repo.deleteConnection(UID);
res = fakeRes();
await gmailController.preview({ userId: UID }, res);
check('preview without connection -> 404', res.statusCode === 404);

await repo.saveConnection(UID, { provider: 'gmail', accessToken: 'a', refreshToken: 'r', connectedAt: new Date().toISOString() });
fetchCalls = [];
const dis = await gmailAuthService.disconnect(UID);
check('disconnect reports success', dis.disconnected === true);
check('revoke endpoint was called', fetchCalls.some((c) => c.url.endsWith('/revoke')));
check('connection removed', (await repo.getConnection(UID)) === null);

// ---- 6. parser (pure) -----------------------------------------------------
console.log('\n[gmailEmailParser — pure parsing]');
check(
  'known service + amount → subscription-merchant candidate',
  (() => {
    const r = parseReceiptEmail({
      id: 'u1',
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'From', value: 'Netflix <info@netflix.com>' },
          { name: 'Subject', value: 'Your receipt' },
          { name: 'Date', value: 'Mon, 06 Oct 2026 10:00:00 +0000' },
        ],
        body: { data: b64('Your monthly payment is NZD $15.99') },
      },
    });
    return (
      r &&
      r.merchant === 'Netflix' &&
      r.amount === 15.99 &&
      r.billingCycle === 'Monthly' &&
      r.currency === 'NZD' &&
      r.date === '2026-10-06' &&
      r.isSubscriptionMerchant === true &&
      r.gmailMessageId === 'u1'
    );
  })()
);
check(
  'unknown store + amount → transaction candidate (not a subscription)',
  (() => {
    const r = parseReceiptEmail({
      id: 'u2',
      payload: {
        headers: [
          { name: 'From', value: 'URBAN THREADS <orders@urbanthreads.co.nz>' },
          { name: 'Subject', value: 'Your order from URBAN THREADS - Order Number: UT-36482' },
        ],
        body: { data: b64('Order total: NZD $89.00') },
      },
    });
    return r && r.merchant === 'Urban Threads' && r.amount === 89 && r.isSubscriptionMerchant === false;
  })()
);
check(
  'captures the email subject and sender address',
  (() => {
    const r = parseReceiptEmail({
      id: 'u2s',
      payload: {
        headers: [
          { name: 'From', value: 'URBAN THREADS <orders@urbanthreads.co.nz>' },
          { name: 'Subject', value: 'Your order from URBAN THREADS - Order Number: UT-36482' },
        ],
        body: { data: b64('Order total: NZD $89.00') },
      },
    });
    return (
      r &&
      r.subject === 'Your order from URBAN THREADS - Order Number: UT-36482' &&
      r.sender === 'orders@urbanthreads.co.nz'
    );
  })()
);
check(
  'subject names the merchant even when the sender is a generic bulk mailer',
  (() => {
    const r = parseReceiptEmail({
      id: 'u2c',
      payload: {
        headers: [
          { name: 'From', value: 'Shopify <no-reply@shopifyemail.com>' },
          { name: 'Subject', value: 'Your order from URBAN THREADS - Order Number: UT-36482' },
        ],
        body: { data: b64('Order total: NZD $89.00') },
      },
    });
    // Without the subject rule this would be "Shopifyemail", collapsing every
    // store that uses the same mailer into one merchant.
    return r && r.merchant === 'Urban Threads';
  })()
);
check(
  'merchant falls back to the email domain when there is no display name',
  (() => {
    const r = parseReceiptEmail({
      id: 'u2b',
      payload: {
        headers: [{ name: 'From', value: 'receipts@bunnings.co.nz' }],
        body: { data: b64('Purchase total $42.00') },
      },
    });
    return r && r.merchant === 'Bunnings' && r.isSubscriptionMerchant === false;
  })()
);
check(
  'no amount → null (nothing to record as a spend)',
  parseReceiptEmail({
    id: 'u3',
    payload: {
      headers: [{ name: 'From', value: 'Spotify <no-reply@spotify.com>' }],
      body: { data: b64('Thanks for being a member') },
    },
  }) === null
);
check(
  'HTML body decoded + annual cycle + AUD (known service)',
  (() => {
    const r = parseReceiptEmail({
      id: 'u4',
      payload: {
        mimeType: 'text/html',
        headers: [{ name: 'From', value: 'Adobe <mail@adobe.com>' }],
        body: { data: b64('<p>Your <b>annual</b> plan: AUD $99.00</p>') },
      },
    });
    return r && r.merchant === 'Adobe' && r.amount === 99 && r.currency === 'AUD' && r.billingCycle === 'Annually' && r.isSubscriptionMerchant === true;
  })()
);
check('looksLikeReceiptEmail true for a receipt subject', looksLikeReceiptEmail('Your Netflix receipt') === true);
check('looksLikeReceiptEmail true for an order subject', looksLikeReceiptEmail('Your order from URBAN THREADS - Order Number: UT-36482') === true);
check('looksLikeReceiptEmail false for an unrelated subject', looksLikeReceiptEmail('Weekly digest') === false);

// ---- 6b. amount selection ------------------------------------------------
// A receipt usually holds several figures (line items, GST, a discount, a
// loyalty balance). These pin down which one is treated as the charge.
console.log('\n[gmailEmailParser — which amount is the charge]');

function amountFrom(bodyText) {
  const parsed = parseReceiptEmail({
    id: 'amt',
    payload: {
      mimeType: 'text/plain',
      headers: [
        { name: 'From', value: 'Shop <orders@shop.co.nz>' },
        { name: 'Subject', value: 'Your receipt' },
        { name: 'Date', value: 'Mon, 06 Oct 2026 10:00:00 +0000' },
      ],
      body: { data: b64(bodyText) },
    },
  });
  return parsed ? parsed.amount : null;
}

for (const [name, bodyText, expected] of [
  ['a single plain amount', 'Total: $89.00', 89],
  ['thousands separators are not truncated to 1', 'Order total: $1,299.00', 1299],
  ['millions with separators', 'Total $12,345,678.90', 12345678.9],
  ['a labelled total beats a promotional figure', 'Save $500 on your next order! Total: $49.99', 49.99],
  ['subtotal is not mistaken for the total', 'Subtotal $80.00, GST $12.00, Total $92.00', 92],
  ['sub-total hyphenated is also excluded', 'Sub-total $80.00 Total $92.00', 92],
  ['a zero balance does not beat the amount paid', 'Amount due: $0.00 Total paid: $150.00', 150],
  ['"charged" counts as a total label', 'You were charged $42.50 today', 42.5],
  ['a discount line is ignored', 'Discount $20.00 Amount paid $30.00', 30],
  ['with no labels at all the largest still wins', 'Item $10.00 Item $25.00', 25],
  ['an all-promotional body still yields an amount', 'Save $89 today on orders', 89],
  ['a number with no currency marker is not an amount', 'Order total: 89.00', null],
]) {
  check(`${name} (${expected})`, amountFrom(bodyText) === expected);
}

// ---- 7. sync (scan inbox → persist to Firestore) --------------------------
function makeInMemorySubscriptionRepo() {
  const subs = new Map();
  const payments = new Map();
  let seq = 0;
  return {
    async getAll() { return [...subs.values()].map((s) => ({ ...s })); },
    async create(uid, data) { const id = `sub-${(seq += 1)}`; const rec = { id, ...data }; subs.set(id, rec); return { ...rec }; },
    async update(uid, id, changes) { const next = { ...subs.get(id), ...changes }; subs.set(id, next); return { ...next }; },
    async upsertPayment(uid, subId, paymentId, data) { payments.set(`${subId}:${paymentId}`, { id: paymentId, ...data }); return { id: paymentId, ...data }; },
    _subs: subs,
    _payments: payments,
  };
}

function makeInMemoryTransactionRepo() {
  const txns = new Map();
  return {
    async upsertById(uid, id, data) { txns.set(id, { id, ...data }); return { id, ...data }; },
    async getAll() { return [...txns.values()].map((t) => ({ ...t })); },
    _txns: txns,
  };
}

console.log('\n[gmailSyncService — scan + persist]');
const subRepo = makeInMemorySubscriptionRepo();
Object.assign(subscriptionRepo, subRepo);
const txnRepo = makeInMemoryTransactionRepo();
Object.assign(transactionRepo, txnRepo);

const SYNC_UID = 'sync-user';
await repo.saveConnection(SYNC_UID, {
  provider: 'gmail',
  emailAddress: 'sync@gmail.com',
  accessToken: 'access-sync',
  refreshToken: 'refresh-sync',
  accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  connectedAt: new Date().toISOString(),
});

const sync1 = await gmailSyncService.syncSubscriptions(SYNC_UID);
check('scanned every inbox message', sync1.scanned === 7);
check('parsed 5 receipts (2 known services + 1 order + 2 repeats)', sync1.parsed === 5);
check('created 3 subscriptions (2 known + 1 repeat-detected)', sync1.created === 3);
check('updated 0 on the first run', sync1.updated === 0);

const stored = await subscriptionRepo.getAll(SYNC_UID);
check('all stored with source=gmail-detected', stored.length === 3 && stored.every((s) => s.source === 'gmail-detected'));
check(
  'detectionKey is gmail|merchant|cycle',
  stored.some((s) => s.detectionKey === 'gmail|Netflix|Monthly') &&
    stored.some((s) => s.detectionKey === 'gmail|Spotify|Monthly')
);
check('Netflix amount captured from the body', stored.find((s) => s.name === 'Netflix')?.amount === 15.99);
check('the one-off store order is NOT a subscription', !stored.some((s) => s.name === 'Urban Threads'));

// Repeat receipts from a merchant that is not on the allowlist.
const gym = stored.find((s) => s.name === 'Harbour Gym');
check('two receipts from the same unknown merchant become a subscription', Boolean(gym));
check('its cycle comes from the real 30-day gap', gym?.billingCycle === 'Monthly');
check('repeat-detected subs carry lower confidence than known services', gym?.confidence === 0.6);
check(
  'every receipt in the group is recorded as a payment',
  subRepo._payments.has(`${gym.id}:m6`) && subRepo._payments.has(`${gym.id}:m7`)
);
check(
  'payment recorded under the Gmail message id',
  subRepo._payments.has(`${stored.find((s) => s.name === 'Netflix').id}:m1`)
);

// Each parsed email is also stored as a transaction (Transactions page).
check('wrote a transaction per parsed email', sync1.transactionsSaved === 5);
check('exactly 5 transactions stored', txnRepo._txns.size === 5);
check('transactions keyed by prefixed Gmail id', ['gmail_m1', 'gmail_m2', 'gmail_m5', 'gmail_m6', 'gmail_m7'].every((k) => txnRepo._txns.has(k)));
check('transactions carry source=gmail-detected', [...txnRepo._txns.values()].every((t) => t.source === 'gmail-detected'));
check('subscription transaction carries merchant + amount', txnRepo._txns.get('gmail_m1').name === 'Netflix' && txnRepo._txns.get('gmail_m1').amount === 15.99);
check(
  'URBAN THREADS order became a transaction (merchant from sender, category Purchase)',
  txnRepo._txns.get('gmail_m5').name === 'Urban Threads' &&
    txnRepo._txns.get('gmail_m5').amount === 89 &&
    txnRepo._txns.get('gmail_m5').category === 'Purchase'
);
check('receipt subject with no amount was skipped (no m4 transaction)', !txnRepo._txns.has('gmail_m4'));
check(
  'stored transaction keeps the subject + sender for display',
  txnRepo._txns.get('gmail_m5').subject ===
    'Your order from URBAN THREADS - Order Number: UT-36482' &&
    txnRepo._txns.get('gmail_m5').sender === 'orders@urbanthreads.co.nz'
);

// Idempotency: scanning the same inbox again creates nothing new.
const sync2 = await gmailSyncService.syncSubscriptions(SYNC_UID);
check('second run creates nothing', sync2.created === 0);
check('second run refreshes the existing 3', sync2.updated === 3);
check('still exactly 3 subscriptions', (await subscriptionRepo.getAll(SYNC_UID)).length === 3);
check('no duplicate payments', subRepo._payments.size === 4);
check('no duplicate transactions on re-run', txnRepo._txns.size === 5);

console.log('\n[controller — sync response carries no tokens]');
res = fakeRes();
await gmailController.sync({ userId: SYNC_UID }, res);
check('sync controller 200', res.statusCode === 200);
check('sync returns a summary', typeof res.body.created === 'number' && typeof res.body.scanned === 'number');
check('sync response leaks no token', !JSON.stringify(res.body).match(/access-|refresh-/));

await expectThrows(
  'sync without a connection rejected',
  () => gmailSyncService.syncSubscriptions('nobody'),
  'No Gmail connection'
);

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
