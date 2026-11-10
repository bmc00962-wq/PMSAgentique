/*
# Tenancy, owners, properties and units foundation

## 1. Plain-English summary
This migration creates the first real data tables of the property management app:
the workspace (called "tenant" internally), who belongs to which workspace, and the
owners, properties and rental units that the screens already expect.

It also adds a single function that lets a newly signed-in user create their own
workspace. Without it, a new account would have no workspace and every screen would be empty.

## 2. New tables
- `tenants`: one row per workspace (company). Holds name, unique URL slug, plan, onboarding state.
- `tenant_memberships`: links a signed-in user to a workspace with a role (owner, admin, manager, staff).
- `owners`: property owners managed by the workspace (contact details, language, status).
- `properties`: buildings or homes belonging to an owner (type, address, status).
- `units`: rentable units inside a property (type, bedrooms, capacity, nightly rate, currency, status).

## 3. Functions
- `create_workspace(p_company_name)`: creates a workspace and makes the calling user its owner.
  It refuses if the user already belongs to an active workspace.

## 4. Security
- Row Level Security is enabled on every new table.
- Every row carries a `tenant_id`. Access is granted only when the signed-in user has an
  active membership in that same tenant.
- Users can read their own memberships only. Memberships are created only through `create_workspace`.
- Users cannot change a workspace's plan or status; only company name, contact email,
  custom domain and onboarding flag are writable by workspace members.
- No physical DELETE is granted on business tables (soft delete via `deleted_at`).
- Composite foreign keys `(owner_id, tenant_id)` and `(property_id, tenant_id)` make it impossible to
  attach a property to an owner, or a unit to a property, that belongs to a different workspace.
- `create_workspace` is revoked from `anon` and `PUBLIC`; only signed-in users can call it.

## 5. Important notes
1. All statements are idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`).
2. Money amounts use NUMERIC(12,4), as required by the finance rules.
3. `version` supports optimistic locking on edits.
4. `smart_lock_id` on units is a plain identifier for now; the smart-lock table is not created yet.
*/

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  plan_id text NOT NULL DEFAULT 'trial' CHECK (plan_id IN ('trial', 'starter', 'growth', 'enterprise')),
  onboarding_completed boolean NOT NULL DEFAULT false,
  custom_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'disabled')),
  properties_scope jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships (user_id);

CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  country text NOT NULL DEFAULT 'Canada',
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'ar')),
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_owners_tenant ON owners (tenant_id);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  property_type text NOT NULL CHECK (property_type IN ('apartment', 'villa', 'chalet', 'riad', 'studio', 'house', 'other')),
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'Canada',
  postal_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  description text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (id, tenant_id),
  FOREIGN KEY (owner_id, tenant_id) REFERENCES owners (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties (tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner_id);

CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL,
  name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('apartment', 'studio', 'chalet', 'villa', 'house', 'room', 'other')),
  floor integer,
  area_sqm numeric(8,2),
  bedrooms integer NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms numeric(4,1) NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  max_guests integer NOT NULL DEFAULT 1 CHECK (max_guests > 0),
  base_rate numeric(12,4) NOT NULL DEFAULT 0 CHECK (base_rate >= 0),
  cleaning_fee numeric(12,4) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
  currency text NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD', 'MAD', 'EUR', 'USD')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  smart_lock_id text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (id, tenant_id),
  FOREIGN KEY (property_id, tenant_id) REFERENCES properties (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_units_tenant ON units (tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_property ON units (property_id);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON tenant_memberships TO authenticated;
GRANT SELECT, UPDATE (company_name, contact_email, custom_domain, onboarding_completed, updated_at) ON tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON owners TO authenticated;
GRANT SELECT, INSERT, UPDATE ON properties TO authenticated;
GRANT SELECT, INSERT, UPDATE ON units TO authenticated;

DROP POLICY IF EXISTS "select_own_memberships" ON tenant_memberships;
CREATE POLICY "select_own_memberships" ON tenant_memberships FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "select_member_tenants" ON tenants;
CREATE POLICY "select_member_tenants" ON tenants FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenants.id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "update_member_tenants" ON tenants;
CREATE POLICY "update_member_tenants" ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenants.id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenants.id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "select_tenant_owners" ON owners;
CREATE POLICY "select_tenant_owners" ON owners FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = owners.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "insert_tenant_owners" ON owners;
CREATE POLICY "insert_tenant_owners" ON owners FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = owners.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "update_tenant_owners" ON owners;
CREATE POLICY "update_tenant_owners" ON owners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = owners.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = owners.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "select_tenant_properties" ON properties;
CREATE POLICY "select_tenant_properties" ON properties FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = properties.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "insert_tenant_properties" ON properties;
CREATE POLICY "insert_tenant_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = properties.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "update_tenant_properties" ON properties;
CREATE POLICY "update_tenant_properties" ON properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = properties.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = properties.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "select_tenant_units" ON units;
CREATE POLICY "select_tenant_units" ON units FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = units.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "insert_tenant_units" ON units;
CREATE POLICY "insert_tenant_units" ON units FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = units.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "update_tenant_units" ON units;
CREATE POLICY "update_tenant_units" ON units FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = units.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = units.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION create_workspace(p_company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := btrim(p_company_name);
  v_base text;
  v_tenant uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_name) < 2 THEN
    RAISE EXCEPTION 'Company name must be at least 2 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE user_id = v_user AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'A workspace already exists for this account';
  END IF;

  v_base := COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')), ''), 'workspace');

  INSERT INTO tenants (slug, company_name, contact_email)
  VALUES (
    v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6),
    v_name,
    (SELECT email FROM auth.users WHERE id = v_user)
  )
  RETURNING id INTO v_tenant;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_tenant, v_user, 'owner', 'active');

  RETURN v_tenant;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_workspace(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_workspace(text) TO authenticated;
