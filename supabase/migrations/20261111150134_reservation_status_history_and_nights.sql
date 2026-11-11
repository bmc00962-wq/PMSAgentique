/*
# Reservation status history and nights

## 1. Plain-English summary
Adds a permanent record of every status change on a reservation (who changed it, from what, to what, and why),
and a computed "nights" value so the calendar and lists can show stay length without extra math.

## 2. New tables
- `reservation_status_history`: one row per status change. Rows can be added and read, never edited or deleted.

## 3. Changed tables
- `reservations`: new computed column `nights` (check-out minus check-in, in days). It is calculated by the database and cannot be set directly.

## 4. Security
- Row Level Security is enabled on the new table.
- Only owner, admin and manager roles can read or add status history rows.
- No UPDATE or DELETE is granted, so history cannot be rewritten.

## 5. Important notes
1. Every statement is idempotent (IF NOT EXISTS, DROP ... IF EXISTS).
2. `changed_by` is filled from the signed-in user on the server, not from the browser.
*/

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS nights integer GENERATED ALWAYS AS (check_out - check_in) STORED;

CREATE TABLE IF NOT EXISTS reservation_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  reservation_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL CHECK (to_status IN ('inquiry', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  reason text,
  changed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (reservation_id, tenant_id) REFERENCES reservations (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reservation_status_history_reservation ON reservation_status_history (reservation_id);

ALTER TABLE reservation_status_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON reservation_status_history TO authenticated;

DROP POLICY IF EXISTS "select_manager_status_history" ON reservation_status_history;
CREATE POLICY "select_manager_status_history" ON reservation_status_history FOR SELECT
  TO authenticated USING (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "insert_manager_status_history" ON reservation_status_history;
CREATE POLICY "insert_manager_status_history" ON reservation_status_history FOR INSERT
  TO authenticated WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));
