'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';

type ClaimState =
  | 'idle'
  | 'initiating'
  | 'signing_create'
  | 'submitting_create'
  | 'initiating_claim'
  | 'signing_claim'
  | 'submitting_claim'
  | 'success'
  | 'error';

interface ClaimPaymentProps {
  karyaId: string;
  judul: string;
  harga: number;
  onSuccess?: (data: { txHash: string; accessUrl: string; expiresAt: string; explorerUrl: string }) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export function ClaimPayment({
  karyaId,
  judul,
  harga,
  onSuccess,
  onError,
  onCancel,
}: ClaimPaymentProps) {
  const [state, setState] = useState<ClaimState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    txHash: string;
    accessUrl: string;
    expiresAt: string;
    explorerUrl: string;
  } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const getToken = () => localStorage.getItem('jingga_auth_token');

  const getNetworkPassphrase = () => {
    return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
      ? 'Public Global Stellar Network ; September 2015'
      : 'Test SDF Network ; September 2015';
  };

  const signTransaction = async (xdr: string): Promise<string> => {
    if (typeof window === 'undefined' || !(window as any).freighter) {
      throw new Error('Freighter wallet not found. Please install Freighter extension.');
    }
    const freighter = (window as any).freighter;
    return await freighter.signTransaction(xdr, { networkPassphrase: getNetworkPassphrase() });
  };

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Request failed');
    }
    return res.json();
  };

  const handlePurchase = async () => {
    setState('initiating');
    setError('');

    try {
      // Step 1: Initiate claimable balance creation
      const { xdr } = await apiRequest(`${API_BASE}/api/v1/payments/claimable/initiate`, {
        method: 'POST',
        body: JSON.stringify({ karya_id: karyaId }),
      });

      // Step 2: Sign with Freighter
      setState('signing_create');
      const signedXdr = await signTransaction(xdr);

      // Step 3: Submit claimable balance
      setState('submitting_create');
      const { balanceId, txHash: createTxHash, explorerUrl: createExplorerUrl } = await apiRequest(`${API_BASE}/api/v1/payments/claimable/create`, {
        method: 'POST',
        body: JSON.stringify({
          signed_xdr: signedXdr,
          karya_id: karyaId,
        }),
      });

      // Step 4: Initiate claim
      setState('initiating_claim');
      const claimData = await apiRequest(`${API_BASE}/api/v1/payments/claimable/initiate-claim`, {
        method: 'POST',
        body: JSON.stringify({ balance_id: balanceId }),
      });

      // Step 5: Sign claim with Freighter
      setState('signing_claim');
      const signedClaimXdr = await signTransaction(claimData.xdr);

      // Step 6: Submit claim
      setState('submitting_claim');
      const claimResult = await apiRequest(`${API_BASE}/api/v1/payments/claimable/claim`, {
        method: 'POST',
        body: JSON.stringify({
          balance_id: balanceId,
          signed_xdr: signedClaimXdr,
        }),
      });

      setResult(claimResult);
      setState('success');
      onSuccess?.(claimResult);
    } catch (err: any) {
      console.error('[ClaimPayment] Error:', err);
      setError(err.message || 'Payment failed');
      setState('error');
      onError?.(err.message);
    }
  };

  if (state === 'success' && result) {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-card-title text-ink">Pembayaran Berhasil!</h3>
            <p className="text-body-sm text-ink-muted">Balance telah di-claim</p>
          </div>
        </div>

        <div className="bg-surface-2 p-md mb-lg">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-ink-muted">Tx Hash</span>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs"
            >
              {result.txHash.slice(0, 12)}...
            </a>
          </div>
        </div>

        <div className="flex gap-md">
          {result.accessUrl && (
            <a
              href={result.accessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-lg py-md bg-accent text-white text-body text-center hover:bg-accent-hover transition-colors"
            >
              Download File
            </a>
          )}
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
          >
            Stellar Explorer
          </a>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-canvas border border-error p-xl">
        <div className="flex items-center gap-md mb-lg">
          <div className="w-10 h-10 rounded-full bg-error-soft flex items-center justify-center">
            <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-card-title text-ink">Pembayaran Gagal</h3>
            <p className="text-body-sm text-ink-muted">{error}</p>
          </div>
        </div>

        <div className="flex gap-md">
          <button
            onClick={handlePurchase}
            className="flex-1 px-lg py-md bg-accent text-white text-body hover:bg-accent-hover transition-colors"
          >
            Coba Lagi
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
            >
              Batal
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state !== 'idle') {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <Spinner size="md" />
          <div>
            <h3 className="text-card-title text-ink">
              {state === 'initiating' && 'Menyiapkan claimable balance...'}
              {state === 'signing_create' && 'Menunggu konfirmasi wallet...'}
              {state === 'submitting_create' && 'Mengirim transaksi ke Stellar...'}
              {state === 'initiating_claim' && 'Menyiapkan claim...'}
              {state === 'signing_claim' && 'Menunggu konfirmasi claim...'}
              {state === 'submitting_claim' && 'Memproses claim...'}
            </h3>
            <p className="text-body-sm text-ink-muted">
              {(state === 'signing_create' || state === 'signing_claim') && 'Freighter popup terbuka di browser'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div className="bg-canvas border border-hairline p-xl">
      <h3 className="text-card-title text-ink mb-sm">Pembayaran via Claimable Balance</h3>
      <p className="text-body text-ink-muted mb-lg">
        Bayar {harga} XLM untuk mengakses &ldquo;{judul}&rdquo; menggunakan escrow
      </p>

      <div className="bg-surface-2 p-md mb-lg text-body-sm text-ink-muted">
        <p>Claimable Balance adalah mekanisme escrow di Stellar. Pembayaran akan di-hold sampai claim berhasil.</p>
      </div>

      <button
        onClick={handlePurchase}
        className="w-full px-lg py-md bg-accent text-white text-body font-medium hover:bg-accent-hover transition-colors"
      >
        Buat & Claim Balance — {harga} XLM
      </button>
    </div>
  );
}
