-- supabase/migrations/016_revert_paymob_to_easykash.sql
--
-- Reverse the Paymob migration: rename columns back to easykash_* names.
-- Only runs if paymob columns exist.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_ref') THEN
    ALTER TABLE orders RENAME COLUMN paymob_ref TO easykash_ref;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_order_id') THEN
    ALTER TABLE orders RENAME COLUMN paymob_order_id TO easykash_customer_ref;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_transaction_id') THEN
    ALTER TABLE orders RENAME COLUMN paymob_transaction_id TO easykash_transaction_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_payment_method') THEN
    ALTER TABLE orders RENAME COLUMN paymob_payment_method TO easykash_payment_method;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_amount') THEN
    ALTER TABLE orders RENAME COLUMN paymob_amount TO easykash_amount;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymob_status_raw') THEN
    ALTER TABLE orders RENAME COLUMN paymob_status_raw TO easykash_status_raw;
  END IF;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS idx_orders_paymob_order_id;
DROP INDEX IF EXISTS idx_orders_paymob_ref;
