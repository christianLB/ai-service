import { Wallet, JsonRpcProvider } from 'ethers';
import { CryptoConnector, CryptoBalance, CryptoTransaction } from './crypto-connector.interface';

export class MetaMaskConnector implements CryptoConnector {
  readonly name = 'metamask';
  private provider: JsonRpcProvider;
  private wallet: Wallet;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
  }

  async connect(): Promise<void> {
    // Nothing to do, provider is ready
  }

  async getBalances(): Promise<CryptoBalance[]> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return [{ asset: 'ETH', amount: balance.toString() }];
  }

  async getTransactions(): Promise<CryptoTransaction[]> {
    // ethers v6 no longer provides getHistory; implement custom logic
    return [];
  }
}
