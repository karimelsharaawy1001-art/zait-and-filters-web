CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT DEFAULT '',
  entity_name TEXT DEFAULT '',
  entity_slug TEXT DEFAULT '',
  page_title TEXT DEFAULT '',
  current_page TEXT NOT NULL DEFAULT '',
  brand TEXT DEFAULT '',
  car_make TEXT DEFAULT '',
  car_model TEXT DEFAULT '',
  car_year TEXT DEFAULT '',
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_page_type ON page_views(page_type);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_entity_id ON page_views(entity_id);
CREATE INDEX IF NOT EXISTS idx_page_views_brand ON page_views(brand);
CREATE INDEX IF NOT EXISTS idx_page_views_car_make ON page_views(car_make);
CREATE INDEX IF NOT EXISTS idx_page_views_car_model ON page_views(car_model);
CREATE INDEX IF NOT EXISTS idx_page_views_car_year ON page_views(car_year);
CREATE INDEX IF NOT EXISTS idx_page_views_category ON page_views(category);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read page_views"
  ON page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Aggregation functions for analytics
CREATE OR REPLACE FUNCTION get_most_viewed_products(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(entity_name TEXT, entity_slug TEXT, view_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT pv.entity_name, pv.entity_slug, COUNT(*)::BIGINT AS view_count
  FROM page_views pv
  WHERE pv.page_type = 'product'
    AND pv.entity_name != ''
    AND pv.created_at >= since_date
  GROUP BY pv.entity_name, pv.entity_slug
  ORDER BY view_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION get_most_viewed_categories(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(category_name TEXT, view_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT pv.category, COUNT(*)::BIGINT AS view_count
  FROM page_views pv
  WHERE pv.category != ''
    AND pv.created_at >= since_date
  GROUP BY pv.category
  ORDER BY view_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION get_most_viewed_brands(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(brand_name TEXT, view_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT pv.brand, COUNT(*)::BIGINT AS view_count
  FROM page_views pv
  WHERE pv.brand != ''
    AND pv.created_at >= since_date
  GROUP BY pv.brand
  ORDER BY view_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION get_most_viewed_car_makes(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(car_make_name TEXT, view_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT pv.car_make, COUNT(*)::BIGINT AS view_count
  FROM page_views pv
  WHERE pv.car_make != ''
    AND pv.car_make != 'UNIVERSAL'
    AND pv.created_at >= since_date
  GROUP BY pv.car_make
  ORDER BY view_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION get_most_viewed_car_models(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(car_model_name TEXT, view_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT pv.car_model, COUNT(*)::BIGINT AS view_count
  FROM page_views pv
  WHERE pv.car_model != ''
    AND pv.car_model != 'UNIVERSAL'
    AND pv.created_at >= since_date
  GROUP BY pv.car_model
  ORDER BY view_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION get_most_viewed_car_years(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(car_year_name TEXT, view_count BIGINT)
LANGUAGE SQL STABLE
AS $$
  SELECT pv.car_year, COUNT(*)::BIGINT AS view_count
  FROM page_views pv
  WHERE pv.car_year != ''
    AND pv.created_at >= since_date
  GROUP BY pv.car_year
  ORDER BY view_count DESC
  LIMIT 50;
$$;
