/**
 * Prints the public JWKS for the ANZ signing key.
 *
 * ANZ needs our public key to verify the client assertions and request objects
 * we sign. Register the output in the API Centre portal (or host it at your
 * registered jwks_uri) if your client registration does not already have it.
 *
 *   npm run anz:jwks
 *
 * Only the public half is printed — the private key never leaves the machine.
 */

import { config as loadEnv } from 'dotenv';
import { exportJWK } from 'jose';
import { createPublicKey } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load backend/.env by explicit path so the script works from any directory.
const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });

const { resolvePrivateKeyPath } = await import('../src/config/anz.js');

const keyPath = resolvePrivateKeyPath();
const keyId = process.env.ANZ_KEY_ID || '';

let pem;
try {
  pem = readFileSync(keyPath, 'utf8');
} catch {
  console.error(`Could not read the private key at "${keyPath}".`);
  console.error('Set ANZ_PRIVATE_KEY_PATH in backend/.env to point at your .pem file.');
  process.exit(1);
}

let jwk;
try {
  // Derive the public key so no private material can be printed by accident.
  jwk = await exportJWK(createPublicKey(pem));
} catch (error) {
  console.error(`The key could not be parsed: ${error.message}`);
  process.exit(1);
}

const jwks = {
  keys: [
    {
      ...jwk,
      kid: keyId || '<set ANZ_KEY_ID in backend/.env>',
      use: 'sig',
      alg: 'PS512',
    },
  ],
};

console.log(JSON.stringify(jwks, null, 2));

if (!keyId) {
  console.error('\nWarning: ANZ_KEY_ID is not set, so "kid" is a placeholder.');
  console.error('It must match the key id registered with ANZ.');
}
