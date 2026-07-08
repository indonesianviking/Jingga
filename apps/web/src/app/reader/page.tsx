'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 p-8 rounded-xl max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Hubungkan Wallet</h1>
          <p className="text-gray-500 mb-6">Hubungkan wallet Stellar Anda untuk mengakses koleksi karya</p>
          {isFreighterAvailable ? (
            <button
              onClick={connectFreighter}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium mb-3"
            >
              Connect Freighter Wallet
            </button>
          ) : (
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-block px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium mb-3"
            >
              Install Freighter Extension
            </a>
          )}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-400">atau</span></div>
          </div>
          <Link
            href="/login"
            className="block w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Login dengan Email
          </Link>
          {authError && <p className="text-sm text-red-600 mt-4">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Koleksi Saya</h1>
          <p className="text-gray-500 mt-1">
            Karya-karya yang sudah Anda beli
          </p>
        </div>

        {/* Stats */}
        {overview?.stats && (
          <div className="mb-8">
            <ReaderStatsSection stats={overview.stats} />
          </div>
        )}

        {overviewLoading && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Purchased Karya */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Karya Saya</h2>
          </div>

          {/* Kategori tabs */}
          <div className="flex gap-2 mb-4">
            {KATEGORI_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setKategori(cat)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  kategori === cat
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {purchaseLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : purchaseData && purchaseData.purchases.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {purchaseData.purchases.map((purchase, idx) => (
                <PurchasedKaryaCard
                  key={`${purchase.karya_id}-${idx}`}
                  purchase={purchase}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada karya</h3>
              <p className="text-gray-500 mb-4">Mulai jelajahi marketplace untuk menemukan karya menarik!</p>
              <Link
                href="/marketplace"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Jelajahi Marketplace
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Purchase History */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Riwayat Pembelian</h2>
            </div>
            <div className="p-6">
              <PurchaseHistory
                purchases={purchaseData?.purchases || overview?.recentPurchases || []}
                loading={purchaseLoading && overviewLoading}
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Rekomendasi untuk Anda</h2>
            </div>
            <div className="p-6">
              <Recommendations
                recommendations={overview?.recommendations || []}
                favoriteCategory={overview?.stats?.favoriteCategory || null}
                loading={overviewLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
