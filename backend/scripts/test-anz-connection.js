/**
 * Smoke-tests the ANZ connection without involving a browser.
 *
 *   npm run anz:test
 *
 * Runs the two client-level steps of the flow in order, so a failure points at
 * one specific cause instead of a generic "it did not work":
 *
 *   1. client_credentials token  — proves the signing key, client id and key id
 *                                  are registered and agree with each other
 *   2. account-access-consent    — proves the resource base URL is right
 *
 * Neither step needs a user, which is what makes this a useful first test.
 * Forces live mode: testing against mock data would prove nothing.
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load backend/.env by explicit path rather than relying on the cwd, so the
// script reports real results no matter which directory it is run from.
const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });

// Must be set before any ANZ module is imported, since IS_MOCK is read at
// module load time.
process.env.ANZ_MOCK = 'false';

const { default: anzConfig, resolvePrivateKeyPath } = await import('../src/config/anz.js');
const { default: anzAuthService } = await import('../src/services/anzAuthService.js');

function fail(message, hints = []) {
  console.error(`\n  FAILED  ${message}`);
  hints.forEach((hint) => console.error(`          → ${hint}`));
  process.exit(1);
}

console.log('ANZ connection test\n');

// --- Step 0: configuration ------------------------------------------------

const keyPath = resolvePrivateKeyPath();

console.log('  client id   :', anzConfig.clientId || '(not set)');
console.log('  key id      :', anzConfig.keyId || '(not set)');
console.log('  private key :', keyPath);
console.log('  issuer      :', anzConfig.issuer);
console.log('  resource    :', anzConfig.resourceBaseUrl);
console.log('  redirect    :', anzConfig.redirectUri);

if (!anzConfig.clientId || !anzConfig.keyId) {
  fail('ANZ_CLIENT_ID and ANZ_KEY_ID must both be set.', [
    'Add them to backend/.env — this script reads that file automatically.',
  ]);
}

if (!existsSync(keyPath)) {
  fail(`No private key at ${keyPath}`, [
    'Set ANZ_PRIVATE_KEY_PATH in backend/.env to point at your .pem file.',
  ]);
}

// --- Step 1: client credentials token -------------------------------------

console.log('\n1. Requesting a client_credentials token…');

let token;
try {
  token = await anzAuthService.getClientCredentialsToken();
} catch (error) {
  const message = error.message || '';

  const hints = [];
  if (message.includes('invalid_client')) {
    hints.push('ANZ_CLIENT_ID or ANZ_KEY_ID does not match the registered key.');
    hints.push('Run `npm run anz:jwks` and confirm the kid and public key are registered in the API Centre portal.');
  } else if (message.includes('invalid_scope')) {
    hints.push('The "accounts" scope is not granted to this client registration.');
  } else if (message.includes('fetch failed') || message.includes('ENOTFOUND')) {
    hints.push(`Could not reach ${anzConfig.issuer} — check ANZ_ISSUER and your network.`);
  } else if (message.includes('could not be parsed')) {
    hints.push('The .pem must be an unencrypted PKCS8 key (it starts with "-----BEGIN PRIVATE KEY-----").');
  }

  fail(message, hints);
}

console.log('  OK — token received');
console.log('     scope     :', token.scope || '(none returned)');
console.log('     expires in:', token.expires_in, 'seconds');

// --- Step 2: account access consent ---------------------------------------

console.log('\n2. Creating an account-access consent…');

let consentId;
try {
  consentId = await anzAuthService.createAccountConsent();
} catch (error) {
  const message = error.message || '';

  const hints = [];
  if (message.includes('404')) {
    hints.push(`Nothing at ${anzConfig.resourceBaseUrl}/account-access-consents`);
    hints.push('Fix ANZ_RESOURCE_BASE_URL — the Account Information version path is in your onboarding pack.');
  } else if (message.includes('403') || message.includes('401')) {
    hints.push('The token was rejected by the resource server. The consent permissions may exceed what this client is allowed.');
  }

  fail(message, hints);
}

console.log('  OK — consent created');
console.log('     ConsentId :', consentId);

console.log('\nBoth client-level steps passed. Your credentials and endpoints are correct.');
console.log('Next: set ANZ_MOCK=false in backend/.env, restart the API, and connect from');
console.log('Settings → Connected accounts. That exercises the browser redirect, which');
console.log('needs ANZ_REDIRECT_URI registered in the portal as:');
console.log(`  ${anzConfig.redirectUri}`);
