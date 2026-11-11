CREATE TABLE IF NOT EXISTS platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON platform_admins TO authenticated;

DROP POLICY IF EXISTS "select_own_platform_admin" ON platform_admins;
CREATE POLICY "select_own_platform_admin" ON platform_admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
