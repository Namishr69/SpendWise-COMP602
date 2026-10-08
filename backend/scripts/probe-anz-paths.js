/**
 * Finds the Account Information base path for the ANZ sandbox.
 *
 *   npm run anz:probe
 *   npm run anz:probe -- account-information/v3.0 anz/account-information/v2.3
 *
 * The sandbox gateway is an Express app: it answers unknown routes with a 404
 * HTML page ("Cannot GET /x"), and real routes with something else — most
 * likely 401/403, since listing accounts needs a user-scoped token and this
 * script only holds a client-level one. So "not a 404" is the signal we want;
 * we are looking for which paths exist, not trying to read data.
 *
 * Pass candidates as arguments to check a specific path from your onboarding
 * pack. A bare path is joined to ANZ_ISSUER; a full http(s) URL is used as-is,
 * so you can also test a different resource host.
 */

import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });

const { default: anzConfig } = await import('../src/config/anz.js');
const { default: anzAuthService } = await import('../src/services/anzAuthService.js');

// Ordered most-likely first. The OAuth endpoints on this host are mounted at
// `oauth/v2.0/...`, so `{api}/{version}/...` is the shape to expect.
const DEFAULT_CANDIDATES = [
  'account-information/v2.2',
  'account-information/v2.1',
  'account-information/v2.0',
  'account-information/v3.0',
  'account-information/v4.0',
  'account-information/v1.0',
  'account-information/v2.3.0',
  'accounts/v2.3',
  'accounts/v2.0',
  'aisp/v2.3',
  'open-banking/v2.3',
  'open-banking/v3.1/aisp',
  'anz/account-information/v2.3',
  // The configured value, kept last as a control — we know it 404s.
  'account-information/v2.3',
];

const candidates = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_CANDIDATES;

function toBaseUrl(candidate) {
  const trimmed = candidate.replace(/^\/+|\/+$/g, '');
  return /^https?:\/\//i.test(candidate)
    ? candidate.replace(/\/+$/, '')
    : `${anzConfig.issuer}/${trimmed}`;
}

console.log('Probing for the Account Information base path\n');

let accessToken;
try {
  ({ access_token: accessToken } = await anzAuthService.getClientCredentialsToken());
  console.log('Got a client-credentials token — authentication is working.\n');
} catch (error) {
  console.error(`Could not get a token: ${error.message}`);
  console.error('Run `npm run anz:test` first — this script needs step 1 to pass.');
  process.exit(1);
}

const results = [];

for (const candidate of candidates) {
  const base = toBaseUrl(candidate);

  let status;
  let note = '';

  try {
    const response = await fetch(`${base}/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'x-fapi-interaction-id': randomUUID(),
        'x-fapi-auth-date': new Date().toUTCString(),
      },
    });

    status = response.status;
    const body = await response.text().catch(() => '');

    // Express's own 404 page means "no such route". A JSON 404 is a real
    // API response and worth a second look.
    const isExpress404 = status === 404 && /Cannot (GET|POST)/i.test(body);

    if (isExpress404) {
      note = 'no route here';
    } else if (status === 404) {
      note = 'route exists — 404 came from the API, not Express';
    } else if (status === 401 || status === 403) {
      note = 'ROUTE EXISTS (needs a user-scoped token — expected)';
    } else if (status < 300) {
      note = 'ROUTE EXISTS and answered';
    } else {
      note = 'route exists — unexpected status, see below';
    }

    results.push({ candidate, base, status, note, isExpress404, body });
  } catch (error) {
    results.push({
      candidate,
      base,
      status: 'ERR',
      note: error.message,
      isExpress404: false,
      body: '',
    });
  }
}

const found = results.filter((r) => !r.isExpress404 && r.status !== 'ERR');

for (const r of results) {
  const marker = r.isExpress404 || r.status === 'ERR' ? '  ' : '->';
  console.log(`${marker} ${String(r.status).padEnd(4)} ${r.candidate.padEnd(30)} ${r.note}`);
}

if (found.length === 0) {
  console.log('\nNone of these paths exist on this host.');
  console.log('Two things worth checking in your sandbox pack:');
  console.log('  1. The exact Account Information base path, including version.');
  console.log('  2. Whether the resource APIs live on a different host from the');
  console.log('     OAuth endpoints. If so, pass the full URL:');
  console.log('       npm run anz:probe -- https://that-host/some/path');
  process.exit(1);
}

console.log(`\nFound ${found.length} path(s) that exist. Details:\n`);
for (const r of found) {
  console.log(`  ${r.base}`);
  console.log(`    HTTP ${r.status}`);
  if (r.body) console.log(`    ${r.body.slice(0, 300).replace(/\s+/g, ' ')}`);
  console.log();
}

console.log('Set the winner in backend/.env, dropping the trailing /accounts:');
console.log(`  ANZ_RESOURCE_BASE_URL=${found[0].base}`);
console.log('\nThen re-run `npm run anz:test` — step 2 should create a consent.');
