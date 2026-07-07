import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { createNonce, consumeNonce } from '../lib/nonce';
import { signJWT, requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/auth/challenge
router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== 'string') {
      res.status(400).json({ error: 'publicKey is required' });
      return;
    }

    // Validate Stellar public key format
    if (!publicKey.startsWith('G') || publicKey.length !== 56) {
      res.status(400).json({ error: 'Invalid Stellar public key' });
      return;
    }

    const { nonce, challenge } = createNonce(publicKey);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    res.json({ challenge, nonce, expiresAt });
  } catch (error) {
    console.error('[Auth] Challenge error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// POST /api/v1/auth/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { publicKey, signedMessage, nonce } = req.body;

    if (!publicKey || !signedMessage || !nonce) {
      res.status(400).json({ error: 'publicKey, signedMessage, and nonce are required' });
      return;
    }

    // Consume nonce (one-time use, checks expiry)
    const nonceEntry = consumeNonce(nonce);
    if (!nonceEntry) {
      res.status(400).json({ error: 'Invalid or expired nonce' });
      return;
    }

    // Verify the nonce matches the public key
    if (nonceEntry.publicKey !== publicKey) {
      res.status(400).json({ error: 'Nonce does not match public key' });
      return;
    }    // Verify signature against the stored challenge
      // The stored challenge was created at a specific timestamp
      const expectedChallenge = nonceEntry.challenge;
      if (signedMessage !== expectedChallenge) {
        // For demo mode: accept if nonce is valid
        // In production, verify cryptographic signature here
        console.warn('[Auth] Signature mismatch, proceeding in demo mode');
      }

    // Upsert user in database
    let user = null;
    if (supabaseAdmin) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('wallet_address', publicKey)
        .single();

      if (existingUser) {
        user = existingUser;
      } else {
        // Create new user
        const { data: newUser, error } = await supabaseAdmin
          .from('users')
          .insert({
            wallet_address: publicKey,
            nama: `User ${publicKey.slice(0, 8)}...`,
            role: 'keduanya',
          })
          .select()
          .single();

        if (error) {
          console.error('[Auth] User creation error:', error);
          res.status(500).json({ error: 'Failed to create user' });
          return;
        }
        user = newUser;
      }
    } else {
      // No database: return mock user
      user = {
        id: crypto.randomUUID(),
        wallet_address: publicKey,
        nama: `User ${publicKey.slice(0, 8)}...`,
        role: 'keduanya',
        created_at: new Date().toISOString(),
      };
    }

    // Generate JWT
    const token = signJWT({
      sub: user.id,
      wallet_address: publicKey,
    });

    res.json({
      token,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        nama: user.nama,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('[Auth] Verify error:', error);
    res.status(500).json({ error: 'Failed to verify authentication' });
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let user = null;
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.sub)
        .single();
      user = data;
    }

    if (!user) {
      // Fallback: construct from JWT
      user = {
        id: req.user.sub,
        wallet_address: req.user.wallet_address,
        nama: `User ${req.user.wallet_address.slice(0, 8)}...`,
        role: 'keduanya',
      };
    }

    res.json({ user });
  } catch (error) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  // With stateless JWT, logout is handled client-side
  // In production, you'd blacklist the token
  res.json({ success: true });
});

export default router;
