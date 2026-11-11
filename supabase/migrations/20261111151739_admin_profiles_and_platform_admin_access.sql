ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

INSERT INTO user_profiles (id, email, username)
SELECT u.id, u.email, u.raw_user_meta_data->>'username'
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, username)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'username')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION sync_user_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_user_profile ON auth.users;
CREATE TRIGGER trg_sync_user_profile
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION sync_user_profile();

GRANT SELECT, UPDATE (username, updated_at) ON user_profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_or_platform_admin_profile" ON user_profiles;
CREATE POLICY "select_own_or_platform_admin_profile" ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

GRANT SELECT ON tenants, tenant_memberships, properties, units, reservations TO authenticated;
GRANT INSERT, UPDATE ON tenant_memberships TO authenticated;
GRANT UPDATE ON tenants TO authenticated;

DROP POLICY IF EXISTS "platform_admin_select_tenants" ON tenants;
CREATE POLICY "platform_admin_select_tenants" ON tenants FOR SELECT
TO authenticated
USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_update_tenants" ON tenants;
CREATE POLICY "platform_admin_update_tenants" ON tenants FOR UPDATE
TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_select_memberships" ON tenant_memberships;
CREATE POLICY "platform_admin_select_memberships" ON tenant_memberships FOR SELECT
TO authenticated
USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_insert_memberships" ON tenant_memberships;
CREATE POLICY "platform_admin_insert_memberships" ON tenant_memberships FOR INSERT
TO authenticated
WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_update_memberships" ON tenant_memberships;
CREATE POLICY "platform_admin_update_memberships" ON tenant_memberships FOR UPDATE
TO authenticated
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_select_properties" ON properties;
CREATE POLICY "platform_admin_select_properties" ON properties FOR SELECT
TO authenticated
USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_select_units" ON units;
CREATE POLICY "platform_admin_select_units" ON units FOR SELECT
TO authenticated
USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_select_reservations" ON reservations;
CREATE POLICY "platform_admin_select_reservations" ON reservations FOR SELECT
TO authenticated
USING (is_platform_admin());
