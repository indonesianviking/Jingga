-- ============================================================
-- Jingga Custodial Wallets
-- Migration 005: Custodial Wallet Support
-- ============================================================

-- Add auth_type and password_hash columns to users
ALTER TABLE users ADD COLUMN auth_type TEXT NOT NULL DEFAULT 'wallet' CHECK (auth_type IN ('wallet', 'email'));
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Create custodial_wallets table
CREATE TABLE custodial_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT UNIQUE NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  is_funded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_custodial_wallets_user_id ON custodial_wallets(user_id);
CREATE INDEX idx_custodial_wallets_public_key ON custodial_wallets(public_key);

-- Enable RLS
ALTER TABLE custodial_wallets ENABLE ROW LEVEL SECURITY;

-- Only service role can access custodial wallets (private keys!)
-- Users should never directly query this table
CREATE POLICY "Service role only"
  ON custodial_wallets FOR ALL
  USING (false);
