import * as Stellar from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';
import { getSignedUrl } from '../lib/ipfs';

export const CLAIMABLE_ERRORS = {
  KARYA_NOT_FOUND: { code: 'KARYA_NOT_FOUND', message: 'Karya tidak ditemukan', status: 404 },
  CANNOT_BUY_OWN: { code: 'CANNOT_BUY_OWN', message: 'Tidak bisa membeli karya sendiri', status: 400 },
  ALREADY_PURCHASED: { code: 'ALREADY_PURCHASED', message: 'Sudah membeli karya ini', status: 400 },
  BALANCE_NOT_FOUND: { code: 'BALANCE_NOT_FOUND', message: 'Claimable balance tidak ditemukan', status: 404 },
  BALANCE_ALREADY_CLAIMED: { code: 'BALANCE_ALREADY_CLAIMED', message: 'Balance sudah di-claim', status: 400 },
  BALANCE_EXPIRED: { code: 'BALANCE_EXPIRED', message: 'Balance sudah expired', status: 400 },
  TX_FAILED: { code: 'TX_FAILED', message: 'Transaksi gagal di Stellar', status: 400 },
} as const;

export class ClaimableBalanceError extends Error {
  code: string;
  status: number;

  constructor(errorKey: keyof typeof CLAIMABLE_ERRORS) {
    const error = CLAIMABLE_ERRORS[errorKey];
    super(error.message);
    this.name = 'ClaimableBalanceError';
    this.code = error.code;
    this.status = error.status;
  }
}

interface ClaimableBalanceXdrResult {
  xdr: string;
  amount: string;
  memo: string;
}

interface ClaimableBalanceSubmitResult {
  balanceId: string;
  txHash: string;
  explorerUrl: string;
}

interface ClaimBalanceResult {
  txHash: string;
  accessUrl: string;
  expiresAt: string;
  explorerUrl: string;
}

// Generate unsigned XDR for creating claimable balance
export async function initiateClaimableBalance(
  karyaId: string,
  buyerWallet: string
): Promise<ClaimableBalanceXdrResult> {
  if (!supabaseAdmin) throw new ClaimableBalanceError('KARYA_NOT_FOUND');

  // 1. Fetch karya
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .eq('status', 'published')
    .single();

  if (karyaError || !karya) throw new ClaimableBalanceError('KARYA_NOT_FOUND');
  if (karya.issuer_wallet === buyerWallet) throw new ClaimableBalanceError('CANNOT_BUY_OWN');

  // 2. Check if already purchased
  const { data: existingTx } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('karya_id', karyaId)
    .eq('buyer_wallet', buyerWallet)
    .eq('status', 'confirmed')
    .single();

  if (existingTx) throw new ClaimableBalanceError('ALREADY_PURCHASED');

  // 3. Load issuer account
  let issuerAccount;
  try {
    issuerAccount = await getServer().loadAccount(karya.issuer_wallet);
  } catch (error) {
    throw new ClaimableBalanceError('TX_FAILED');
  }

  // 4. Build create claimable balance transaction
  const amount = karya.harga.toString();
  const memo = `JINGGA:CLAIM:${karyaId.slice(0, 8)}`;

  // Create claimant - buyer can claim unconditionally
  const claimant = new Stellar.Claimant(
    buyerWallet,
    Stellar.Claimant.predicateUnconditional()
  );

  const transaction = new Stellar.TransactionBuilder(issuerAccount, {
    fee: Stellar.BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(Stellar.Operation.createClaimableBalance({
      asset: Stellar.Asset.native(),
      amount,
      claimants: [claimant],
    }))
    .addMemo(Stellar.Memo.text(memo))
    .setTimeout(300)
    .build();

  return {
    xdr: transaction.toXDR(),
    amount,
    memo,
  };
}

// Submit signed claimable balance transaction
export async function submitClaimableBalance(
  signedXdr: string,
  karyaId: string,
  buyerWallet: string
): Promise<ClaimableBalanceSubmitResult> {
  if (!supabaseAdmin) throw new ClaimableBalanceError('KARYA_NOT_FOUND');

  // 1. Deserialize and submit transaction
  let transaction;
  try {
    transaction = Stellar.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
  } catch (error) {
    throw new ClaimableBalanceError('TX_FAILED');
  }

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
  } catch (error) {
    console.error('[ClaimableBalance] Submit error:', error);
    throw new ClaimableBalanceError('TX_FAILED');
  }

  // 2. Fetch karya details
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .single();

  if (karyaError || !karya) throw new ClaimableBalanceError('KARYA_NOT_FOUND');

  // 3. Get balance ID from operation result
  let balanceId = result.hash;
  try {
    const operations = await getServer().operations()
      .forTransaction(result.hash)
      .call();

    const createBalanceOp = operations.records.find(
      (op: any) => op.type === 'create_claimable_balance'
    );

    if (createBalanceOp && 'balance_id' in createBalanceOp) {
      balanceId = (createBalanceOp as any).balance_id;
    }
  } catch (error) {
    console.warn('[ClaimableBalance] Could not fetch balance ID:', error);
  }

  // 4. Record in database
  await supabaseAdmin.from('claimable_balances').insert({
    karya_id: karyaId,
    balance_id: balanceId,
    buyer_wallet: buyerWallet,
    seller_wallet: karya.issuer_wallet,
    amount: karya.harga,
    stellar_tx_hash: result.hash,
    status: 'created',
  });

  const explorerUrl = `https://stellar.expert/testnet/tx/${result.hash}`;

  return {
    balanceId,
    txHash: result.hash,
    explorerUrl,
  };
}

// Generate unsigned XDR for claiming a balance
export async function initiateClaim(
  balanceId: string,
  buyerWallet: string
): Promise<ClaimableBalanceXdrResult> {
  if (!supabaseAdmin) throw new ClaimableBalanceError('BALANCE_NOT_FOUND');

  // 1. Check balance status in database
  const { data: balance, error: balanceError } = await supabaseAdmin
    .from('claimable_balances')
    .select('*')
    .eq('balance_id', balanceId)
    .eq('buyer_wallet', buyerWallet)
    .single();

  if (balanceError || !balance) throw new ClaimableBalanceError('BALANCE_NOT_FOUND');
  if (balance.status === 'claimed') throw new ClaimableBalanceError('BALANCE_ALREADY_CLAIMED');
  if (balance.status === 'expired') throw new ClaimableBalanceError('BALANCE_EXPIRED');

  // 2. Load buyer account
  let buyerAccount;
  try {
    buyerAccount = await getServer().loadAccount(buyerWallet);
  } catch (error) {
    throw new ClaimableBalanceError('TX_FAILED');
  }

  // 3. Build claim transaction
  const transaction = new Stellar.TransactionBuilder(buyerAccount, {
    fee: Stellar.BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(Stellar.Operation.claimClaimableBalance({
      balanceId,
    }))
    .addMemo(Stellar.Memo.text('JINGGA:CLAIM'))
    .setTimeout(300)
    .build();

  return {
    xdr: transaction.toXDR(),
    amount: balance.amount.toString(),
    memo: 'JINGGA:CLAIM',
  };
}

// Submit signed claim transaction
export async function submitClaim(
  signedXdr: string,
  balanceId: string,
  buyerWallet: string
): Promise<ClaimBalanceResult> {
  if (!supabaseAdmin) throw new ClaimableBalanceError('BALANCE_NOT_FOUND');

  // 1. Deserialize and submit transaction
  let transaction;
  try {
    transaction = Stellar.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
  } catch (error) {
    throw new ClaimableBalanceError('TX_FAILED');
  }

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
  } catch (error) {
    console.error('[ClaimableBalance] Claim error:', error);
    throw new ClaimableBalanceError('TX_FAILED');
  }

  // 2. Update database
  await supabaseAdmin
    .from('claimable_balances')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('balance_id', balanceId);

  // 3. Get karya details for access URL
  const { data: balance } = await supabaseAdmin
    .from('claimable_balances')
    .select('karya_id')
    .eq('balance_id', balanceId)
    .single();

  let accessUrl = '';
  let expiresAt = '';

  if (balance) {
    // 4. Record transaction
    const { data: karya } = await supabaseAdmin
      .from('karya')
      .select('*')
      .eq('id', balance.karya_id)
      .single();

    if (karya) {
      await supabaseAdmin.from('transactions').insert({
        karya_id: balance.karya_id,
        buyer_wallet: buyerWallet,
        seller_wallet: karya.issuer_wallet,
        jumlah: karya.harga,
        stellar_tx_hash: result.hash,
        status: 'confirmed',
        payment_method: 'claimable_balance',
        confirmed_at: new Date().toISOString(),
      });

      // 5. Update karya stats
      await supabaseAdmin.rpc('increment_karya_sales', {
        p_karya_id: balance.karya_id,
        p_amount: karya.harga,
      });

      // 6. Generate signed URL for file access
      if (karya.ipfs_link) {
        accessUrl = await getSignedUrl(karya.ipfs_link, 3600);
        expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      }
    }
  }

  const explorerUrl = `https://stellar.expert/testnet/tx/${result.hash}`;

  return {
    txHash: result.hash,
    accessUrl,
    expiresAt,
    explorerUrl,
  };
}

// Get claimable balance status
export async function getClaimableBalanceStatus(
  balanceId: string,
  buyerWallet: string
) {
  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('claimable_balances')
    .select('*')
    .eq('balance_id', balanceId)
    .eq('buyer_wallet', buyerWallet)
    .single();

  return data;
}
