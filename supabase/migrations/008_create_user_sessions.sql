-- 008_create_user_sessions.sql
-- Tracks real-time user browsing sessions for the admin live tracking panel
-- Writes go through the API route (service role key, bypasses RLS).
-- Reads are done client-side by admin users via Supabase client (RLS gated).

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_page TEXT NOT NULL DEFAULT '',
  previous_page TEXT DEFAULT '',
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  device_type TEXT DEFAULT 'desktop',
  ip_address TEXT DEFAULT '',
  cart_items_count INTEGER DEFAULT 0,
  cart_total NUMERIC DEFAULT 0,
  cart_item_names TEXT[] DEFAULT '{}',
  user_name TEXT DEFAULT '',
  user_email TEXT DEFAULT '',
  user_phone TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_online ON user_sessions(is_online);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- RLS: only admins can view; writes are done server-side via API route (service role)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_user_sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
