import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Simple JWT implementation without external dependency
const JWT_SECRET = process.env.JWT_SECRET || 'jingga-dev-secret-change-in-production';
const JWT_EXPIRY_DAYS = 7;

export interface JWTPayload {
  sub: string;
  wallet_address: string;
  iat: number;
  exp: number;
  iss: string;
}

// Base64url encode
function base64url(data: Buffer | string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64url decode
function base64urlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64');
}

// Sign JWT
export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY_DAYS * 24 * 60 * 60,
    iss: 'jingga-api',
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

// Verify JWT
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const actualSig = base64urlDecode(signatureB64);

    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const payload: JWTPayload = JSON.parse(base64urlDecode(payloadB64).toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// Express middleware: attach user to request
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

// Optional auth: attach user if token present, but don't require it
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    if (payload) req.user = payload;
  }
  next();
}
