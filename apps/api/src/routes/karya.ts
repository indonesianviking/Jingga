import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getServer, getNetworkPassphrase, transactionFromXDR } from '../lib/stellar';
import { uploadToIPFS, getGatewayUrl } from '../lib/ipfs';
import { validateFile, validateCover } from '../utils/fileValidation';
import { generateAssetCode } from '../services/assetCode';
import { createKaryaSchema, updateKaryaSchema } from '../schemas/karya';
import { KARYA_ERRORS } from '../errors/KaryaError';
import { verifyAuthorship } from '../services/verification';
import { mintKaryaAsset, buildMintTransaction, createRoyaltySplitForKarya } from '../services/minting';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/karya — Create karya
router.post('/', requireAuth, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parseMaybeString = (val: any) =>
      typeof val === 'string' ? JSON.parse(val) : val;

    const formData = {
      judul: req.body.judul,
      deskripsi: req.body.deskripsi,
      kategori: req.body.kategori,
      harga: parseFloat(req.body.harga),
      tags: req.body.tags ? parseMaybeString(req.body.tags) : undefined,
      collaborators: req.body.collaborators ? parseMaybeString(req.body.collaborators) : undefined,
    };

    const parsed = createKaryaSchema.safeParse(formData);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.file?.[0];
    if (!file) {
      res.status(400).json({ error: KARYA_ERRORS.MISSING_FILE.message });
      return;
    }

    const fileValidation = validateFile(file.buffer, file.mimetype);
    if (!fileValidation.valid) {
      res.status(400).json({ error: fileValidation.error });
      return;
    }

    const fileResult = await uploadToIPFS(file.buffer, file.originalname, file.mimetype);

    let coverUrl = null;
    const cover = files?.cover?.[0];
    if (cover) {
      const coverValidation = validateCover(cover.buffer, cover.mimetype);
      if (coverValidation.valid) {
        const coverResult = await uploadToIPFS(cover.buffer, 'cover', cover.mimetype);
        coverUrl = coverResult.gatewayUrl;
      }
    }

    const assetCode = await generateAssetCode();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    const collaborators = parsed.data.collaborators || [];
    const totalPercentage = collaborators.reduce((sum, c) => sum + c.persentase, 0);
    if (totalPercentage > 100) {
      res.status(400).json({ error: KARYA_ERRORS.INVALID_COLLABORATORS.message });
      return;
    }

    const { data: karya, error: karyaError } = await supabaseAdmin
      .from('karya')
      .insert({
        judul: parsed.data.judul,
        deskripsi: parsed.data.deskripsi,
        kategori: parsed.data.kategori,
        harga: parsed.data.harga,
        file_hash: fileResult.fileHash,
        ipfs_link: fileResult.ipfsHash,
        cover_image_url: coverUrl,
        file_size_bytes: file.buffer.length,
        file_type: file.mimetype,
        stellar_asset_code: assetCode,
        issuer_wallet: user.wallet_address,
        status: 'draft',
      })
      .select()
      .single();

    if (karyaError || !karya) {
      console.error('[Karya] Create error:', karyaError);
      res.status(500).json({ error: 'Failed to create work' });
      return;
    }

    if (collaborators.length > 0) {
      await supabaseAdmin.from('collaborators').insert(
        collaborators.map((c) => ({
          karya_id: karya.id,
          wallet_address: c.wallet_address,
          nama: c.nama,
          role: c.role,
          persentase: c.persentase,
        }))
      );
    }

    res.status(201).json({ karya });
  } catch (error) {
    console.error('[Karya] Create error:', error);
    res.status(500).json({ error: 'Failed to create work' });
  }
});

// POST /api/v1/karya/:id/publish — Publish karya & mint on Stellar
router.post('/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const { data: karya, error } = await supabaseAdmin
      .from('karya')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: KARYA_ERRORS.NOT_AUTHORIZED.message });
      return;
    }

    if (karya.status !== 'draft') {
      res.status(400).json({ error: KARYA_ERRORS.ALREADY_PUBLISHED.message });
      return;
    }

    // Step 1: Build unsigned mint transaction (for Freighter signing) or auto-mint
    let stellarTxHash: string | null = null;
    const requiresSigning = req.body.requiresSigning === true;

    try {
      if (requiresSigning) {
        // Return unsigned XDR for frontend to sign with Freighter
        const xdr = await buildMintTransaction(
          karya.issuer_wallet,
          karya.stellar_asset_code,
          karya.id
        );

        res.json({
          xdr,
          requiresSigning: true,
          karya_id: karya.id,
          asset_code: karya.stellar_asset_code,
          message: 'Please sign the transaction with your Freighter wallet',
        });
        return;
      } else {
        // Auto-mint: submit signed transaction
        const signedXdr = req.body.signed_xdr;
        if (signedXdr) {
          // Submit externally signed transaction
          const server = getServer();
          const transaction = transactionFromXDR(signedXdr, getNetworkPassphrase());
          const result = await server.submitTransaction(transaction);
          stellarTxHash = result.hash;
        }
      }
    } catch (mintError) {
      console.warn('[Karya] Mint error (non-fatal):', mintError);
      // Karya tetap di-publish meskipun mint gagal (bisa di-retry)
    }

    // Step 2: Update status to published
    const updatePayload: any = {
      status: 'published',
      published_at: new Date().toISOString(),
    };
    if (stellarTxHash) {
      updatePayload.stellar_tx_hash = stellarTxHash;
    }

    const { error: updateError } = await supabaseAdmin
      .from('karya')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error('[Karya] Publish update error:', updateError);
      res.status(500).json({ error: 'Failed to publish work' });
      return;
    }

    // Step 3: Auto-create royalty split on-chain if there are collaborators (non-blocking)
    try {
      const { data: collaborators } = await supabaseAdmin
        .from('collaborators')
        .select('wallet_address, role, persentase')
        .eq('karya_id', id);

      if (collaborators && collaborators.length > 0) {
        // Check if user has a custodial wallet (email auth) — needed for signing
        const { data: custodialWallet } = await supabaseAdmin
          .from('custodial_wallets')
          .select('encrypted_private_key, encryption_iv')
          .eq('user_id', req.user.sub)
          .maybeSingle();

        if (custodialWallet) {
          const [iv, authTag] = custodialWallet.encryption_iv.split(':');
          const { decryptPrivateKey } = await import('../lib/crypto');
          const secretKey = decryptPrivateKey(
            custodialWallet.encrypted_private_key,
            iv,
            authTag
          );

          const recipients = collaborators.map((c: any) => ({
            wallet: c.wallet_address,
            percentageBps: Math.round(c.persentase * 100), // Convert % to basis points
            role: c.role,
          }));

          const splitResult = await createRoyaltySplitForKarya(id, secretKey, recipients);
          if (splitResult.success) {
            console.log(`[Karya] Royalty split created: ${splitResult.txHash}`);
          } else {
            console.warn('[Karya] Royalty split failed (non-fatal):', splitResult.error);
          }
        } else {
          console.log('[Karya] Freighter user — royalty split requires manual Soroban signing');
          // Record split in DB as pending — author can sign via Freighter later
          const totalBps = collaborators.reduce(
            (sum: number, c: any) => sum + Math.round(c.persentase * 100),
            0
          );
          await supabaseAdmin.from('royalty_splits').upsert({
            karya_id: id,
            contract_address: process.env.CONTRACT_ROYALTY_SPLIT || '',
            total_percentage: totalBps / 100,
            status: 'pending',
          });
        }
      }
    } catch (splitError) {
      console.warn('[Karya] Royalty split error (non-fatal):', splitError);
    }

    res.json({
      karya: {
        id: karya.id,
        status: 'published',
        published_at: new Date().toISOString(),
        stellar_asset_code: karya.stellar_asset_code,
        stellar_tx_hash: stellarTxHash,
      },
      explorer_url: stellarTxHash
        ? `https://stellar.expert/explorer/testnet/tx/${stellarTxHash}`
        : null,
    });
  } catch (error) {
    console.error('[Karya] Publish error:', error);
    res.status(500).json({ error: 'Failed to publish work' });
  }
});

// PUT /api/v1/karya/:id — Update karya (draft only)
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = updateKaryaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { id } = req.params;

    const { data: karya, error: fetchError } = await supabaseAdmin
      .from('karya')
      .select('issuer_wallet, status')
      .eq('id', id)
      .single();

    if (fetchError || !karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: KARYA_ERRORS.NOT_AUTHORIZED.message });
      return;
    }

    if (karya.status !== 'draft') {
      res.status(400).json({ error: KARYA_ERRORS.NOT_DRAFT.message });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('karya')
      .update(parsed.data)
      .eq('id', id);

    if (updateError) {
      res.status(500).json({ error: 'Failed to update work' });
      return;
    }

    // Handle collaborators if provided
    const collaboratorsRaw = req.body.collaborators;
    if (collaboratorsRaw !== undefined) {
      const collaborators = Array.isArray(collaboratorsRaw)
        ? collaboratorsRaw
        : typeof collaboratorsRaw === 'string'
          ? JSON.parse(collaboratorsRaw)
          : [];

      const totalPercentage = collaborators.reduce((sum: number, c: any) => sum + (c.persentase || 0), 0);
      if (totalPercentage > 100) {
        res.status(400).json({ error: KARYA_ERRORS.INVALID_COLLABORATORS.message });
        return;
      }

      // Delete existing collaborators and insert new ones
      await supabaseAdmin.from('collaborators').delete().eq('karya_id', id);

      if (collaborators.length > 0) {
        const { error: collabError } = await supabaseAdmin.from('collaborators').insert(
          collaborators.map((c: any) => ({
            karya_id: id,
            wallet_address: c.wallet_address,
            nama: c.nama || '',
            role: c.role || 'kolaborator',
            persentase: c.persentase,
          }))
        );

        if (collabError) {
          console.error('[Karya] Update collaborators error:', collabError);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Karya] Update error:', error);
    res.status(500).json({ error: 'Failed to update work' });
  }
});

// DELETE /api/v1/karya/:id — Archive karya
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const { data: karya } = await supabaseAdmin
      .from('karya')
      .select('issuer_wallet')
      .eq('id', id)
      .single();

    if (!karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: KARYA_ERRORS.NOT_AUTHORIZED.message });
      return;
    }

    await supabaseAdmin
      .from('karya')
      .update({ status: 'archived' })
      .eq('id', id);

    res.json({ success: true });
  } catch (error) {
    console.error('[Karya] Archive error:', error);
    res.status(500).json({ error: 'Failed to archive work' });
  }
});

// POST /api/v1/karya/:id/view — Record view
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;
    const viewerWallet = req.body.viewer_wallet || null;

    await supabaseAdmin.from('karya_views').insert({
      karya_id: id,
      viewer_wallet: viewerWallet,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Karya] View error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// GET /api/v1/karya/my/list — Get current user's karya list (MUST be before /:id)
router.get('/my/list', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    let query = supabaseAdmin
      .from('karya')
      .select('*', { count: 'exact' })
      .eq('issuer_wallet', user?.wallet_address);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: karya, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch works' });
      return;
    }

    res.json({
      karya: karya || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Karya] My list error:', error);
    res.status(500).json({ error: 'Failed to fetch works' });
  }
});

// GET /api/v1/karya/:id — Get karya detail with proof
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;

    const { data: karya, error } = await supabaseAdmin
      .from('karya')
      .select('*, users!issuer_wallet(nama, wallet_address), collaborators(*)')
      .eq('id', id)
      .single();

    if (error || !karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    if (karya.status === 'draft') {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    // Verify proof of authorship if minted
    let proof = null;
    if (karya.stellar_tx_hash) {
      proof = await verifyAuthorship(karya.stellar_tx_hash, karya.issuer_wallet);
    }

    // Build file URL
    const fileUrl = karya.ipfs_link ? getGatewayUrl(karya.ipfs_link) : null;

    res.json({
      karya: {
        ...karya,
        issuer_name: karya.users?.nama,
        issuer_wallet_display: karya.users?.wallet_address,
        users: undefined,
        file_url: fileUrl,
        proof,
      },
    });
  } catch (error) {
    console.error('[Karya] Detail error:', error);
    res.status(500).json({ error: 'Failed to get work' });
  }
});

export default router;
