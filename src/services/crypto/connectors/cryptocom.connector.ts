import axios, { AxiosInstance } from 'axios';
import { CryptoConnector, CryptoBalance, CryptoTransaction } from './crypto-connector.interface';

export class CryptoComConnector implements CryptoConnector {
  readonly name = 'cryptocom';
  private api: AxiosInstance;
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.api = axios.create({
      baseURL: 'https://api.crypto.com/v2',
      timeout: 10000,
    });
  }

  async connect(): Promise<void> {
    // Crypto.com does not require explicit connect, keys are used per request
    // Placeholder for future handshake logic
  }

  async getBalances(): Promise<CryptoBalance[]> {
    // Minimal implementation calling public get-account-summary
    const result = await this.api.post('/private/get-account-summary', {
      api_key: this.apiKey,
      sig: this.signPayload({}),
    });
    return (result.data?.result?.accounts || []).map((a: any) => ({
      asset: a.currency,
      amount: a.available || '0',
    }));
  }

  async getTransactions(): Promise<CryptoTransaction[]> {
    const result = await this.api.post('/private/get-transactions', {
      api_key: this.apiKey,
      sig: this.signPayload({}),
    });
    return (result.data?.result?.data || []).map((t: any) => ({
      txHash: t.id,
      asset: t.currency,
      amount: t.amount,
      timestamp: t.create_time,
    }));
  }

  private signPayload(payload: any): string {
    // Placeholder HMAC SHA256 signature
    const data = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${payload[k]}`)
      .join('&');
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }
}
