-- Returns the count of distinct abandoned carts (deduplicated by phone/email)
CREATE OR REPLACE FUNCTION count_distinct_abandoned_carts()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT COALESCE(NULLIF(customer_phone, ''), NULLIF(customer_email, ''), id::text))
  FROM abandoned_carts;
$$;
