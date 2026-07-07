-- ============================================================
-- Jingga Row Level Security (RLS) Policies
-- Migration 003: RLS
-- ============================================================

-- ============================================================
-- USERS RLS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (public profiles)
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (wallet_address = current_setting('request.jwt.claims.wallet_address', true));

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (wallet_address = current_setting('request.jwt.claims.wallet_address', true));

-- ============================================================
-- KARYA RLS
-- ============================================================
ALTER TABLE karya ENABLE ROW LEVEL SECURITY;

-- Published karya are public
CREATE POLICY "Published karya are viewable by everyone"
  ON karya FOR SELECT
  USING (status = 'published');

-- Draft karya only visible to owner
CREATE POLICY "Authors can view own draft karya"
  ON karya FOR SELECT
  USING (issuer_wallet = current_setting('request.jwt.claims.wallet_address', true));

-- Authors can create karya
CREATE POLICY "Authors can create karya"
  ON karya FOR INSERT
  WITH CHECK (issuer_wallet = current_setting('request.jwt.claims.wallet_address', true));

-- Authors can update own karya
CREATE POLICY "Authors can update own karya"
  ON karya FOR UPDATE
  USING (issuer_wallet = current_setting('request.jwt.claims.wallet_address', true));

-- Authors can delete own karya
CREATE POLICY "Authors can delete own karya"
  ON karya FOR DELETE
  USING (issuer_wallet = current_setting('request.jwt.claims.wallet_address', true));

-- ============================================================
-- TRANSACTIONS RLS
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions they're involved in
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (
    buyer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    OR seller_wallet = current_setting('request.jwt.claims.wallet_address', true)
  );

-- ============================================================
-- COLLABORATORS RLS
-- ============================================================
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborators are viewable by karya owner and the collaborators themselves
CREATE POLICY "Collaborators viewable by karya owner"
  ON collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM karya
      WHERE karya.id = collaborators.karya_id
      AND karya.issuer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    )
    OR wallet_address = current_setting('request.jwt.claims.wallet_address', true)
  );

-- Authors can manage collaborators for their karya
CREATE POLICY "Authors can manage collaborators"
  ON collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM karya
      WHERE karya.id = collaborators.karya_id
      AND karya.issuer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    )
  );

-- ============================================================
-- KARYA_VIEWS RLS
-- ============================================================
ALTER TABLE karya_views ENABLE ROW LEVEL SECURITY;

-- Views are insertable by anyone (analytics)
CREATE POLICY "Anyone can insert views"
  ON karya_views FOR INSERT
  WITH CHECK (true);

-- Karya owners can view analytics for their karya
CREATE POLICY "Authors can view own karya analytics"
  ON karya_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM karya
      WHERE karya.id = karya_views.karya_id
      AND karya.issuer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    )
  );
