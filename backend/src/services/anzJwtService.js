import { randomBytes, createHash, randomUUID } from 'crypto';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import anzConfig, { getPrivateKey } from '../config/anz.js';

/**
 * All the PS512 signing and PKCE work the sandbox's security profile requires.
 *
 * Two different signed JWTs are needed:
 *   1. A client assertion  — proves who we are on every /token call, because
 *      the sandbox only supports private_key_jwt (there is no client secret).
 *   2. A request object    — wraps the /authorize parameters, because the
 *      sandbox sets require_signed_request_object: true.
 */

const jwks = createRemoteJWKSet(new URL(anzConfig.jwksUri));

/** URL-safe random string, used for state, nonce and the PKCE verifier. */
function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

/** PKCE S256 pair — the only challenge method the sandbox supports. */
function generatePkcePair() {
  const codeVerifier = randomToken(32);
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

const anzJwtService = {
  randomToken,
  generatePkcePair,

  /**
   * private_key_jwt client assertion. Short-lived and single-use: jti makes it
   * unreplayable, and the 5 minute expiry keeps the window tight.
   */
  async createClientAssertion() {
    const key = await getPrivateKey();

    return await new SignJWT({})
      .setProtectedHeader({
        alg: anzConfig.signingAlg,
        kid: anzConfig.keyId,
        typ: 'JWT',
      })
      .setIssuer(anzConfig.clientId)
      .setSubject(anzConfig.clientId)
      .setAudience(anzConfig.tokenAudience)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key);
  },

  /**
   * Signed request object for /authorize.
   *
   * The ConsentId claim is what binds this authorisation to the consent we
   * created beforehand — without it ANZ has no idea which consent the user is
   * approving.
   */
  async createRequestObject({ state, nonce, codeChallenge, consentId }) {
    const key = await getPrivateKey();

    return await new SignJWT({
      response_type: anzConfig.responseType,
      response_mode: 'jwt', // <--- Added here to satisfy FAPI security profile
      client_id: anzConfig.clientId,
      redirect_uri: anzConfig.redirectUri,
      scope: anzConfig.scopes,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      max_age: 86400,
      claims: {
        id_token: {
          ConsentId: { value: consentId, essential: true },
        },
        userinfo: {
          ConsentId: { value: consentId, essential: true },
        },
      },
    })
      .setProtectedHeader({
        alg: anzConfig.signingAlg,
        kid: anzConfig.keyId,
        typ: 'JWT',
      })
      .setIssuer(anzConfig.clientId)
      .setAudience(anzConfig.issuerClaim)
      .setJti(randomUUID())
      .setIssuedAt()
      .setNotBefore('0s')
      .setExpirationTime('10m')
      .sign(key);
  },

  /**
   * Verifies an id_token from the hybrid (code id_token) flow against ANZ's
   * published keys, then checks the nonce we generated round-tripped intact.
   * A mismatched nonce means a replayed or injected response.
   */
  async verifyIdToken(idToken, expectedNonce) {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: anzConfig.issuerClaim,
      audience: anzConfig.clientId,
      algorithms: [anzConfig.signingAlg],
    });

    if (expectedNonce && payload.nonce !== expectedNonce) {
      throw new Error('id_token nonce did not match the authorisation request');
    }

    return payload;
  },
};

export default anzJwtService;