import crypto from 'crypto';

interface NonceEntry {
  publicKey: string;
  challenge: string;
  expiresAt: number;
}

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const store = new Map<string, NonceEntry>();

// Cleanup expired nonces every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}, 60_000);

export function createNonce(publicKey: string): { nonce: string; challenge: string } {
  const nonce = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const challenge = `Jingga Authentication\nNonce: ${nonce}\nTimestamp: ${timestamp}\nWallet: ${publicKey}`;

  store.set(nonce, {
    publicKey,
    challenge,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });

  return { nonce, challenge };
}

export function consumeNonce(nonce: string): NonceEntry | null {
  const entry = store.get(nonce);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(nonce);
    return null;
  }
  store.delete(nonce); // one-time use
  return entry;
}
