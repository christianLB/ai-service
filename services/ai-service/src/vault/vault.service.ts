import * as https from 'https';
import * as http from 'http';

interface VaultSecrets {
  'GEMINI_API_KEY'?: string;
  'openai-api-key'?: string;
  'anthropic-api-key'?: string;
  'redis-url'?: string;
}

/**
 * Simple Vault integration based on comm-service pattern
 */
export class VaultService {
  private secrets: Record<string, any> = {};

  async initializeVault(): Promise<void> {
    const vaultAddr = process.env.VAULT_ADDR || 'https://192.168.1.11:8200';
    const vaultToken = process.env.VAULT_TOKEN;
    const vaultEnabled = process.env.VAULT_ENABLED !== 'false';
    const secretPath = process.env.VAULT_SECRET_PATH || 'secret/data/ai-service';

    if (!vaultEnabled) {
      console.log('🔐 Vault integration disabled, using environment variables');
      return;
    }

    if (!vaultToken) {
      console.log('ℹ️  VAULT_TOKEN not set, skipping Vault initialization');
      return;
    }

    console.log(`🔐 Fetching secrets from Vault at ${vaultAddr}/${secretPath}...`);

    try {
      // Make HTTP request to Vault
      const url = new URL(`${vaultAddr}/v1/${secretPath}`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: {
          'X-Vault-Token': vaultToken,
          'Content-Type': 'application/json'
        },
        rejectUnauthorized: false // For self-signed certs
      };

      const response = await new Promise<any>((resolve, reject) => {
        const req = client.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse Vault response: ${data}`));
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      if (response.errors) {
        throw new Error(`Vault error: ${response.errors.join(', ')}`);
      }

      this.secrets = response.data?.data || {};

      // Apply secrets to environment variables
      this.applySecretsToEnvironment();

      console.log('✅ Secrets fetched from Vault successfully');
    } catch (error: any) {
      console.error('⚠️  Failed to fetch secrets from Vault:', error.message);
      console.log('  Using environment variables or defaults');
    }
  }

  private applySecretsToEnvironment() {
    // Map Vault secrets to environment variables
    const mappings = {
      'GEMINI_API_KEY': 'GEMINI_API_KEY',
      'openai-api-key': 'OPENAI_API_KEY',
      'anthropic-api-key': 'ANTHROPIC_API_KEY',
      'redis-url': 'REDIS_URL',
    };

    for (const [vaultKey, envKey] of Object.entries(mappings)) {
      if (this.secrets[vaultKey] !== undefined && this.secrets[vaultKey] !== 'CHANGEME') {
        const value = this.secrets[vaultKey];
        process.env[envKey] = value;
        console.log(`  • ${envKey}: configured from Vault`);
      }
    }
  }

  getSecret(key: string): any {
    return this.secrets[key] || process.env[key];
  }
}