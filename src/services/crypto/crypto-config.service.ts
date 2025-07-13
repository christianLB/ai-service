import { Pool } from 'pg';

export interface CryptoConfig {
  id: string;
  user_id: string;
  provider: string;
  api_key?: string;
  secret_key?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export class CryptoConfigService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async upsertConfig(userId: string, provider: string, apiKey?: string, secretKey?: string, address?: string): Promise<void> {
    const query = `
      INSERT INTO financial.user_crypto_configs (user_id, provider, api_key, secret_key, address)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, provider)
      DO UPDATE SET api_key = EXCLUDED.api_key, secret_key = EXCLUDED.secret_key, address = EXCLUDED.address, updated_at = NOW();
    `;
    await this.pool.query(query, [userId, provider, apiKey, secretKey, address]);
  }

  async getConfigs(userId: string): Promise<CryptoConfig[]> {
    const result = await this.pool.query<CryptoConfig>(
      'SELECT * FROM financial.user_crypto_configs WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }
}
