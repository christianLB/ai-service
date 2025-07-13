export interface CryptoBalance {
  asset: string;
  amount: string;
}

export interface CryptoTransaction {
  txHash: string;
  asset: string;
  amount: string;
  timestamp: number;
}

export interface CryptoConnector {
  readonly name: string;
  connect(): Promise<void>;
  getBalances(): Promise<CryptoBalance[]>;
  getTransactions(): Promise<CryptoTransaction[]>;
}
