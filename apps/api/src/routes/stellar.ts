import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getServer, getAccountBalance, fundTestnetAccount, getStellarExpertAccountUrl, getNetworkPassphrase, transactionFromXDR } from '../lib/stellar';
import { mintKaryaAsset, buildMintTransaction } from '../services/minting';
import { verifyAuthorship } from '../services/verification';
import { decryptPrivateKey } from '../lib/crypto';

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/karya/:id/mint — Mint karya as Stellar asset
router.post('/karya/:id/mint', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { signedXdr } = req.body || {};

    // Fetch karya
    const { data: karya, error } = await supabaseAdmin
      .from('karya')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !karya) {
      res.status(404).json({ error: 'Work not found' });
      return;
    }

    // Check ownership
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Check if already minted
    if (karya.stellar_tx_hash) {
      res.status(400).json({ error: 'Work is already minted' });
      return;
    }

    let mintResult;

    if (signedXdr) {
      // Frontend signed the transaction (Freighter)
      const server = getServer();
      const transaction = transactionFromXDR(
        signedXdr,
        getNetworkPassphrase()
      );
      const result = await server.submitTransaction(transaction);

      mintResult = {
        stellar_tx_hash: result.hash,
        asset_code: karya.stellar_asset_code,
        issuer_wallet: karya.issuer_wallet,
        ledger: result.ledger,
        timestamp: new Date().toISOString(),
        explorer_url: `https://stellar.expert/testnet/tx/${result.hash}`,
      };

      // Update database
      await supabaseAdmin
        .from('karya')
        .update({
          stellar_tx_hash: result.hash,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else {
      // Check if custodial wallet
      const { data: wallet } = await supabaseAdmin
        .from('custodial_wallets')
        .select('encrypted_private_key, encryption_iv')
        .eq('user_id', req.user.sub)
        .single();

      if (wallet) {
        // Custodial: backend signs
        const [iv, authTag] = wallet.encryption_iv.split(':');
        const secretKey = decryptPrivateKey(wallet.encrypted_private_key, iv, authTag);

        mintResult = await mintKaryaAsset(
          id,
          karya.issuer_wallet,
          karya.stellar_asset_code,
          secretKey
        );
      } else {
        // Freighter: return unsigned XDR for frontend to sign
        const xdr = await buildMintTransaction(
          karya.issuer_wallet,
          karya.stellar_asset_code,
          id
        );

        res.json({
          requiresSigning: true,
          xdr,
          asset_code: karya.stellar_asset_code,
          issuer_wallet: karya.issuer_wallet,
        });
        return;
      }
    }

    res.json({ mint: mintResult });
  } catch (error: any) {
    console.error('[Stellar] Mint error:', error);
    res.status(500).json({ error: error.message || 'Failed to mint asset' });
  }
});

// GET /api/v1/karya/:id/verify — Verify proof of authorship
router.get('/karya/:id/verify', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;

    const { data: karya, error } = await supabaseAdmin
      .from('karya')
      .select('stellar_tx_hash, issuer_wallet, stellar_asset_code, published_at')
      .eq('id', id)
      .single();

    if (error || !karya) {
      res.status(404).json({ error: 'Work not found' });
      return;
    }

    if (!karya.stellar_tx_hash) {
      res.json({
        verified: false,
        proof: null,
        message: 'Work has not been minted yet',
      });
      return;
    }

    const verification = await verifyAuthorship(
      karya.stellar_tx_hash,
      karya.issuer_wallet
    );

    res.json({
      verified: verification.verified,
      proof: {
        tx_hash: karya.stellar_tx_hash,
        issuer_wallet: karya.issuer_wallet,
        asset_code: karya.stellar_asset_code,
        timestamp: verification.timestamp,
        block_height: verification.blockHeight,
        explorer_url: verification.explorer_url,
      },
    });
  } catch (error) {
    console.error('[Stellar] Verify error:', error);
    res.status(500).json({ error: 'Failed to verify authorship' });
  }
});

// GET /api/v1/stellar/balance/:wallet — Get XLM balance
router.get('/balance/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;

    const balance = await getAccountBalance(wallet);

    res.json({
      wallet,
      balance,
      explorer_url: getStellarExpertAccountUrl(wallet),
    });
  } catch (error) {
    console.error('[Stellar] Balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// POST /api/v1/stellar/fund/:wallet — Fund testnet account
router.post('/fund/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    await fundTestnetAccount(wallet);

    const balance = await getAccountBalance(wallet);

    res.json({
      success: true,
      balance,
      message: 'Account funded with 10,000 XLM on testnet',
    });
  } catch (error: any) {
    console.error('[Stellar] Fund error:', error);
    res.status(500).json({ error: error.message || 'Failed to fund account' });
  }
});

export default router;
