'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RecentPurchase } from '@/hooks/useReader';
import { getAccessUrl } from '@/hooks/useReader';

interface PurchasedKaryaCardProps {
  purchase: RecentPurchase;
}

export default function PurchasedKaryaCard({ purchase }: PurchasedKaryaCardProps) {
  const [accessing, setAccessing] = useState(false);
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetAccess = async () => {
    try {
      setAccessing(true);
      setError(null);
      const result = await getAccessUrl(purchase.karya_id);
      setAccessUrl(result.accessUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to get access');
    } finally {
      setAccessing(false);
    }
  };

  return (
    <div className="bg-canvas border border-hairline overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover */}
      <div className="aspect-[3/4] relative">
        {purchase.cover_image_url ? (
          <img
            src={purchase.cover_image_url}
            alt={purchase.judul}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-2 flex items-center justify-center">
            <span className="text-display-lg text-ink-subtle">{purchase.judul.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-md">
        <div className="flex items-start justify-between gap-sm mb-xs">
          <Link
            href={`/karya/${purchase.karya_id}`}
            className="text-body font-medium text-ink hover:text-primary transition-colors line-clamp-2"
          >
            {purchase.judul}
          </Link>
          <span className="inline-flex items-center px-xs py-xxs text-caption bg-surface-1 text-ink-muted border border-hairline flex-shrink-0">
            {purchase.kategori}
          </span>
        </div>

        <p className="text-body-sm text-ink-muted mb-sm">{purchase.issuer_name}</p>

        <p className="text-caption text-ink-subtle mb-md">
          Purchased: {new Date(purchase.purchased_at).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        {error && (
          <p className="text-caption text-semantic-error mb-sm">{error}</p>
        )}

        {accessUrl ? (
          <a
            href={accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-md py-sm bg-primary text-on-primary text-body-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Open File
          </a>
        ) : (
          <button
            onClick={handleGetAccess}
            disabled={accessing}
            className="w-full px-md py-sm bg-primary text-on-primary text-body-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accessing ? 'Loading...' : 'Access File'}
          </button>
        )}
      </div>
    </div>
  );
}
