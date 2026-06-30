-- 010_add_cart_items_jsonb.sql
-- Adds a JSONB column for rich cart item data (brand, car details, price, quantity)

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS cart_items JSONB DEFAULT '[]'::jsonb;
