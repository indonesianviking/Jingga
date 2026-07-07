-- ============================================================
-- Jingga Database Functions
-- Migration 002: Functions & Triggers
-- ============================================================

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_karya_updated_at
  BEFORE UPDATE ON karya
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INCREMENT KARYA SALES
-- ============================================================
CREATE OR REPLACE FUNCTION increment_karya_sales(
  p_karya_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE karya
  SET total_sales = total_sales + 1,
      total_revenue = total_revenue + p_amount
  WHERE id = p_karya_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CHECK COLLABORATORS PERCENTAGE
-- ============================================================
CREATE OR REPLACE FUNCTION check_collaborators_percentage()
RETURNS TRIGGER AS $$
DECLARE
  total_pct NUMERIC;
BEGIN
  SELECT COALESCE(SUM(persentase), 0) INTO total_pct
  FROM collaborators
  WHERE karya_id = NEW.karya_id;

  IF total_pct > 100 THEN
    RAISE EXCEPTION 'Total collaborator percentage cannot exceed 100%%';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_collaborators_pct
  BEFORE INSERT OR UPDATE ON collaborators
  FOR EACH ROW EXECUTE FUNCTION check_collaborators_percentage();
