-- ============================================================
-- Jingga Database Schema
-- Migration 001: Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'keduanya' CHECK (role IN ('penulis', 'pembaca', 'keduanya')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- ============================================================
-- KARYA TABLE
-- ============================================================
CREATE TABLE karya (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('fiksi', 'paper', 'puisi', 'non-fiksi')),
  harga NUMERIC(12, 6) NOT NULL CHECK (harga >= 0),
  file_hash TEXT NOT NULL,
  ipfs_link TEXT NOT NULL,
  stellar_asset_code TEXT UNIQUE NOT NULL,
  issuer_wallet TEXT NOT NULL,
  cover_image_url TEXT,
  file_size_bytes BIGINT,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(16, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  stellar_tx_hash TEXT
);

CREATE INDEX idx_karya_issuer_wallet ON karya(issuer_wallet);
CREATE INDEX idx_karya_kategori ON karya(kategori);
CREATE INDEX idx_karya_status ON karya(status);
CREATE INDEX idx_karya_stellar_asset_code ON karya(stellar_asset_code);
CREATE INDEX idx_karya_created_at ON karya(created_at DESC);
CREATE INDEX idx_karya_fulltext ON karya
  USING GIN (to_tsvector('simple', judul || ' ' || deskripsi));

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id UUID NOT NULL REFERENCES karya(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  jumlah NUMERIC(12, 6) NOT NULL CHECK (jumlah > 0),
  stellar_tx_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'direct' CHECK (payment_method IN ('direct', 'claimable_balance', 'path_payment')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_karya_id ON transactions(karya_id);
CREATE INDEX idx_transactions_buyer_wallet ON transactions(buyer_wallet);
CREATE INDEX idx_transactions_seller_wallet ON transactions(seller_wallet);
CREATE INDEX idx_transactions_stellar_tx_hash ON transactions(stellar_tx_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================================
-- COLLABORATORS TABLE
-- ============================================================
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id UUID NOT NULL REFERENCES karya(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nama TEXT,
  persentase NUMERIC(5, 2) NOT NULL CHECK (persentase > 0 AND persentase <= 100),
  role TEXT NOT NULL DEFAULT 'kolaborator' CHECK (role IN ('penulis', 'editor', 'ilustrator', 'kolaborator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(karya_id, wallet_address)
);

CREATE INDEX idx_collaborators_karya_id ON collaborators(karya_id);
CREATE INDEX idx_collaborators_wallet_address ON collaborators(wallet_address);

-- ============================================================
-- KARYA_VIEWS TABLE (Analytics)
-- ============================================================
CREATE TABLE karya_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id UUID NOT NULL REFERENCES karya(id) ON DELETE CASCADE,
  viewer_wallet TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_karya_views_karya_id ON karya_views(karya_id);
CREATE INDEX idx_karya_views_created_at ON karya_views(created_at DESC);
