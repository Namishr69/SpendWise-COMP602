import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { importPKCS8 } from 'jose';

/**
 * ANZ Open Banking (Payments NZ API Centre) configuration.
 *
 * Every value comes from the environment so the same code runs against the
 * sandbox or a future production tenant. The OAuth endpoints
 * are derived from the issuer exactly as published in the sandbox's
 * /.well-known/openid-configuration document.
 */

const issuer = (process.env.ANZ_ISSUER || 'https://api-nomatls.apicentre.middleware.co.nz/')
  .replace(/\/+$/, '');

export const anzConfig = {
  clientId: process.env.ANZ_CLIENT_ID || '',
  keyId: process.env.ANZ_KEY_ID || '',
  privateKeyPath: process.env.ANZ_PRIVATE_KEY_PATH || './anz-private-key.pem',

  issuer,
  // The issuer exactly as published in the discovery document, trailing slash
  // included. Used for the `aud` we sign into JWTs and for validating the `iss`
  // claim on id_tokens — both are compared as exact strings, so the slash
  // matters. ANZ_TOKEN_AUDIENCE overrides it if the sandbox wants the token
  // endpoint URL instead.
  issuerClaim: `${issuer}/`,
  tokenAudience: process.env.ANZ_TOKEN_AUDIENCE || `${issuer}/`,

  authorizationEndpoint: `${issuer}/oauth/v2.0/authorize`,
  tokenEndpoint: `${issuer}/oauth/v2.0/token`,
  jwksUri: `${issuer}/oauth/v2.0/keys`,
  parEndpoint: `${issuer}/oauth/v2.0/par`,
  revocationEndpoint: `${issuer}/oauth/v2.0/revoke`,

  // Account Information API. Confirm the version path against the onboarding
  // pack — it is the one value most likely to differ per provider.
  resourceBaseUrl: (
    process.env.ANZ_RESOURCE_BASE_URL ||
    `${issuer}/account-information/v2.3`
  ).replace(/\/+$/, ''),

  redirectUri: process.env.ANZ_REDIRECT_URI || 'http://localhost:5173/anz/callback',

  scopes: process.env.ANZ_SCOPES || 'openid accounts',
  // 'code' keeps the response in the query string. Switch to 'code id_token'
  // if the sandbox rejects plain code — the callback page handles both.
  responseType: process.env.ANZ_RESPONSE_TYPE || 'code',
  usePar: process.env.ANZ_USE_PAR === 'true',

  // The only signing algorithm the sandbox advertises.
  signingAlg: 'PS512',
};

/**
 * Loads and caches the PKCS8 signing key. Cached because importPKCS8 is
 * async and every token call needs the same key.
 */
let cachedKey = null;

// Relative key paths are resolved against the backend package root, not the
// current working directory, so the key is found no matter where node was
// started from. An absolute ANZ_PRIVATE_KEY_PATH is used as-is.
const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function resolvePrivateKeyPath() {
  return resolve(BACKEND_ROOT, anzConfig.privateKeyPath);
}

/**
 * Returns the signing key PEM. Prefers ANZ_PRIVATE_KEY (the whole PEM inline)
 * so hosted deploys like Render can supply it as an env var; otherwise reads
 * the file at ANZ_PRIVATE_KEY_PATH, which is the default for local dev.
 */
function readPrivateKeyPem() {
  const inline = process.env.ANZ_PRIVATE_KEY;
  if (inline && inline.trim()) {
    // Some hosts and .env files store the PEM with literal "\n" instead of real
    // newlines; turn those back into a valid multi-line PEM before parsing.
    return inline.includes('\\n') ? inline.replace(/\\n/g, '\n') : inline;
  }

  const keyPath = resolvePrivateKeyPath();
  try {
    return readFileSync(keyPath, 'utf8');
  } catch {
    throw new Error(
      'ANZ private key not found. Set ANZ_PRIVATE_KEY (inline PEM) for hosted ' +
      `deploys, or ANZ_PRIVATE_KEY_PATH (file path) for local dev — looked for a file at "${keyPath}".`
    );
  }
}

export async function getPrivateKey() {
  if (cachedKey) return cachedKey;

  const pem = readPrivateKeyPem();

  try {
    cachedKey = await importPKCS8(pem, anzConfig.signingAlg);
  } catch (error) {
    throw new Error(`ANZ private key could not be parsed as PKCS8: ${error.message}`);
  }

  return cachedKey;
}

/**
 * Fails fast with an actionable message rather than letting a half-configured
 * request reach ANZ and come back as an opaque invalid_client.
 */
export function assertAnzConfigured() {
  const missing = [];
  if (!anzConfig.clientId) missing.push('ANZ_CLIENT_ID');
  if (!anzConfig.keyId) missing.push('ANZ_KEY_ID');

  if (missing.length > 0) {
    throw new Error(
      `ANZ is not configured: missing ${missing.join(', ')}. ` +
      'Set them in backend/.env.'
    );
  }
}

export default anzConfig;
