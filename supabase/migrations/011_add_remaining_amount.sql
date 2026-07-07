-- Remaining/outstanding amount an admin can record per order (partial payments)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;
