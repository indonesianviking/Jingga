'use client';

import { useState } from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import DashboardStatsSection from '@/components/dashboard/DashboardStats';
import KaryaTable from '@/components/dashboard/KaryaTable';
import TransactionTable from '@/components/dashboard/TransactionTable';
import RevenueChart from '@/components/dashboard/RevenueChart';
import {
  useDashboardOverview,
  useDashboardKarya,
  useDashboardTransactions,
  useDashboardRevenue,
} from '@/hooks/useDashboard';

const KARYA_STATUS_FILTERS = ['all', 'published', 'draft', 'archived'] as const;

export default function DashboardPage() {
  const { user, walletAddress, isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();

  // Dashboard overview
  const { data: overview, loading: overviewLoading, refetch: refetchOverview } = useDashboardOverview();

  // Karya list
  const [karyaStatus, setKaryaStatus] = useState<string>('all');
  const { data: karyaData, loading: karyaLoading, refetch: refetchKarya } = useDashboardKarya(karyaStatus);

  // Transaction history
  const { data: txData, loading: txLoading } = useDashboardTransactions();

  // Revenue breakdown
  const { data: revenueData, loading: revenueLoading } = useDashboardRevenue();

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
              Hubungkan wallet Stellar Anda untuk mengakses dashboard penulis
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

  const stats = overview?.stats;

  return (
    <Layout>
      <div className="mx-auto max-w-[1584px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Dashboard</h1>
          <p className="text-body text-ink-muted">
            Selamat datang kembali, {user?.nama || 'Penulis'} {walletAddress && <span className="font-mono text-caption text-ink-subtle ml-xs">({truncateAddress(walletAddress, 6)})</span>}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-xl">
            <DashboardStatsSection stats={stats} />
          </div>
        )}

        {overviewLoading && !stats && (
          <div className="mb-xl grid grid-cols-2 md:grid-cols-4 gap-md">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-surface-1 border border-hairline animate-pulse" />
            ))}
          </div>
        )}

        {/* Karya Section */}
        <div className="bg-canvas border border-hairline mb-xl">
          <div className="px-lg py-md border-b border-hairline">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-card-title text-ink">Karya Saya</h2>
              <Link
                href="/upload"
                className="bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors"
              >
                + Upload Baru
              </Link>
            </div>
            {/* Status tabs */}
            <div className="flex gap-xs">
              {KARYA_STATUS_FILTERS.map(status => (
                <button
                  key={status}
                  onClick={() => setKaryaStatus(status)}
                  className={`px-sm py-xs text-body-sm rounded-none transition-colors border ${
                    karyaStatus === status
                      ? 'bg-surface-1 text-ink border-hairline font-body-emphasis'
                      : 'text-ink-muted border-transparent hover:bg-surface-1'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'all' && overview?.stats && (
                    <span className="ml-xs text-caption text-ink-subtle">
                      ({overview.stats.totalKarya})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="p-lg">
            <KaryaTable
              karya={karyaData?.karya || []}
              loading={karyaLoading}
              onRefetch={() => {
                refetchKarya();
                refetchOverview();
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
          {/* Recent Transactions */}
          <div className="bg-canvas border border-hairline">
            <div className="px-lg py-md border-b border-hairline">
              <div className="flex items-center justify-between">
                <h2 className="text-card-title text-ink">Riwayat Transaksi</h2>
                {txData && txData.transactions.length > 0 && (
                  <span className="text-body-sm text-ink-subtle">
                    {txData.summary.totalTransactions} total
                  </span>
                )}
              </div>
            </div>
            <div className="p-lg">
              <TransactionTable
                transactions={txData?.transactions || overview?.recentTransactions || []}
                loading={txLoading && overviewLoading}
              />
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-canvas border border-hairline">
            <div className="px-lg py-md border-b border-hairline">
              <h2 className="text-card-title text-ink">Revenue Breakdown</h2>
            </div>
            <div className="p-lg">
              <RevenueChart
                revenue={revenueData?.revenue || []}
                totalRevenue={revenueData?.totalRevenue || 0}
                loading={revenueLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
