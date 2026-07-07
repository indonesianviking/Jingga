'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseFlow } from '@/components/payment/PurchaseFlow';
import { ClaimPayment } from '@/components/payment/ClaimPayment';
import { FileAccess } from '@/components/payment/FileAccess';
import { Spinner } from '@/components/ui/Spinner';

type PaymentMethod = 'direct' | 'claimable' | null;

interface BuyButtonProps {
  karyaId: string;
  judul: string;
  harga: number;
  issuerWallet: string;
  isOwner: boolean;
  onPurchaseComplete?: () => void;
}

export function BuyButton({ karyaId, judul, harga, issuerWallet, isOwner, onPurchaseComplete }: BuyButtonProps) {
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);

  useEffect(() => {
    const checkPurchase = async () => {
      try {
        const token = localStorage.getItem('jingga_token');
        const res = await fetch(`/api/v1/payments/check/${karyaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          setHasPurchased(data.purchased);
        }
      } catch (err) {
        // Silently fail - user hasn't purchased
      } finally {
        setChecking(false);
      }
    };

    checkPurchase();
  }, [karyaId]);

  if (isOwner) {
    return (
      <div className="bg-surface-1 border border-hairline p-md text-center">
        <p className="text-body-sm text-ink-muted">Ini adalah karya Anda</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center p-md">
        <Spinner size="sm" />
      </div>
    );
  }

  // Show file access if already purchased
  if (hasPurchased) {
    return <FileAccess karyaId={karyaId} />;
  }

  // Show direct payment flow
  if (selectedMethod === 'direct') {
    return (
      <PurchaseFlow
        karyaId={karyaId}
        judul={judul}
        harga={harga}
        onSuccess={(data) => {
          setHasPurchased(true);
          setSelectedMethod(null);
          onPurchaseComplete?.();
        }}
        onCancel={() => setSelectedMethod(null)}
      />
    );
  }

  // Show claimable balance payment flow
  if (selectedMethod === 'claimable') {
    return (
      <ClaimPayment
        karyaId={karyaId}
        judul={judul}
        harga={harga}
        onSuccess={(data) => {
          setHasPurchased(true);
          setSelectedMethod(null);
          onPurchaseComplete?.();
        }}
        onCancel={() => setSelectedMethod(null)}
      />
    );
  }

  // Default: show payment method selection
  return (
    <div className="space-y-md">
      <button
        onClick={() => setSelectedMethod('direct')}
        className="w-full px-lg py-md bg-accent text-white text-body font-medium hover:bg-accent-hover transition-colors"
      >
        Beli Langsung — {harga} XLM
      </button>

      <button
        onClick={() => setSelectedMethod('claimable')}
        className="w-full px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
      >
        Gunakan Claimable Balance — {harga} XLM
      </button>

      <p className="text-caption text-ink-subtle text-center">
        Pembayaran langsung lebih cepat. Claimable Balance menggunakan escrow.
      </p>
    </div>
  );
}
