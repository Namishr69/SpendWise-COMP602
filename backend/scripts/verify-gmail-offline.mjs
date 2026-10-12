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
    return jsonResponse({ messages: [{ id: 'm1' }, { id: 'm2' }] });
  }

  if (url.includes('/users/me/messages/')) {
    const id = url.split('/messages/')[1].split('?')[0];
    return jsonResponse({
      id,
      snippet: 'Your receipt',
      payload: {
        headers: [
          { name: 'Subject', value: id === 'm1' ? 'Your Netflix receipt' : 'Spotify payment' },
          { name: 'From', value: id === 'm1' ? 'Netflix <info@netflix.com>' : 'Spotify <no-reply@spotify.com>' },
          { name: 'Date', value: 'Mon, 06 Oct 2026 10:00:00 +1300' },
        ],
      },
    });
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

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
