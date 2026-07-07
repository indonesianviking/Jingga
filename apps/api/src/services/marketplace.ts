import { supabaseAdmin } from '../lib/supabase';

export interface MarketplaceQuery {
  search?: string;
  kategori?: string;
  sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export interface MarketplaceKarya {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  cover_image_url: string | null;
  issuer_wallet: string;
  issuer_name: string;
  total_sales: number;
  total_revenue: number;
  created_at: string;
  file_type: string | null;
}

export async function getMarketplaceKarya(query: MarketplaceQuery) {
  const { search, kategori, sort = 'newest', page = 1, limit = 20 } = query;

  if (!supabaseAdmin) {
    return { karya: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  }

  let dbQuery = supabaseAdmin
    .from('karya')
    .select(`
      id, judul, deskripsi, kategori, harga, cover_image_url,
      issuer_wallet, total_sales, total_revenue, created_at, file_type,
      users!issuer_wallet(nama)
    `, { count: 'exact' })
    .eq('status', 'published');

  if (kategori) {
    dbQuery = dbQuery.eq('kategori', kategori);
  }

  if (search) {
    dbQuery = dbQuery.or(`judul.ilike.%${search}%,deskripsi.ilike.%${search}%`);
  }

  switch (sort) {
    case 'popular':
      dbQuery = dbQuery.order('total_sales', { ascending: false });
      break;
    case 'price_asc':
      dbQuery = dbQuery.order('harga', { ascending: true });
      break;
    case 'price_desc':
      dbQuery = dbQuery.order('harga', { ascending: false });
      break;
    default:
      dbQuery = dbQuery.order('created_at', { ascending: false });
  }

  const offset = (page - 1) * limit;
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error('[Marketplace] Query error:', error);
    return { karya: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  }

  const karya: MarketplaceKarya[] = (data || []).map((k: any) => ({
    id: k.id,
    judul: k.judul,
    deskripsi: k.deskripsi,
    kategori: k.kategori,
    harga: k.harga,
    cover_image_url: k.cover_image_url,
    issuer_wallet: k.issuer_wallet,
    issuer_name: k.users?.nama || 'Anonymous',
    total_sales: k.total_sales,
    total_revenue: k.total_revenue,
    created_at: k.created_at,
    file_type: k.file_type,
  }));

  return {
    karya,
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getFeaturedKarya() {
  if (!supabaseAdmin) return { featured: [] };

  const { data, error } = await supabaseAdmin
    .from('karya')
    .select(`
      id, judul, cover_image_url, total_sales, kategori,
      users!issuer_wallet(nama)
    `)
    .eq('status', 'published')
    .order('total_sales', { ascending: false })
    .limit(6);

  if (error) return { featured: [] };

  return {
    featured: (data || []).map((k: any) => ({
      id: k.id,
      judul: k.judul,
      cover_image_url: k.cover_image_url,
      issuer_name: k.users?.nama || 'Anonymous',
      total_sales: k.total_sales,
      kategori: k.kategori,
    })),
  };
}
