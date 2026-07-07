import { getServer, getStellarExpertTxUrl } from '../lib/stellar';

export interface VerificationResult {
  verified: boolean;
  timestamp: string | null;
  blockHeight: number | null;
  explorer_url: string | null;
}

export async function verifyAuthorship(
  txHash: string,
  expectedIssuer: string
): Promise<VerificationResult> {
  try {
    const server = getServer();
    const transaction = await server.transactions().transaction(txHash).call();

    const verified = transaction.source_account === expectedIssuer;

    return {
      verified,
      timestamp: transaction.created_at,
      blockHeight: Number(transaction.ledger),
      explorer_url: getStellarExpertTxUrl(txHash),
    };
  } catch {
    return {
      verified: false,
      timestamp: null,
      blockHeight: null,
      explorer_url: null,
    };
  }
}

export async function getTransactionDetails(txHash: string): Promise<{
  hash: string;
  source: string;
  fee: string;
  ledger: number;
  createdAt: string;
  memo: string;
  explorer_url: string;
  operations: unknown[];
} | null> {
  try {
    const server = getServer();
    const transaction = await server.transactions().transaction(txHash).call();
    const operations = await server.operations().forTransaction(txHash).call();

    return {
      hash: transaction.hash as string,
      source: transaction.source_account as string,
      fee: String(transaction.fee_charged),
      ledger: Number(transaction.ledger),
      createdAt: transaction.created_at as string,
      memo: String(transaction.memo || ''),
      explorer_url: getStellarExpertTxUrl(txHash),
      operations: operations.records,
    };
  } catch {
    return null;
  }
}
