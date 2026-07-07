import * as Stellar from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';
import { getSignedUrl } from '../lib/ipfs';

export const PAYMENT_ERRORS = {
  KARYA_NOT_FOUND: { code: 'KARYA_NOT_FOUND', message: 'Karya tidak ditemukan', status: 404 },
  CANNOT_BUY_OWN: { code: 'CANNOT_BUY_OWN', message: 'Tidak bisa membeli karya sendiri', status: 400 },
  ALREADY_PURCHASED: { code: 'ALREADY_PURCHASED', message: 'Sudah membeli karya ini', status: 400 },
  INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo XLM tidak cukup', status: 400 },
  TX_FAILED: { code: 'TX_FAILED', message: 'Transaksi gagal di Stellar', status: 400 },
  TX_TIMEOUT: { code: 'TX_TIMEOUT', message: 'Transaksi expired, silakan coba lagi', status: 400 },
  USER_NOT_AUTHENTICATED: { code: 'USER_NOT_AUTHENTICATED', message: 'Silakan login terlebih dahulu', status: 401 },
} as const;

export class PaymentError extends Error {
  code: string;
  status: number;

  constructor(errorKey: keyof typeof PAYMENT_ERRORS) {
    const error = PAYMENT_ERRORS[errorKey];
    super(error.message);
    this.name = 'PaymentError';
    this.code = error.code;
    this.status = error.status;
  }
}

interface PaymentInitiation {
  xdr: string;
  amount: string;
  recipient: string;
  assetCode: string;
  memo: string;
}

interface PaymentConfirmation {
  txHash: string;
  accessUrl: string;
  expiresAt: string;
  explorerUrl: string;
}

// Generate payment transaction XDR
export async function initiatePayment(
  buyerWallet: string,
  karyaId: string
): Promise<PaymentInitiation> {
  if (!supabaseAdmin) throw new PaymentError('KARYA_NOT_FOUND');

  // 1. Fetch karya
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .eq('status', 'published')
    .single();

  if (karyaError || !karya) throw new PaymentError('KARYA_NOT_FOUND');
  if (karya.issuer_wallet === buyerWallet) throw new PaymentError('CANNOT_BUY_OWN');

  // 2. Check if already purchased
  const { data: existingTx } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('karya_id', karyaId)
    .eq('buyer_wallet', buyerWallet)
    .eq('status', 'confirmed')
    .single();

  if (existingTx) throw new PaymentError('ALREADY_PURCHASED');

  // 3. Load buyer account
  let buyerAccount;
  try {
    buyerAccount = await getServer().loadAccount(buyerWallet);
  } catch (error) {
    throw new PaymentError('TX_FAILED');
  }

  // 4. Build payment transaction
  const amount = karya.harga.toString();
  const memo = `JINGGA:BUY:${karyaId.slice(0, 8)}`;

  const transaction = new Stellar.TransactionBuilder(buyerAccount, {
    fee: Stellar.BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(Stellar.Operation.payment({
      destination: karya.issuer_wallet,
      asset: Stellar.Asset.native(), // XLM
      amount,
    }))
    .addMemo(Stellar.Memo.text(memo))
    .setTimeout(300) // 5 minutes to sign
    .build();

  return {
    xdr: transaction.toXDR(),
    amount,
    recipient: karya.issuer_wallet,
    assetCode: karya.stellar_asset_code,
    memo,
  };
}

// Confirm payment and grant access
export async function confirmPayment(
  signedXdr: string,
  karyaId: string,
  buyerWallet: string
): Promise<PaymentConfirmation> {
  if (!supabaseAdmin) throw new PaymentError('KARYA_NOT_FOUND');

  // 1. Deserialize and submit transaction
  let transaction;
  try {
    transaction = Stellar.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
  } catch (error) {
    throw new PaymentError('TX_FAILED');
  }

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
  } catch (error) {
    console.error('[Payment] Submit error:', error);
    throw new PaymentError('TX_FAILED');
  }

  // 2. Fetch karya details
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .single();

  if (karyaError || !karya) throw new PaymentError('KARYA_NOT_FOUND');

  // 3. Record in database
  await supabaseAdmin.from('transactions').insert({
    karya_id: karyaId,
    buyer_wallet: buyerWallet,
    seller_wallet: karya.issuer_wallet,
    jumlah: karya.harga,
    stellar_tx_hash: result.hash,
    status: 'confirmed',
    payment_method: 'direct',
    confirmed_at: new Date().toISOString(),
  });

  // 4. Update karya stats
  await supabaseAdmin.rpc('increment_karya_sales', {
    p_karya_id: karyaId,
    p_amount: karya.harga,
  });

  // 5. Generate signed URL for file access (1 hour expiry)
  const accessUrl = karya.ipfs_link ? await getSignedUrl(karya.ipfs_link, 3600) : null;
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const explorerUrl = `https://stellar.expert/testnet/tx/${result.hash}`;

  return {
    txHash: result.hash,
    accessUrl: accessUrl || '',
    expiresAt,
    explorerUrl,
  };
}

// Check if user has purchased karya
export async function hasPurchased(
  buyerWallet: string,
  karyaId: string
): Promise<{ purchased: boolean; transaction: { txHash: string; purchasedAt: string } | null }> {
  if (!supabaseAdmin) return { purchased: false, transaction: null };

  const { data } = await supabaseAdmin
    .from('transactions')
    .select('stellar_tx_hash, confirmed_at')
    .eq('karya_id', karyaId)
    .eq('buyer_wallet', buyerWallet)
    .eq('status', 'confirmed')
    .single();

  return {
    purchased: !!data,
    transaction: data ? {
      txHash: data.stellar_tx_hash,
      purchasedAt: data.confirmed_at,
    } : null,
  };
}

// Get purchase history for a buyer
export async function getPurchaseHistory(buyerWallet: string) {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select(`
      karya_id,
      jumlah,
      stellar_tx_hash,
      confirmed_at,
      karya (
        judul,
        cover_image_url
      )
    `)
    .eq('buyer_wallet', buyerWallet)
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((tx: any) => ({
    karyaId: tx.karya_id,
    judul: tx.karya?.judul || 'Unknown',
    coverImageUrl: tx.karya?.cover_image_url || null,
    jumlah: tx.jumlah,
    txHash: tx.stellar_tx_hash,
    purchasedAt: tx.confirmed_at,
    explorerUrl: `https://stellar.expert/testnet/tx/${tx.stellar_tx_hash}`,
  }));
}
