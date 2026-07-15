'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';
import ReaderStatsSection from '@/components/reader/ReaderStats';
import PurchasedKaryaCard from '@/components/reader/PurchasedKaryaCard';
import PurchaseHistory from '@/components/reader/PurchaseHistory';
import Recommendations from '@/components/reader/Recommendations';
import {
  useReaderDashboard,
  usePurchaseList,
} from '@/hooks/useReader';
import { truncateAddress } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/api';

const KATEGORI_FILTERS = ['all', 'fiksi', 'paper', 'puisi', 'non-fiksi'] as const;

export default function ReaderPage() {
  const { isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();

  /* Dashboard overview */
  const { data: overview, loading: overviewLoading, refetch } = useReaderDashboard();

  /* Purchase list */
  const [kategori, setKategori] = useState<string>('all');
  const { data: purchaseData, loading: purchaseLoading } = usePurchaseList(kategori);

  /* Auth gate */
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
            <h1 className="text-headline text-ink mb-md">Connect Wallet</h1>
            <p className="text-body text-ink-muted mb-lg">
              Connect your Stellar wallet to access your collection
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
          <h1 className="text-display-md text-ink mb-sm">My Collection</h1>
          <p className="text-body text-ink-muted">
            Works you have purchased
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
            <h2 className="text-card-title text-ink">Purchased Works</h2>
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
              <h3 className="text-card-title text-ink mb-sm">No works yet</h3>
              <p className="text-body text-ink-muted mb-md">Start exploring the marketplace to discover interesting works!</p>
              <Link
                href="/marketplace"
                className="bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          )}
        </div>

        {/* My Licenses */}
        <div className="mb-xl">
          <LicenseSection />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
          {/* Purchase History */}
          <div className="bg-canvas border border-hairline">
            <div className="px-lg py-md border-b border-hairline">
              <h2 className="text-card-title text-ink">Purchase History</h2>
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
              <h2 className="text-card-title text-ink">Recommended for You</h2>
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

/* ============================================================ */
/* License Section Component (fetches & displays user's purchased licenses) */
/* ============================================================ */

function LicenseSection() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('jingga_auth_token');
    if (!token) { setLoading(false); return; }

    fetch(`${API_BASE}/api/v1/licenses/user/licenses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLicenses(data.licenses || []);
          setTotalSpent(data.total_spent || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-card-title text-ink mb-md">My Licenses</h2>
        <div className="space-y-md">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-surface-1 border border-hairline animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (licenses.length === 0) {
    return (
      <div>
        <h2 className="text-card-title text-ink mb-md">My Licenses</h2>
        <div className="bg-canvas border border-hairline p-xl text-center">
          <div className="w-16 h-16 bg-surface-1 flex items-center justify-center mx-auto mb-md">
            <svg className="w-8 h-8 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-card-title text-ink mb-sm">No Licenses Yet</h3>
          <p className="text-body text-ink-muted mb-lg">
            Purchase a license from any work to get distribution and resale rights.
          </p>
          <Link
            href="/marketplace"
            className="bg-primary text-on-primary text-button py-sm px-md hover:bg-primary-hover transition-colors"
          >
            Browse Works
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title text-ink">
          My Licenses
          <span className="text-body-sm text-ink-muted ml-sm">({licenses.length})</span>
        </h2>
        <span className="text-body-sm text-ink-muted">
          Total spent: <strong className="text-ink">{totalSpent} XLM</strong>
        </span>
      </div>

      <div className="space-y-md">
        {licenses.map((license: any) => (
          <Link
            key={license.id}
            href={`/karya/${license.karya_id}/license`}
            className="block bg-canvas border border-hairline p-lg hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-md">
              {/* Mini cover */}
              <div className="w-12 h-16 bg-surface-2 border border-hairline flex-shrink-0 flex items-center justify-center">
                {license.karya_cover ? (
                  <img src={license.karya_cover} alt={license.karya_judul} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-caption text-ink-subtle">{license.karya_judul.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm mb-xs">
                  <h3 className="text-body font-medium text-ink truncate">{license.karya_judul}</h3>
                  <Badge variant="info">{license.license_type}</Badge>
                  <span className="text-caption bg-semantic-success/10 text-semantic-success px-xs py-xxs">Active</span>
                </div>
                <p className="text-body-sm text-ink-muted">
                  {truncateAddress(license.original_author_wallet, 6)} &middot;{' '}
                  {license.territory === 'global' ? 'Global' : license.territory} &middot;{' '}
                  {license.duration === 'perpetual' ? 'Perpetual' : license.duration} &middot;{' '}
                  <strong>{license.license_fee} XLM</strong>
                </p>
                <p className="text-caption text-ink-subtle">
                  Issued: {new Date(license.issued_at).toLocaleDateString()} &middot;
                  {license.resale_count > 0
                    ? ` ${license.resale_count} resales (${license.total_resale_volume} XLM)`
                    : ' No resales yet'}
                </p>
              </div>
              <svg className="w-5 h-5 text-ink-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
