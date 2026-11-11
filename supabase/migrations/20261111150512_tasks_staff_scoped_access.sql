/*
# Shared tasks table with staff-scoped access

1. New Tables
- `tasks`: work items for housekeeping, maintenance and transport. Columns: tenant_id, task_type (housekeeping/maintenance/transport), title, description, unit_id (optional), assigned_to (auth user of the staff member), status (todo/in_progress/done/cancelled), due_at, created_by (defaults to the signed-in user), created_at, updated_at, version, deleted_at.

2. Security
- RLS enabled on `tasks`.
- Managers (owner, admin, manager) can read, create and update every task in their workspace.
- Staff (any other active membership) can read and update only tasks assigned to them.
- A trigger lets non-managers change only `status`, `updated_at` and `version`; any other column change is rejected.
- Grants: authenticated gets SELECT, INSERT, UPDATE on `tasks` (no DELETE; removal is a soft delete).
- anon loses all privileges on every tenant table. No anon policies existed, so this only removes unused access.

3. Notes
- Assignment targets an auth user id; the membership check on the active tenant is enforced in every policy.
- Idempotent: policies and trigger are dropped before being created.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN ('housekeeping', 'maintenance', 'transport')),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  unit_id uuid,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  due_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  FOREIGN KEY (unit_id, tenant_id) REFERENCES units (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS tasks_tenant_assignee_idx ON tasks (tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS tasks_tenant_status_idx ON tasks (tenant_id, status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON tasks TO authenticated;

REVOKE ALL ON tenants, tenant_memberships, owners, properties, units, guests, reservations, calendar_blocks, ledger_entries, reservation_status_history FROM anon;

DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks FOR SELECT
TO authenticated
USING (
  has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager'])
  OR (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tasks.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "insert_manager_tasks" ON tasks;
CREATE POLICY "insert_manager_tasks" ON tasks FOR INSERT
TO authenticated
WITH CHECK (has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks FOR UPDATE
TO authenticated
USING (
  has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager'])
  OR (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tasks.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
)
WITH CHECK (
  has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'manager'])
  OR (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tasks.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  )
);

CREATE OR REPLACE FUNCTION enforce_staff_task_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF has_tenant_role(NEW.tenant_id, ARRAY['owner', 'admin', 'manager']) THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.task_type IS DISTINCT FROM OLD.task_type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.unit_id IS DISTINCT FROM OLD.unit_id
    OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
    OR NEW.due_at IS DISTINCT FROM OLD.due_at
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Staff can only update the status of an assigned task' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_task_update ON tasks;
CREATE TRIGGER trg_enforce_staff_task_update
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION enforce_staff_task_update();

REVOKE EXECUTE ON FUNCTION enforce_staff_task_update() FROM PUBLIC, anon, authenticated;
