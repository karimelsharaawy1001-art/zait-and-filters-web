-- Ensure returning visitors update their existing cart instead of creating duplicates
-- A persistent session_id in localStorage ties the visitor to their cart

-- Remove duplicate session_ids keeping only the latest entry per session
DELETE FROM abandoned_carts a
USING (
  SELECT session_id, MAX(created_at) as max_created
  FROM abandoned_carts
  GROUP BY session_id
  HAVING COUNT(*) > 1
) b
WHERE a.session_id = b.session_id
  AND a.created_at < b.max_created;

-- Add unique constraint on session_id
ALTER TABLE abandoned_carts
  ADD CONSTRAINT abandoned_carts_session_id_key UNIQUE (session_id);
