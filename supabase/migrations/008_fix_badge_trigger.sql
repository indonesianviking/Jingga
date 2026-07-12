-- ============================================================
-- Jingga Badge Trigger Fixes
-- Migration 008: Fix type mismatches in all badge trigger functions
-- ============================================================
-- BUG 1: check_purchase_badges() selected NEW.buyer_wallet (TEXT)
--   for user_badges.user_id (UUID). Should select u.id instead.
--   This caused ALL transaction inserts to fail with:
--   "column user_id is of type uuid but expression is of type text"
--
-- BUG 2: check_sales_badges() referenced NEW.karya_id but the
--   column on the karya table is named "id", not "karya_id".
--   This caused increment_karya_sales RPC to fail, meaning
--   total_sales / total_revenue were never updated on the karya table.

-- ============================================================
-- FIX 1: check_purchase_badges (transactions trigger)
-- ============================================================
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

DROP TRIGGER IF EXISTS trigger_purchase_badges ON transactions;
CREATE TRIGGER trigger_purchase_badges
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION check_purchase_badges();

-- ============================================================
-- FIX 2: check_sales_badges (karya update trigger)
-- BUG: NEW.karya_id should be NEW.id
-- ============================================================
CREATE OR REPLACE FUNCTION check_sales_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Bestseller & Top Seller
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'bestseller', jsonb_build_object('karya_id', NEW.id, 'sales', NEW.total_sales)
  FROM users u
  WHERE u.wallet_address = NEW.issuer_wallet AND NEW.total_sales >= 10
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'bestseller');

  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'top_seller', jsonb_build_object('karya_id', NEW.id, 'sales', NEW.total_sales)
  FROM users u
  WHERE u.wallet_address = NEW.issuer_wallet AND NEW.total_sales >= 50
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'top_seller');

  -- Revenue badges
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'earned_100', jsonb_build_object('total', NEW.total_revenue)
  FROM users u
  WHERE u.wallet_address = NEW.issuer_wallet AND NEW.total_revenue >= 100
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'earned_100');

  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'earned_1000', jsonb_build_object('total', NEW.total_revenue)
  FROM users u
  WHERE u.wallet_address = NEW.issuer_wallet AND NEW.total_revenue >= 1000
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'earned_1000');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sales_badges ON karya;
CREATE TRIGGER trigger_sales_badges
  AFTER UPDATE ON karya
  FOR EACH ROW
  WHEN (NEW.total_sales > OLD.total_sales OR NEW.total_revenue > OLD.total_revenue)
  EXECUTE FUNCTION check_sales_badges();
