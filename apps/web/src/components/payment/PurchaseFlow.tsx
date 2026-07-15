'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { signTransaction, waitForFreighter } from '@/lib/freighter';

type PurchaseState =
  | 'idle'
  | 'initiating'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'error'
  | 'verifying';

interface PurchaseFlowProps {
  karyaId: string;
  judul: string;
  harga: number;
  onSuccess?: (data: { txHash: string; accessUrl: string; expiresAt: string; explorerUrl: string }) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export function PurchaseFlow({
  karyaId,
  judul,
  harga,
  onSuccess,
  onError,
  onCancel,
}: PurchaseFlowProps) {
  const [state, setState] = useState<PurchaseState>('idle');
  const [error, setError] = useState('');
  const [verifyTxHash, setVerifyTxHash] = useState('');
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<{
    txHash: string;
    accessUrl: string;
    expiresAt: string;
    explorerUrl: string;
  } | null>(null);

  /* Fade-in animation on mount */
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const getToken = () => localStorage.getItem('jingga_auth_token');

  const handlePurchase = async () => {
    setState('initiating');
    setError('');

    try {
      /* 1. Initiate payment - get XDR */
      const token = getToken();
      const initiateRes = await fetch(`${API_BASE}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ karya_id: karyaId }),
      });

      if (!initiateRes.ok) {
        const initData = await initiateRes.json();
        throw new Error(initData.error || 'Failed to initiate payment');
      }

      const initData = await initiateRes.json();
      const { xdr, signed_xdr, custodial } = initData;

      /* 2. Sign transaction */
      let signedXdr: string;

      if (custodial && signed_xdr) {
        /* Custodial flow: backend already signed (email/managed wallet users) */
        signedXdr = signed_xdr;
      } else {
        /* Freighter flow: user signs with their wallet extension */
        setState('signing');

        /* Wait for Freighter extension to inject API (up to 5s) */
        const available = await waitForFreighter(5000);
        if (!available) {
          throw new Error('Freighter wallet not detected. Please make sure the Freighter extension is installed and unlocked.');
        }

        const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015';

        signedXdr = await signTransaction(xdr, networkPassphrase);
      }

      /* 3. Confirm payment */
      setState('confirming');

      const confirmRes = await fetch(`${API_BASE}/api/v1/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          signed_xdr: signedXdr,
          karya_id: karyaId,
        }),
      });

      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json();
        throw new Error(confirmData.error || 'Failed to confirm payment');
      }

      const confirmData = await confirmRes.json();
      setResult(confirmData);
      setState('success');
      onSuccess?.(confirmData);
    } catch (err: any) {
      console.error('[PurchaseFlow] Error:', err);
      setError(err.message || 'Payment failed');
      setState('error');
      onError?.(err.message);
    }
  };

  /* Handle retroactive verification - if Stellar tx went through but DB failed */
  const handleVerify = async () => {
    if (!verifyTxHash.trim()) {
      setError('Please enter the transaction hash from your Freighter wallet');
      return;
    }

    setState('verifying');
    setError('');

    try {
      const token = getToken();
      const verifyRes = await fetch(`${API_BASE}/api/v1/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tx_hash: verifyTxHash.trim(),
          karya_id: karyaId,
        }),
      });

      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json();
        throw new Error(verifyData.error || 'Transaction verification failed');
      }

      const verifyData = await verifyRes.json();
      setResult(verifyData);
      setState('success');
      onSuccess?.(verifyData);
    } catch (err: any) {
      console.error('[PurchaseFlow] Verify error:', err);
      setError(err.message || 'Verification failed');
      setState('error');
    }
  };

  if (state === 'success' && result) {
    return (
      <div
        className={`bg-canvas border border-primary p-xl transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {/* Success checkmark */}
        <div className="flex flex-col items-center mb-lg">
          <div
            className={`w-16 h-16 bg-semantic-success/10 flex items-center justify-center mb-md transition-all duration-500 ${
              visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          >
            <svg
              className="w-8 h-8 text-semantic-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-headline text-ink text-center">Payment Successful!</h3>
          <p className="text-body text-ink-muted text-center">
            You now have access to &ldquo;{judul}&rdquo;
          </p>
        </div>

        <div className="bg-surface-1 p-md mb-lg">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-ink-muted">Transaction</span>
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
          {result.accessUrl ? (
            <a
              href={result.accessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-lg py-md bg-primary text-on-primary text-body text-center font-medium hover:bg-primary-hover transition-colors"
            >
              Download File
            </a>
          ) : (
            <div className="flex-1 px-lg py-md bg-surface-2 text-ink-muted text-body text-center">
              File not available for download
            </div>
          )}
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
          >
            View on Explorer
          </a>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-canvas border border-semantic-error p-xl">
        <div className="flex items-center gap-md mb-lg">
          <div className="w-10 h-10 bg-semantic-error/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-semantic-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-card-title text-ink">Payment Failed</h3>
            <p className="text-body-sm text-ink-muted">{error}</p>
          </div>
        </div>

        <div className="flex gap-md">
          <button
            onClick={handlePurchase}
            className="flex-1 px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
          >
            Try Again
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Retroactive verification - for when Stellar tx succeeded but confirm failed */}
        <details className="mt-lg border-t border-hairline pt-lg">
          <summary className="text-body-sm text-primary cursor-pointer hover:underline">
            Payment went through in Freighter but app shows error?
          </summary>
          <div className="mt-md space-y-md">
            <p className="text-body-sm text-ink-muted">
              Open your Freighter wallet, find the transaction in History, and paste the
              Transaction Hash below to verify and grant access retroactively.
            </p>
            <Input
              placeholder="Paste transaction hash (e.g., a1b2c3d4...)"
              value={verifyTxHash}
              onChange={(e) => setVerifyTxHash(e.target.value)}
            />
            <button
              onClick={handleVerify}
              className="w-full px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
            >
              Verify Transaction
            </button>
          </div>
        </details>
      </div>
    );
  }

  if (state === 'verifying') {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <Spinner size="md" />
          <div>
            <h3 className="text-card-title text-ink">Verifying transaction on Stellar...</h3>
            <p className="text-body-sm text-ink-muted">Checking transaction hash on the network</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'initiating' || state === 'signing' || state === 'confirming') {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <Spinner size="md" />
          <div>
            <h3 className="text-card-title text-ink">
              {state === 'initiating' && 'Preparing payment...'}
              {state === 'signing' && 'Waiting for wallet confirmation...'}
              {state === 'confirming' && 'Processing payment...'}
            </h3>
            <p className="text-body-sm text-ink-muted">
              {state === 'signing' && 'Freighter popup opened in browser'}
              {state === 'confirming' && 'Transaction submitted to Stellar'}
            </p>
          </div>
        </div>

        {state === 'signing' && (
          <p className="text-body-sm text-ink-muted mb-lg">
            If it doesn't appear, click the Freighter extension in your browser.
          </p>
        )}
      </div>
    );
  }

  /* Idle state */
  return (
    <div className="bg-canvas border border-hairline p-xl">
      <h3 className="text-card-title text-ink mb-sm">Purchase Access</h3>
      <p className="text-body text-ink-muted mb-lg">
        Pay {harga} XLM to access &ldquo;{judul}&rdquo;
      </p>

      <button
        onClick={handlePurchase}
        className="w-full px-lg py-md bg-primary text-on-primary text-body font-medium hover:bg-primary-hover transition-colors"
      >
        Buy Access: {harga} XLM
      </button>
    </div>
  );
}
