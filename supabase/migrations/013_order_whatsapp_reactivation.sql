-- Order cancellation reason + WhatsApp reactivation flow
-- When an order is cancelled because the customer has no WhatsApp, the customer
-- can submit a new WhatsApp-capable number to request reactivation.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS new_whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_reactivation_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_reactivation_at timestamptz;

-- Speed up the admin "needs reactivation" lookup
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_reactivation
  ON orders (whatsapp_reactivation_requested)
  WHERE whatsapp_reactivation_requested = true;
