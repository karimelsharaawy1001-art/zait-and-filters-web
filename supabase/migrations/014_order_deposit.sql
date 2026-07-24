-- Cash-on-delivery deposit: orders above 5,000 EGP pay the excess as a deposit
-- (InstaPay/Wallet) now, and the remaining 5,000 on delivery → "partially paid".

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_method text,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric;
