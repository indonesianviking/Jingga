import { Router, Request, Response } from 'express';
import { getMarketplaceKarya, getFeaturedKarya } from '../services/marketplace';

const router: ReturnType<typeof Router> = Router();

// GET /api/v1/marketplace — Browse published karya
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const kategori = req.query.kategori as string | undefined;
    const sort = (req.query.sort as string) || 'newest';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await getMarketplaceKarya({
      search,
      kategori,
      sort: sort as any,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('[Marketplace] Error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace' });
  }
});

// GET /api/v1/marketplace/featured — Get featured karya
router.get('/featured', async (_req: Request, res: Response) => {
  try {
    const result = await getFeaturedKarya();
    res.json(result);
  } catch (error) {
    console.error('[Marketplace] Featured error:', error);
    res.status(500).json({ error: 'Failed to fetch featured works' });
  }
});

export default router;
