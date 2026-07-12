-- ============================================================
-- Jingga Badge Trigger Fix
-- Migration 008: Fix type mismatch in check_purchase_badges()
-- ============================================================
-- BUG: The original trigger selected NEW.buyer_wallet (TEXT)
-- for user_badges.user_id (UUID). Should select u.id instead.
-- This caused ALL transaction inserts to fail with:
--   column "user_id" is of type uuid but expression is of type text

CREATE OR REPLACE FUNCTION check_purchase_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- First Purchase badge
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'first_purchase', jsonb_build_object('karya_id', NEW.karya_id, 'tx_hash', NEW.stellar_tx_hash)
  FROM users u WHERE u.wallet_address = NEW.buyer_wallet
    AND NOT EXISTS (
      SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'first_purchase'
    );

  -- Bibliophile badge (10 purchases)
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'bibliophile', jsonb_build_object('count', cnt)
  FROM (
    SELECT buyer_wallet, COUNT(*) as cnt
    FROM transactions
    WHERE buyer_wallet = NEW.buyer_wallet AND status = 'confirmed'
    GROUP BY buyer_wallet
  ) t JOIN users u ON u.wallet_address = t.buyer_wallet
  WHERE t.cnt >= 10
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'bibliophile');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (no change needed, just ensure it's using the fixed function)
DROP TRIGGER IF EXISTS trigger_purchase_badges ON transactions;
CREATE TRIGGER trigger_purchase_badges
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION check_purchase_badges();
