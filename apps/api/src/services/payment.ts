import * as Stellar from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, transactionFromXDR, getStellarExpertTxUrl } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';
import { getSignedUrl } from '../lib/ipfs';

export const PAYMENT_ERRORS = {
  KARYA_NOT_FOUND: { code: 'KARYA_NOT_FOUND', message: 'Karya tidak ditemukan', status: 404 },
  CANNOT_BUY_OWN: { code: 'CANNOT_BUY_OWN', message: 'Tidak bisa membeli karya sendiri', status: 400 },
  ALREADY_PURCHASED: { code: 'ALREADY_PURCHASED', message: 'Sudah membeli karya ini', status: 400 },
  ACCOUNT_NOT_FOUND: { code: 'ACCOUNT_NOT_FOUND', message: 'Wallet belum teraktivasi di Stellar network. Fund dulu via Dashboard > Fund Wallet atau https://friendbot.stellar.org?addr=WALLET_ADDRESS', status: 400 },
  INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo XLM tidak cukup', status: 400 },
  DESTINATION_NOT_FOUND: { code: 'DESTINATION_NOT_FOUND', message: 'Wallet penulis (penerima) belum teraktivasi di Stellar network. Penulis perlu fund walletnya dulu.', status: 400 },
  TX_FAILED: { code: 'TX_FAILED', message: 'Transaksi gagal di Stellar', status: 400 },
  TX_BAD_AUTH: { code: 'TX_BAD_AUTH', message: 'Gagal verifikasi tanda tangan. Pastikan Anda menandatangani dengan wallet yang benar (testnet vs mainnet).', status: 400 },
  TX_BAD_SEQ: { code: 'TX_BAD_SEQ', message: 'Transaksi menggunakan sequence number lama. Silakan refresh halaman dan coba lagi.', status: 400 },
  TX_INSUFFICIENT_FEE: { code: 'TX_INSUFFICIENT_FEE', message: 'Biaya transaksi terlalu rendah. Silakan coba lagi.', status: 400 },
  TX_UNDERFUNDED: { code: 'TX_UNDERFUNDED', message: 'Saldo XLM tidak mencukupi untuk pembayaran ini', status: 400 },
  TX_TOO_LATE: { code: 'TX_TOO_LATE', message: 'Waktu transaksi telah habis (expired). Silakan refresh halaman dan coba lagi.', status: 400 },
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
  } catch (error: any) {
    if (error.name === 'NotFoundError' || error.constructor?.name === 'NotFoundError' || error.response?.status === 404) {
      throw new PaymentError('ACCOUNT_NOT_FOUND');
    }
    throw new PaymentError('TX_FAILED');
  }

  // 4. Verify destination (author's wallet) exists on Stellar
  try {
    await getServer().loadAccount(karya.issuer_wallet);
  } catch {
    throw new PaymentError('DESTINATION_NOT_FOUND');
  }

  // 5. Build payment transaction
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
    transaction = transactionFromXDR(signedXdr, getNetworkPassphrase());
  } catch (error) {
    console.error('[Payment] fromXDR deserialization error:', error);
    console.error('[Payment] Network passphrase used:', getNetworkPassphrase());
    throw new PaymentError('TX_FAILED');
  }

  console.log('[Payment] Submitting transaction to Stellar...');
  console.log('[Payment] Transaction hash (pre-submit):', transaction.hash().toString('hex').slice(0, 16) + '...');

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
    console.log('[Payment] Submit SUCCESS! Tx hash:', result.hash);
  } catch (error: any) {
    console.error('[Payment] Submit error:', error);

    // Try to extract Stellar result codes
    const respData = error?.response?.data;
    const resultCodes = respData?.extras?.result_codes;

    if (resultCodes) {
      const txCode = resultCodes.transaction;
      const opCodes: string[] = resultCodes.operations || [];
      const opCode = opCodes[0] || '';

      console.error('[Payment] Stellar result codes:', {
        transaction: txCode,
        operations: opCodes,
      });

      // Map to user-friendly errors
      if (txCode === 'tx_bad_seq') throw new PaymentError('TX_BAD_SEQ');
      if (txCode === 'tx_bad_auth' || txCode === 'tx_too_many_sponsoring') {
        throw new PaymentError('TX_BAD_AUTH');
      }
      if (txCode === 'tx_insufficient_fee') throw new PaymentError('TX_INSUFFICIENT_FEE');
      if (txCode === 'tx_too_late') throw new PaymentError('TX_TOO_LATE');
      if (opCode === 'op_underfunded' || opCode === 'op_low_reserve') {
        throw new PaymentError('TX_UNDERFUNDED');
      }
      if (opCode === 'op_no_destination') throw new PaymentError('DESTINATION_NOT_FOUND');

      // Unmapped code — include raw code in message
      const rawMsg = `Stellar error: ${txCode}${opCode ? ' / ' + opCode : ''}`;
      console.error('[Payment] Unmapped Stellar code:', rawMsg);
      throw new PaymentError('TX_FAILED');
    }

    // Check for non-transaction errors (network, not found, etc)
    if (error?.name === 'NotFoundError' || error?.response?.status === 404) {
      throw new PaymentError('ACCOUNT_NOT_FOUND');
    }

    // Log full error for debugging (serialize safely)
    let errorSummary = '';
    try { errorSummary = JSON.stringify({
      name: error?.name,
      message: error?.message?.slice(0, 200),
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    }); } catch { errorSummary = String(error); }
    console.error('[Payment] Unmapped error:', errorSummary);

    throw new PaymentError('TX_FAILED');
  }

  // 2. Fetch karya details
  console.log('[Payment] Fetching karya:', karyaId);
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .single();

  if (karyaError || !karya) {
    console.error('[Payment] Karya not found:', karyaId, karyaError);
    throw new PaymentError('KARYA_NOT_FOUND');
  }

  // 3. Record in database
  console.log('[Payment] Recording transaction in DB...');
  console.log('[Payment] Tx hash:', result.hash);
  console.log('[Payment] Buyer:', buyerWallet, 'Seller:', karya.issuer_wallet);

  const { error: insertError } = await supabaseAdmin.from('transactions').insert({
    karya_id: karyaId,
    buyer_wallet: buyerWallet,
    seller_wallet: karya.issuer_wallet,
    jumlah: karya.harga,
    stellar_tx_hash: result.hash,
    status: 'confirmed',
    payment_method: 'direct',
    confirmed_at: new Date().toISOString(),
  });

  if (insertError) {
    // If duplicate (already recorded), it's OK
    if (insertError.code === '23505') {
      console.log('[Payment] Transaction already exists in DB (duplicate), continuing...');
    } else {
      console.error('[Payment] DB insert error:', insertError);
      throw new PaymentError('TX_FAILED');
    }
  } else {
    console.log('[Payment] Transaction recorded successfully');
  }

  // 4. Update karya stats (non-critical, ignore errors)
  console.log('[Payment] Updating karya stats...');
  const { error: rpcError } = await supabaseAdmin.rpc('increment_karya_sales', {
    p_karya_id: karyaId,
    p_amount: karya.harga,
  });

  if (rpcError) {
    console.error('[Payment] Stats update error (non-fatal):', rpcError);
  } else {
    console.log('[Payment] Stats updated successfully');
  }

  // 5. Generate signed URL for file access (1 hour expiry)
  console.log('[Payment] Generating access URL...');
  let accessUrl = null;
  try {
    accessUrl = karya.ipfs_link ? await getSignedUrl(karya.ipfs_link, 3600) : null;
  } catch (urlError) {
    console.error('[Payment] Access URL error (non-fatal):', urlError);
  }

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const explorerUrl = getStellarExpertTxUrl(result.hash);

  console.log('[Payment] Confirm complete! Returning success.');

  return {
    txHash: result.hash,
    accessUrl: accessUrl || '',
    expiresAt,
    explorerUrl,
  };
}

// ============================================================
// RECOVERY: Verify a Stellar transaction retroactively
// Checks if a user has sent a valid payment to the author's wallet
// and records the purchase in the database if missing.
// ============================================================

export async function verifyStellarPayment(
  txHash: string,
  buyerWallet: string,
  karyaId: string
): Promise<PaymentConfirmation> {
  if (!supabaseAdmin) throw new PaymentError('KARYA_NOT_FOUND');

  console.log('[Payment] Verify: Starting retroactive verification for tx:', txHash);

  // 1. Check if already recorded
  const { data: existing } = await supabaseAdmin
    .from('transactions')
    .select('id, stellar_tx_hash, status')
    .eq('stellar_tx_hash', txHash)
    .single();

  if (existing && existing.status === 'confirmed') {
    console.log('[Payment] Verify: Already recorded, returning existing data');
    const { data: karya } = await supabaseAdmin
      .from('karya')
      .select('*')
      .eq('id', karyaId)
      .single();

    const accessUrl = karya?.ipfs_link ? await getSignedUrl(karya.ipfs_link, 3600) : '';
    const explorerUrl = `https://stellar.expert/testnet/tx/${txHash}`;
    return {
      txHash,
      accessUrl: accessUrl || '',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      explorerUrl,
    };
  }

  // 2. Fetch karya
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .single();

  if (karyaError || !karya) {
    console.error('[Payment] Verify: Karya not found:', karyaId);
    throw new PaymentError('KARYA_NOT_FOUND');
  }

  if (karya.issuer_wallet === buyerWallet) {
    throw new PaymentError('CANNOT_BUY_OWN');
  }

  // 3. Fetch transaction & operations from Stellar
  console.log('[Payment] Verify: Fetching tx from Stellar...');
  let stellarTx;
  let stellarOps;
  try {
    stellarTx = await getServer().transactions().transaction(txHash).call();
    stellarOps = await getServer().operations().forTransaction(txHash).call();
  } catch (error: any) {
    console.error('[Payment] Verify: Stellar fetch error:', error?.message?.slice(0, 200));
    throw new PaymentError('TX_FAILED');
  }

  // 4. Verify the transaction
  // Check that it's a payment operation from buyer to seller for the correct amount
  console.log('[Payment] Verify: Stellar tx found, verifying operations...');

  const operations = stellarOps?.records || [];
  const expectedAmount = Number(karya.harga);
  const isPaymentToAuthor = operations.some((op: any) => {
    if (op.type !== 'payment') return false;
    return (
      op.from === buyerWallet &&
      op.to === karya.issuer_wallet &&
      Math.abs(parseFloat(op.amount) - expectedAmount) < 0.000001
    );
  });

  if (!isPaymentToAuthor) {
    console.error('[Payment] Verify: Transaction does not match expected payment');
    console.error('[Payment] Verify: Expected:', {
      from: buyerWallet,
      to: karya.issuer_wallet,
      amount: karya.harga,
    });
    console.error('[Payment] Verify: Actual operations:', operations.slice(0, 3));
    throw new PaymentError('TX_FAILED');
  }

  // 5. Record in database
  console.log('[Payment] Verify: Transaction verified! Recording in DB...');
  const { error: insertError } = await supabaseAdmin.from('transactions').insert({
    karya_id: karyaId,
    buyer_wallet: buyerWallet,
    seller_wallet: karya.issuer_wallet,
    jumlah: karya.harga,
    stellar_tx_hash: txHash,
    status: 'confirmed',
    payment_method: 'direct',
    confirmed_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[Payment] Verify: DB insert error:', insertError);
    if (insertError.code === '23505') {
      // Duplicate — already recorded by someone else, still OK
      console.log('[Payment] Verify: Duplicate hash, continuing...');
    } else {
      throw new PaymentError('TX_FAILED');
    }
  } else {
    console.log('[Payment] Verify: Transaction recorded successfully!');
  }

  // 6. Update stats (non-critical)
  try {
    await supabaseAdmin.rpc('increment_karya_sales', {
      p_karya_id: karyaId,
      p_amount: karya.harga,
    });
  } catch (statsError: any) {
    console.error('[Payment] Verify: Stats update error (non-fatal):', statsError);
  }

  // 7. Generate access URL
  let accessUrl = '';
  try {
    accessUrl = karya.ipfs_link ? await getSignedUrl(karya.ipfs_link, 3600) : '';
  } catch {}

  const explorerUrl = getStellarExpertTxUrl(txHash);

  console.log('[Payment] Verify: Complete!');

  return {
    txHash,
    accessUrl,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
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
