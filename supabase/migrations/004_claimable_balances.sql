-- Claimable Balances table for escrow-style payments
CREATE TABLE IF NOT EXISTS claimable_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id UUID NOT NULL REFERENCES karya(id),
  balance_id TEXT UNIQUE NOT NULL,
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  amount NUMERIC(12, 6) NOT NULL,
  stellar_tx_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'claimed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claimable_balances_karya_id ON claimable_balances(karya_id);
CREATE INDEX IF NOT EXISTS idx_claimable_balances_buyer_wallet ON claimable_balances(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_claimable_balances_balance_id ON claimable_balances(balance_id);

-- Enable RLS
ALTER TABLE claimable_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own claimable balances" ON claimable_balances
  FOR SELECT USING (
    buyer_wallet = auth.jwt() ->> 'wallet_address' OR
    seller_wallet = auth.jwt() ->> 'wallet_address'
  );

CREATE POLICY "Users can insert claimable balances" ON claimable_balances
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own claimable balances" ON claimable_balances
  FOR UPDATE USING (
    buyer_wallet = auth.jwt() ->> 'wallet_address'
  );
