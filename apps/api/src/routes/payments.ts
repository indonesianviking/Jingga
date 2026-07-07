import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  initiatePayment,
  confirmPayment,
  hasPurchased,
  getPurchaseHistory,
  PaymentError,
  PAYMENT_ERRORS,
} from '../services/payment';
import { supabaseAdmin } from '../lib/supabase';

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/payments/initiate — Generate unsigned payment XDR
router.post('/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { karya_id } = req.body;
    if (!karya_id) {
      res.status(400).json({ error: 'karya_id is required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await initiatePayment(user.wallet_address, karya_id);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Initiate error:', error);
    if (error instanceof PaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// POST /api/v1/payments/confirm — Submit signed transaction and grant access
router.post('/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { signed_xdr, karya_id } = req.body;
    if (!signed_xdr || !karya_id) {
      res.status(400).json({ error: 'signed_xdr and karya_id are required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await confirmPayment(signed_xdr, karya_id, user.wallet_address);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Confirm error:', error);
    if (error instanceof PaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// GET /api/v1/payments/check/:karyaId — Check if user has purchased karya
router.get('/check/:karyaId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { karyaId } = req.params;

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await hasPurchased(user.wallet_address, karyaId);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Check error:', error);
    res.status(500).json({ error: 'Failed to check purchase status' });
  }
});

// GET /api/v1/payments/history — Get purchase history for current user
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const history = await getPurchaseHistory(user.wallet_address);
    res.json({ purchases: history });
  } catch (error) {
    console.error('[Payments] History error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

export default router;
