'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-1 px-lg">
      <div className="text-center">
        <p className="text-body text-ink-muted">Redirecting to login...</p>
      </div>
    </main>
  );
}
