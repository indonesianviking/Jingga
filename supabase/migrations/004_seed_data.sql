-- ============================================================
-- Jingga Seed Data (Development Only)
-- Migration 004: Seed Data
-- ============================================================
-- NOTE: These wallet addresses are for development testing only.
-- In production, users will create their own wallets.

INSERT INTO users (wallet_address, nama, role, bio) VALUES
  ('GBZCSTPYMKBQHTZ3VAFRQ5XHB4ZLQ4G5N5YHJQJPXKZ5Z5Z5Z5Z5TEST', 'Alice Writer', 'penulis', 'Independent fiction writer from Jakarta'),
  ('GDXQXKQY5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5ZZ5TEST', 'Bob Reader', 'pembaca', 'Avid reader and supporter of indie authors'),
  ('GCNFRM5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5TEST', 'Carol Editor', 'keduanya', 'Professional editor and collaborator')
ON CONFLICT (wallet_address) DO NOTHING;
