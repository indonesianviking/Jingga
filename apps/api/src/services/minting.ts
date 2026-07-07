import * as StellarSdk from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, getStellarExpertTxUrl } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';
import { decryptPrivateKey } from '../lib/crypto';

export interface MintResult {
  stellar_tx_hash: string;
  asset_code: string;
  issuer_wallet: string;
  ledger: number;
  timestamp: string;
  explorer_url: string;
}

export async function mintKaryaAsset(
  karyaId: string,
  issuerWallet: string,
  assetCode: string,
  issuerSecretKey?: string
): Promise<MintResult> {
  const server = getServer();
  const networkPassphrase = getNetworkPassphrase();

  // Load issuer account
  const issuerAccount = await server.loadAccount(issuerWallet);

  // Create asset
  const asset = new StellarSdk.Asset(assetCode, issuerWallet);

  // Build transaction: create trust line + issue 1 unit to self
  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.changeTrust({
      asset,
      source: issuerWallet,
    }))
    .addOperation(StellarSdk.Operation.payment({
      destination: issuerWallet,
      asset,
      amount: '1',
    }))
    .addMemo(StellarSdk.Memo.text(`JINGGA:MINT:${karyaId}`))
    .setTimeout(180)
    .build();

  // Sign transaction
  if (issuerSecretKey) {
    const keypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    transaction.sign(keypair);
  }

  // Submit transaction
  const result = await server.submitTransaction(transaction);

  // Record in database
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('karya')
      .update({
        stellar_tx_hash: result.hash,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', karyaId);
  }

  return {
    stellar_tx_hash: result.hash,
    asset_code: assetCode,
    issuer_wallet: issuerWallet,
    ledger: result.ledger,
    timestamp: new Date().toISOString(),
    explorer_url: getStellarExpertTxUrl(result.hash),
  };
}

export async function buildMintTransaction(
  issuerWallet: string,
  assetCode: string,
  karyaId: string
): Promise<string> {
  const server = getServer();
  const networkPassphrase = getNetworkPassphrase();

  const issuerAccount = await server.loadAccount(issuerWallet);
  const asset = new StellarSdk.Asset(assetCode, issuerWallet);

  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.changeTrust({
      asset,
      source: issuerWallet,
    }))
    .addOperation(StellarSdk.Operation.payment({
      destination: issuerWallet,
      asset,
      amount: '1',
    }))
    .addMemo(StellarSdk.Memo.text(`JINGGA:MINT:${karyaId}`))
    .setTimeout(180)
    .build();

  return transaction.toXDR();
}
