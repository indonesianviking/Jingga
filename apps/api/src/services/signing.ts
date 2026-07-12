import * as StellarSdk from '@stellar/stellar-sdk';
import { supabaseAdmin } from '../lib/supabase';
import { decryptPrivateKey } from '../lib/crypto';
import { fundTestnetAccount, transactionFromXDR } from '../lib/stellar';

export async function signTransactionForUser(
  userId: string,
  transactionXdr: string
): Promise<string> {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const { data: wallet, error } = await supabaseAdmin
    .from('custodial_wallets')
    .select('encrypted_private_key, encryption_iv')
    .eq('user_id', userId)
    .single();

  if (error || !wallet) {
    throw new Error('No custodial wallet found for this user');
  }

  // Parse iv:authTag from combined string
  const [iv, authTag] = wallet.encryption_iv.split(':');

  const privateKey = decryptPrivateKey(
    wallet.encrypted_private_key,
    iv,
    authTag
  );

  const keypair = StellarSdk.Keypair.fromSecret(privateKey);
  const transaction = transactionFromXDR(
    transactionXdr,
    StellarSdk.Networks.TESTNET
  );

  transaction.sign(keypair);

  return transaction.toXDR();
}

export async function getCustodialWallet(userId: string) {
  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('custodial_wallets')
    .select('public_key, is_funded, created_at')
    .eq('user_id', userId)
    .single();

  return data;
}

export async function fundCustodialWallet(userId: string): Promise<boolean> {
  const wallet = await getCustodialWallet(userId);
  if (!wallet) return false;

  try {
    await fundTestnetAccount(wallet.public_key);

    if (supabaseAdmin) {
      await supabaseAdmin
        .from('custodial_wallets')
        .update({ is_funded: true })
        .eq('user_id', userId);
    }

    return true;
  } catch (error) {
    console.error('[Signing] Failed to fund wallet:', error);
    return false;
  }
}
