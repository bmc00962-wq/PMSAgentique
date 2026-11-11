/*
# Reservations, guests, calendar blocks, ledger and staff roles

## 1. Plain-English summary
This migration adds the data needed to take bookings: guests, reservations for each rental unit,
owner or maintenance blocks on the calendar, and an append-only ledger that records money movements.
It also widens staff roles so housekeepers, drivers, technicians and inspectors can sign in.
Only owners, admins and managers can see reservations, guests and the ledger.

## 2. New tables
- `guests`: people who book (name, contact details, language, notes).
- `reservations`: one booking for one unit over a date range. Stores a snapshot of the guest name,
  the price breakdown, currency, channel and status. Overlapping active bookings on the same unit are impossible.
- `calendar_blocks`: date ranges when a unit cannot be booked (owner stay, maintenance, renovation).
- `ledger_entries`: append-only money records linked to a reservation. Rows can be added and read, never edited or deleted.

## 3. Changed tables
- `properties`: new `timezone` column (default Africa/Casablanca). Dates shown to users are in this zone.
- `units`: default currency changed from CAD to EUR. Existing rows keep their current currency.
- `tenant_memberships`: role list extended with `housekeeper`, `driver`, `technician`, `inspector`.

## 4. Functions and triggers
- `has_tenant_role(tenant, roles)`: true when the signed-in user is an active member of the tenant with one of the given roles.
- `reject_overlapping_block()` and `reject_block_over_reservation()`: keep blocks and bookings from overlapping.

## 5. Security
- Row Level Security is enabled on every new table.
- Reservations, guests, blocks and ledger are visible and writable only to owner, admin and manager roles.
- Staff roles have no access to these tables yet; their task views come later.
- No DELETE is granted on any new table (soft delete via `deleted_at` for reservations, guests and blocks).
- Ledger entries are append-only: no UPDATE or DELETE grant or policy.

## 6. Important notes
1. Every statement is idempotent (IF NOT EXISTS, DROP ... IF EXISTS, guarded constraint creation).
2. Money uses NUMERIC(12,4), matching the rest of the schema.
3. Date ranges are half-open: a guest checking out on the day another checks in does not conflict.
4. The `btree_gist` extension is required for the overlap constraint on reservations.
*/

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $$
BEGIN
  ALTER TABLE tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_role_check;
  ALTER TABLE tenant_memberships ADD CONSTRAINT tenant_memberships_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'housekeeper', 'driver', 'technician', 'inspector'));
END $$;

ALTER TABLE properties ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Casablanca';
ALTER TABLE units ALTER COLUMN currency SET DEFAULT 'EUR';

CREATE OR REPLACE FUNCTION has_tenant_role(p_tenant uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships m
    WHERE m.tenant_id = p_tenant
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = ANY (p_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION has_tenant_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION has_tenant_role(uuid, text[]) TO authenticated;

CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'ar')),
  notes text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_guests_tenant ON guests (tenant_id);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL,
  guest_id uuid,
  channel text NOT NULL DEFAULT 'manual' CHECK (channel IN ('airbnb', 'booking', 'vrbo', 'direct', 'manual', 'ical')),
  channel_reservation_id text,
  status text NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests_count integer NOT NULL DEFAULT 1 CHECK (guests_count BETWEEN 1 AND 50),
  guest_first_name text NOT NULL,
  guest_last_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  base_rent numeric(12,4) NOT NULL DEFAULT 0 CHECK (base_rent >= 0),
  cleaning_fee numeric(12,4) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
  tax_amount numeric(12,4) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  channel_commission numeric(12,4) NOT NULL DEFAULT 0 CHECK (channel_commission >= 0),
  total_amount numeric(12,4) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('CAD', 'MAD', 'EUR', 'USD')),
  special_requests text,
  internal_notes text,
  idempotency_key text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (check_out > check_in),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (unit_id, tenant_id) REFERENCES units (id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (guest_id, tenant_id) REFERENCES guests (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_unit ON reservations (unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_idempotency
  ON reservations (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_no_overlap') THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
      EXCLUDE USING gist (
        unit_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
      ) WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT 'other' CHECK (reason IN ('owner_stay', 'maintenance', 'renovation', 'other')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (end_date > start_date),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (unit_id, tenant_id) REFERENCES units (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_unit ON calendar_blocks (unit_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  reservation_id uuid,
  entry_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount numeric(12,4) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL CHECK (currency IN ('CAD', 'MAD', 'EUR', 'USD')),
  description text,
  reference_id text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (reservation_id, tenant_id) REFERENCES reservations (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_reservation ON ledger_entries (reservation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_reference
  ON ledger_entries (tenant_id, reference_id) WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION reject_block_over_reservation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.unit_id = NEW.unit_id
      AND r.tenant_id = NEW.tenant_id
      AND r.deleted_at IS NULL
      AND r.status NOT IN ('cancelled', 'no_show')
      AND daterange(r.check_in, r.check_out, '[)') && daterange(NEW.start_date, NEW.end_date, '[)')
  ) THEN
    RAISE EXCEPTION 'This period already has a reservation' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION reject_reservation_over_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.status NOT IN ('cancelled', 'no_show') AND EXISTS (
    SELECT 1 FROM calendar_blocks b
    WHERE b.unit_id = NEW.unit_id
      AND b.tenant_id = NEW.tenant_id
      AND b.deleted_at IS NULL
      AND daterange(b.start_date, b.end_date, '[)') && daterange(NEW.check_in, NEW.check_out, '[)')
  ) THEN
    RAISE EXCEPTION 'This unit is blocked for these dates' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_over_reservation ON calendar_blocks;
CREATE TRIGGER trg_block_over_reservation
  BEFORE INSERT OR UPDATE ON calendar_blocks
  FOR EACH ROW EXECUTE FUNCTION reject_block_over_reservation();

DROP TRIGGER IF EXISTS trg_reservation_over_block ON reservations;
CREATE TRIGGER trg_reservation_over_block
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION reject_reservation_over_block();

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON guests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON calendar_blocks TO authenticated;
GRANT SELECT, INSERT ON ledger_entries TO authenticated;

DROP POLICY IF EXISTS "select_manager_guests" ON guests;
CREATE POLICY "select_manager_guests" ON guests FOR SELECT
  TO authenticated USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "insert_manager_guests" ON guests;
CREATE POLICY "insert_manager_guests" ON guests FOR INSERT
  TO authenticated WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "update_manager_guests" ON guests;
CREATE POLICY "update_manager_guests" ON guests FOR UPDATE
  TO authenticated
  USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "select_manager_reservations" ON reservations;
CREATE POLICY "select_manager_reservations" ON reservations FOR SELECT
  TO authenticated USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "insert_manager_reservations" ON reservations;
CREATE POLICY "insert_manager_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "update_manager_reservations" ON reservations;
CREATE POLICY "update_manager_reservations" ON reservations FOR UPDATE
  TO authenticated
  USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "select_manager_blocks" ON calendar_blocks;
CREATE POLICY "select_manager_blocks" ON calendar_blocks FOR SELECT
  TO authenticated USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "insert_manager_blocks" ON calendar_blocks;
CREATE POLICY "insert_manager_blocks" ON calendar_blocks FOR INSERT
  TO authenticated WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "update_manager_blocks" ON calendar_blocks;
CREATE POLICY "update_manager_blocks" ON calendar_blocks FOR UPDATE
  TO authenticated
  USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "select_manager_ledger" ON ledger_entries;
CREATE POLICY "select_manager_ledger" ON ledger_entries FOR SELECT
  TO authenticated USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "insert_manager_ledger" ON ledger_entries;
CREATE POLICY "insert_manager_ledger" ON ledger_entries FOR INSERT
  TO authenticated WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));
