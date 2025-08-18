import axios, { AxiosInstance } from 'axios';
import { CryptoConnector, CryptoBalance, CryptoTransaction } from './crypto-connector.interface';

export class BinanceConnector implements CryptoConnector {
  readonly name = 'binance';
  private api: AxiosInstance;
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.api = axios.create({
      baseURL: 'https://api.binance.com',
      timeout: 10000,
      headers: { 'X-MBX-APIKEY': apiKey },
    });
  }

  async connect(): Promise<void> {
    // Binance uses API key per request
  }

  async getBalances(): Promise<CryptoBalance[]> {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const sig = this.sign(query);
    const result = await this.api.get(`/api/v3/account?${query}&signature=${sig}`);
    return (result.data.balances || [])
      .filter((b: any) => Number(b.free) > 0)
      .map((b: any) => ({
        asset: b.asset,
        amount: b.free,
      }));
  }

  async getTransactions(): Promise<CryptoTransaction[]> {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const sig = this.sign(query);
    const result = await this.api.get(`/api/v3/myTrades?${query}&signature=${sig}`);
    return (result.data || []).map((t: any) => ({
      txHash: String(t.id),
      asset: t.symbol,
      amount: String(t.qty),
      timestamp: t.time,
    }));
  }

  private sign(data: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }
}
