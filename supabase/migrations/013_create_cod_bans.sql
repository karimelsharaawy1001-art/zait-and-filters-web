-- Create cod_bans table to track customers banned from Cash on Delivery
CREATE TABLE IF NOT EXISTS public.cod_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cod_bans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for checkout page to check ban status)
CREATE POLICY "Allow public read for cod_bans"
  ON public.cod_bans
  FOR SELECT
  USING (true);

-- Allow admins to do everything
CREATE POLICY "Admins can manage cod_bans"
  ON public.cod_bans
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for fast lookups by phone and user_id
CREATE INDEX IF NOT EXISTS idx_cod_bans_phone ON public.cod_bans(customer_phone);
CREATE INDEX IF NOT EXISTS idx_cod_bans_user_id ON public.cod_bans(user_id);
