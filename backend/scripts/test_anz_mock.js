import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });

const { default: anzConfig } = await import('../src/config/anz.js');
const { default: anzAuthService } = await import('../src/services/anzAuthService.js');

async function run() {
    const { access_token: accessToken } = await anzAuthService.getClientCredentialsToken();
    const response = await fetch(`${anzConfig.resourceBaseUrl}/transactions`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'x-fapi-interaction-id': randomUUID(),
            'x-fapi-auth-date': new Date().toUTCString(),
        }
    });
    const data = await response.json();
    console.log(data);
    process.exit(0);
}
run().catch(console.error);
