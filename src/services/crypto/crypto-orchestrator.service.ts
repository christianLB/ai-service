import { CryptoConnector } from './connectors/crypto-connector.interface';
import { CryptoComConnector } from './connectors/cryptocom.connector';
import { BinanceConnector } from './connectors/binance.connector';
import { MetaMaskConnector } from './connectors/metamask.connector';

export class CryptoOrchestrator {
  private connectors: CryptoConnector[] = [];

  constructor() {}

  registerConnector(connector: CryptoConnector): void {
    this.connectors.push(connector);
  }

  async syncAll(): Promise<void> {
    for (const c of this.connectors) {
      await c.connect();
      const balances = await c.getBalances();
      const txs = await c.getTransactions();
      console.log(`[${c.name}] balances`, balances.length);
      console.log(`[${c.name}] tx`, txs.length);
      // Here store in DB
    }
  }
}

export function createDefaultOrchestrator(): CryptoOrchestrator {
  const orch = new CryptoOrchestrator();
  if (process.env.CRYPTOCOM_API_KEY && process.env.CRYPTOCOM_SECRET_KEY) {
    orch.registerConnector(
      new CryptoComConnector(
        process.env.CRYPTOCOM_API_KEY,
        process.env.CRYPTOCOM_SECRET_KEY
      )
    );
  }
  if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY) {
    orch.registerConnector(
      new BinanceConnector(
        process.env.BINANCE_API_KEY,
        process.env.BINANCE_SECRET_KEY
      )
    );
  }
  if (process.env.METAMASK_PRIVATE_KEY && process.env.ETH_RPC_URL) {
    orch.registerConnector(
      new MetaMaskConnector(
        process.env.ETH_RPC_URL,
        process.env.METAMASK_PRIVATE_KEY
      )
    );
  }
  return orch;
}
