import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

// Reader dashboard overview
export interface ReaderStats {
  totalPurchased: number;
  totalSpent: number;
  favoriteCategory: string | null;
}

export interface RecentPurchase {
  karya_id: string;
  judul: string;
  cover_image_url: string | null;
  kategori: string;
  issuer_name: string;
  jumlah: number;
  purchased_at: string;
  tx_hash: string;
}

export interface Recommendation {
  id: string;
  judul: string;
  cover_image_url: string | null;
  kategori: string;
  harga: number;
  issuer_name: string;
}

export interface ReaderDashboard {
  stats: ReaderStats;
  recentPurchases: RecentPurchase[];
  recommendations: Recommendation[];
}

// Purchase list item
export interface PurchaseListItem {
  karya_id: string;
  judul: string;
  cover_image_url: string | null;
  kategori: string;
  harga: number;
  issuer_name: string;
  jumlah: number;
  purchased_at: string;
  tx_hash: string;
  explorer_url: string | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseListResponse {
  purchases: PurchaseListItem[];
  pagination: Pagination;
}

// Access URL response
export interface AccessUrlResponse {
  accessUrl: string;
  expiresAt: string;
  judul: string;
}

// Hook for reader dashboard
export function useReaderDashboard() {
  const [data, setData] = useState<ReaderDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest<ReaderDashboard>('/api/v1/reader/dashboard');
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// Hook for purchase list
export function usePurchaseList(kategori?: string, page: number = 1) {
  const [data, setData] = useState<PurchaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (kategori && kategori !== 'all') params.set('kategori', kategori);
      params.set('page', String(page));
      const query = params.toString();
      const result = await apiRequest<PurchaseListResponse>(
        `/api/v1/reader/purchases${query ? `?${query}` : ''}`
      );
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [kategori, page]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return { data, loading, error, refetch: fetchPurchases };
}

// Get access URL for purchased karya
export async function getAccessUrl(karyaId: string): Promise<AccessUrlResponse> {
  return apiRequest<AccessUrlResponse>(`/api/v1/reader/access/${karyaId}`, {
    method: 'POST',
  });
}
