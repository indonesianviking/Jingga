'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import ReaderStatsSection from '@/components/reader/ReaderStats';
import PurchasedKaryaCard from '@/components/reader/PurchasedKaryaCard';
import PurchaseHistory from '@/components/reader/PurchaseHistory';
import Recommendations from '@/components/reader/Recommendations';
import {
  useReaderDashboard,
  usePurchaseList,
} from '@/hooks/useReader';

const KATEGORI_FILTERS = ['all', 'fiksi', 'paper', 'puisi', 'non-fiksi'] as const;

export default function ReaderPage() {
  const { isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();

  // Dashboard overview
  const { data: overview, loading: overviewLoading, refetch } = useReaderDashboard();

  // Purchase list
  const [kategori, setKategori] = useState<string>('all');
  const { data: purchaseData, loading: purchaseLoading } = usePurchaseList(kategori);

  // Auth gate
  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-ink-subtle">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-lg">
          <div className="bg-canvas border border-hairline p-xl max-w-md text-center">
            <h1 className="text-headline text-ink mb-md">Hubungkan Wallet</h1>
            <p className="text-body text-ink-muted mb-lg">
              Hubungkan wallet Stellar Anda untuk mengakses koleksi karya
            </p>
            {isFreighterAvailable ? (
              <button
                onClick={connectFreighter}
                className="w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors mb-md"
              >
                Connect Freighter Wallet
              </button>
            ) : (
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block bg-surface-1 text-ink text-button py-sm px-md rounded-none hover:bg-surface-2 transition-colors border border-hairline mb-md"
              >
                Install Freighter Extension
              </a>
            )}
            <div className="relative my-md">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline"></div></div>
              <div className="relative flex justify-center text-sm"><span className="bg-canvas px-sm text-ink-subtle">atau</span></div>
            </div>
            <Link
              href="/login"
              className="block w-full border border-hairline text-ink text-button py-sm px-md rounded-none hover:bg-surface-1 transition-colors"
            >
              Login dengan Email
            </Link>
            {authError && <p className="text-body-sm text-semantic-error mt-md">{authError}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[1584px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Koleksi Saya</h1>
          <p className="text-body text-ink-muted">
            Karya-karya yang sudah Anda beli
          </p>
        </div>

        {/* Stats */}
        {overview?.stats && (
          <div className="mb-xl">
            <ReaderStatsSection stats={overview.stats} />
          </div>
        )}

        {overviewLoading && (
          <div className="mb-xl grid grid-cols-1 sm:grid-cols-3 gap-md">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-surface-1 border border-hairline animate-pulse" />
            ))}
          </div>
        )}

        {/* Purchased Karya */}
        <div className="mb-xl">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-card-title text-ink">Karya Saya</h2>
          </div>

          {/* Kategori tabs */}
          <div className="flex gap-xs mb-md">
            {KATEGORI_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setKategori(cat)}
                className={`px-sm py-xs text-body-sm rounded-none transition-colors border ${
                  kategori === cat
                    ? 'bg-surface-1 text-ink border-hairline font-body-emphasis'
                    : 'text-ink-muted border-transparent hover:bg-surface-1'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {purchaseLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-md">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-canvas border border-hairline overflow-hidden">
                  <div className="aspect-[3/4] bg-surface-1 animate-pulse" />
                  <div className="p-md space-y-xs">
                    <div className="h-4 bg-surface-1 w-3/4" />
                    <div className="h-3 bg-surface-1 w-1/2" />
                    <div className="h-8 bg-surface-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : purchaseData && purchaseData.purchases.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-md">
              {purchaseData.purchases.map((purchase, idx) => (
                <PurchasedKaryaCard
                  key={`${purchase.karya_id}-${idx}`}
                  purchase={purchase}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-section bg-canvas border border-hairline">
              <div className="text-4xl mb-md">🛒</div>
              <h3 className="text-card-title text-ink mb-sm">Belum ada karya</h3>
              <p className="text-body text-ink-muted mb-md">Mulai jelajahi marketplace untuk menemukan karya menarik!</p>
              <Link
                href="/marketplace"
                className="bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors"
              >
                Jelajahi Marketplace
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
          {/* Purchase History */}
          <div className="bg-canvas border border-hairline">
            <div className="px-lg py-md border-b border-hairline">
              <h2 className="text-card-title text-ink">Riwayat Pembelian</h2>
            </div>
            <div className="p-lg">
              <PurchaseHistory
                purchases={purchaseData?.purchases || overview?.recentPurchases || []}
                loading={purchaseLoading && overviewLoading}
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-canvas border border-hairline">
            <div className="px-lg py-md border-b border-hairline">
              <h2 className="text-card-title text-ink">Rekomendasi untuk Anda</h2>
            </div>
            <div className="p-lg">
              <Recommendations
                recommendations={overview?.recommendations || []}
                favoriteCategory={overview?.stats?.favoriteCategory || null}
                loading={overviewLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
