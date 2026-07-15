'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

const FREIGHTER_LOGO = 'https://external-preview.redd.it/AiNxDMcGTq7dHjNRCHNAyEc_3tj3qRJgFxpDTw3l30c.jpg?auto=webp&s=29c13654a6925c7d979c1c39b20264e6883bd50c';

export default function LoginPage() {
  const { isConnected, isConnecting, isFreighterAvailable, connectFreighter, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  if (isConnected) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-1 px-lg">
      <div className="w-full max-w-sm">
        <div className="bg-canvas border border-hairline p-xl">
          {/* Logo */}
          <div className="text-center mb-lg">
            <h1 className="text-headline text-ink mb-xs">Jingga</h1>
            <p className="text-body-sm text-ink-muted">Connect your Stellar wallet to get started</p>
          </div>

          <div className="space-y-md">
            {isFreighterAvailable ? (
              <button
                onClick={connectFreighter}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-md bg-primary text-on-primary text-button font-medium py-md px-lg hover:bg-primary-hover transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <img
                  src={FREIGHTER_LOGO}
                  alt="Freighter"
                  className="w-6 h-6 object-contain rounded-full bg-white"
                />
                {isConnecting ? 'Connecting...' : 'Connect Freighter Wallet'}
              </button>
            ) : (
              <div className="space-y-md">
                <div className="bg-surface-1 border border-hairline p-lg text-center">
                  <p className="text-body-sm text-ink-muted mb-md">
                    Freighter wallet extension is required to use Jingga.
                  </p>
                  <a
                    href="https://www.freighter.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-md bg-primary text-on-primary text-button font-medium py-sm px-lg hover:bg-primary-hover transition-all"
                  >
                    <img
                      src={FREIGHTER_LOGO}
                      alt="Freighter"
                      className="w-5 h-5 object-contain rounded-full bg-white"
                    />
                    Install Freighter
                  </a>
                </div>
                <button
                  onClick={connectFreighter}
                  className="w-full border border-hairline text-ink text-button py-sm px-md hover:bg-surface-1 transition-colors"
                >
                  I already have Freighter
                </button>
              </div>
            )}

            {error && (
              <p className="text-body-sm text-semantic-error text-center">{error}</p>
            )}
          </div>

          <div className="mt-lg pt-lg border-t border-hairline text-center">
            <p className="text-caption text-ink-subtle">
              By connecting, you agree to the Jingga terms of service.
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-md">
          <a href="/" className="text-body-sm text-ink-muted hover:text-primary transition-colors">
            &larr; Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
