-- supabase/migrations/015_rename_easykash_to_paymob.sql
--
-- Rename EasyKash columns → Paymob equivalents (if they exist).
-- Create missing columns with Paymob names.

-- ── Rename columns only if they exist ───────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='easykash_ref') THEN
    ALTER TABLE orders RENAME COLUMN easykash_ref TO paymob_ref;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='easykash_customer_ref') THEN
    ALTER TABLE orders RENAME COLUMN easykash_customer_ref TO paymob_order_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='easykash_transaction_id') THEN
    ALTER TABLE orders RENAME COLUMN easykash_transaction_id TO paymob_transaction_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='easykash_payment_method') THEN
    ALTER TABLE orders RENAME COLUMN easykash_payment_method TO paymob_payment_method;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='easykash_amount') THEN
    ALTER TABLE orders RENAME COLUMN easykash_amount TO paymob_amount;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='easykash_status_raw') THEN
    ALTER TABLE orders RENAME COLUMN easykash_status_raw TO paymob_status_raw;
  END IF;
END $$;

-- ── Create columns that might not exist yet ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_ref') THEN
    ALTER TABLE orders ADD COLUMN paymob_ref TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_order_id') THEN
    ALTER TABLE orders ADD COLUMN paymob_order_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_transaction_id') THEN
    ALTER TABLE orders ADD COLUMN paymob_transaction_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_payment_method') THEN
    ALTER TABLE orders ADD COLUMN paymob_payment_method TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_amount') THEN
    ALTER TABLE orders ADD COLUMN paymob_amount NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_status_raw') THEN
    ALTER TABLE orders ADD COLUMN paymob_status_raw TEXT;
  END IF;
END $$;

-- ── Add indexes for webhook lookups ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_paymob_order_id ON orders (paymob_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_paymob_ref      ON orders (paymob_ref);
