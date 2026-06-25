-- Add pin and once-per-customer columns to coupons table
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS once_per_customer BOOLEAN DEFAULT false;

-- Index for querying pinned coupons + sorting
CREATE INDEX IF NOT EXISTS idx_coupons_pinned_active
  ON public.coupons (is_pinned DESC, created_at DESC);
