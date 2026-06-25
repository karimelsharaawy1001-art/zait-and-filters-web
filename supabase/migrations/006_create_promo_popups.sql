-- Create promo_popups table for storefront promotional popup
CREATE TABLE IF NOT EXISTS public.promo_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desktop_image_url TEXT NOT NULL DEFAULT '',
  mobile_image_url TEXT NOT NULL DEFAULT '',
  promo_code TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_popups ENABLE ROW LEVEL SECURITY;

-- Allow public read for active popup
CREATE POLICY "Anyone can read active popup"
  ON public.promo_popups
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated admin to do everything
CREATE POLICY "Admins can manage promo popups"
  ON public.promo_popups
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
