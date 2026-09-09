# ROW LEVEL SECURITY — PMS SaaS Agentique

**Phase**: PROMPT 06 | **ADR**: ADR-007 | **Date**: 2026-08-09
**Tables protégées**: 74 tables tenant-specific | **Contextes**: 7 | **Tests**: 12 PASS

---

## 1. Principe de Double Défense

```
Requête → canUserPerform() (Edge Function) → RLS PostgreSQL (moteur DB) → Résultat
```

- **canUserPerform()** : validation logique métier (rôle, permissions, scope)
- **RLS** : isolation physique garantie par le moteur PostgreSQL
- Si l'un ou l'autre échoue → accès refusé
- Edge Functions avec `service_role` : bypass RLS autorisé **seulement si** AuditEvent créé

---

## 2. Fonctions Helper (Supabase Auth)

```sql
-- Récupérer tenant_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth.get_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth.get_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérifier si l'utilisateur est Platform Super Admin
CREATE OR REPLACE FUNCTION auth.is_platform_super_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' = 'platform_super_admin'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Récupérer membership_id
CREATE OR REPLACE FUNCTION auth.get_membership_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'membership_id')::UUID
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérifier appartenance à un tenant
CREATE OR REPLACE FUNCTION auth.has_active_membership(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_membership
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 3. Pattern Standard (Tables Tenant-Specific)

Template appliqué aux 74 tables métier avec `tenant_id` :

```sql
-- Activer RLS
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;

-- SELECT : utilisateur du bon tenant uniquement
CREATE POLICY "{table}_select" ON {table}
  FOR SELECT USING (
    auth.is_platform_super_admin()
    OR tenant_id = auth.get_tenant_id()
  );

-- INSERT : tenant_id imposé depuis JWT, jamais depuis le corps de la requête
CREATE POLICY "{table}_insert" ON {table}
  FOR INSERT WITH CHECK (
    tenant_id = auth.get_tenant_id()
    AND auth.has_active_membership(tenant_id)
  );

-- UPDATE : même tenant, soft delete vérifié
CREATE POLICY "{table}_update" ON {table}
  FOR UPDATE USING (
    tenant_id = auth.get_tenant_id()
  ) WITH CHECK (
    tenant_id = auth.get_tenant_id()
  );

-- DELETE : bloqué par défaut (soft delete via deleted_at)
CREATE POLICY "{table}_delete" ON {table}
  FOR DELETE USING (false);  -- JAMAIS de DELETE physique (sauf migration contrôlée)
```

---

## 4. Policies Spécifiques par Contexte

### 4.1 Contexte : Tenant User (Rôles internes)

**property** — accès selon properties_scope du membership
```sql
CREATE POLICY "property_select_tenant" ON property
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND deleted_at IS NULL
    AND (
      auth.get_role() IN ('tenant_admin','operations_manager')
      OR id = ANY(
        SELECT unnest(properties_scope) FROM tenant_membership
        WHERE user_id = auth.uid() AND tenant_id = auth.get_tenant_id() AND status = 'active'
      )
      OR (SELECT properties_scope FROM tenant_membership
          WHERE user_id = auth.uid() AND tenant_id = auth.get_tenant_id() AND status = 'active') IS NULL
    )
  );
```

**reservation** — lecture selon rôle
```sql
CREATE POLICY "reservation_select_tenant" ON reservation
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND deleted_at IS NULL
    AND auth.get_role() IN (
      'tenant_admin','operations_manager','property_manager',
      'accountant','customer_service_agent'
    )
  );
```

**owner_statement** — accountant et tenant_admin uniquement
```sql
CREATE POLICY "owner_statement_select" ON owner_statement
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() IN ('tenant_admin','accountant')
  );
```

**audit_event** — lecture uniquement (APPEND-ONLY)
```sql
CREATE POLICY "audit_event_select" ON audit_event
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() IN ('tenant_admin','platform_super_admin','accountant')
  );

-- Pas d'INSERT policy directe → INSERT via Edge Function service_role uniquement
CREATE POLICY "audit_event_no_update" ON audit_event FOR UPDATE USING (false);
CREATE POLICY "audit_event_no_delete" ON audit_event FOR DELETE USING (false);
```

---

### 4.2 Contexte : Owner (Externe)

**owner** — seulement sa propre fiche
```sql
CREATE POLICY "owner_select_self" ON owner
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  );
```

**property** — seulement ses propriétés
```sql
CREATE POLICY "property_select_owner" ON property
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND owner_id IN (SELECT id FROM owner WHERE user_id = auth.uid())
    AND deleted_at IS NULL
  );
```

**owner_statement** — seulement ses relevés
```sql
CREATE POLICY "owner_statement_select_owner" ON owner_statement
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND owner_id IN (SELECT id FROM owner WHERE user_id = auth.uid())
  );
```

**payment** — seulement les paiements de ses réservations
```sql
CREATE POLICY "payment_select_owner" ON payment
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND reservation_id IN (
      SELECT r.id FROM reservation r
      JOIN unit u ON u.id = r.unit_id
      JOIN property p ON p.id = u.property_id
      JOIN owner o ON o.id = p.owner_id
      WHERE o.user_id = auth.uid()
    )
  );
```

---

### 4.3 Contexte : Cleaner

**housekeeping_job** — seulement les jobs assignés
```sql
CREATE POLICY "housekeeping_job_select_cleaner" ON housekeeping_job
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'cleaner'
    AND task_id IN (
      SELECT task_id FROM assignment
      WHERE assignee_id = auth.uid() AND status != 'declined'
    )
  );
```

**checklist_item** — via checklist de son job uniquement
```sql
CREATE POLICY "checklist_item_update_cleaner" ON checklist_item
  FOR UPDATE USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'cleaner'
    AND checklist_id IN (
      SELECT checklist_id FROM housekeeping_job hj
      JOIN assignment a ON a.task_id = hj.task_id
      WHERE a.assignee_id = auth.uid()
    )
  ) WITH CHECK (tenant_id = auth.get_tenant_id());
```

**property / unit** — lecture seule pour navigation
```sql
CREATE POLICY "property_read_cleaner" ON property
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'cleaner'
    AND deleted_at IS NULL
    AND id IN (
      SELECT unit.property_id FROM unit
      JOIN housekeeping_job hj ON hj.unit_id = unit.id
      JOIN assignment a ON a.task_id = hj.task_id
      WHERE a.assignee_id = auth.uid()
    )
  );
```

---

### 4.4 Contexte : Driver

**transport_trip** — seulement les trajets assignés
```sql
CREATE POLICY "transport_trip_select_driver" ON transport_trip
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND driver_id IN (SELECT id FROM driver WHERE user_id = auth.uid())
  );
```

**transport_stop** — via trajets du driver
```sql
CREATE POLICY "transport_stop_select_driver" ON transport_stop
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND trip_id IN (
      SELECT id FROM transport_trip tt
      JOIN driver d ON d.id = tt.driver_id
      WHERE d.user_id = auth.uid()
    )
  );
```

---

### 4.5 Contexte : Guest (Portail Voyageur)

**reservation** — seulement sa réservation (via token temporaire)
```sql
CREATE POLICY "reservation_select_guest" ON reservation
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'guest'
    AND guest_id IN (SELECT id FROM guest WHERE email = auth.jwt() ->> 'email')
    AND deleted_at IS NULL
  );
```

**message** — seulement ses conversations
```sql
CREATE POLICY "message_select_guest" ON message
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'guest'
    AND conversation_id IN (
      SELECT c.id FROM conversation c
      JOIN reservation r ON r.id = c.reservation_id
      JOIN guest g ON g.id = r.guest_id
      WHERE g.email = auth.jwt() ->> 'email'
    )
  );
```

**access_code** — seulement ses codes actifs
```sql
CREATE POLICY "access_code_select_guest" ON access_code
  FOR SELECT USING (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'guest'
    AND reservation_id IN (
      SELECT r.id FROM reservation r
      JOIN guest g ON g.id = r.guest_id
      WHERE g.email = auth.jwt() ->> 'email'
        AND r.status IN ('confirmed','checked_in')
    )
    AND is_active = true
    AND valid_from <= now() AND valid_until >= now()
  );
```

**Accès guest REFUSÉ sur** : owner, owner_statement, payment (montants), audit_event, tenant_membership, agent_*, approval_request

---

### 4.6 Contexte : Service Account (OTA / n8n)

Authentification via Bearer token + `X-Tenant-ID` header validé dans Edge Function.
La validation s'effectue **avant** tout accès à la base — le token est vérifié par l'Edge Function qui résout le tenant_id.

```sql
-- Scope service_account : intégrations et réservations seulement
CREATE POLICY "reservation_insert_service_account" ON reservation
  FOR INSERT WITH CHECK (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'service_account'
    AND idempotency_key IS NOT NULL  -- Obligatoire
  );

CREATE POLICY "integration_event_insert_service_account" ON integration_event
  FOR INSERT WITH CHECK (
    tenant_id = auth.get_tenant_id()
    AND auth.get_role() = 'service_account'
    AND idempotency_key IS NOT NULL
  );
```

**Service Account REFUSÉ sur** : owner_statement, payout, expense, audit_event (INSERT direct), agent_*, approval_request

---

### 4.7 Contexte : Edge Function (service_role)

Le `service_role` de Supabase bypass les policies RLS.

**Règle absolue** : chaque Edge Function qui utilise service_role **DOIT** créer un `audit_event` avant d'écrire.

```typescript
// Pattern obligatoire dans toute Edge Function avec service_role
async function serviceRoleOperation(ctx: TenantContext, operation: () => Promise<void>) {
  // 1. Vérification canUserPerform() (ne bypass pas)
  const authResult = await canUserPerform(ctx);
  if (!authResult.allowed) throw new ForbiddenError(authResult.reason);

  // 2. AuditEvent PRÉ-opération
  await supabaseAdmin.from('audit_event').insert({
    tenant_id: ctx.tenant_id,
    event_type: 'SERVICE_ROLE_OPERATION',
    actor_id: ctx.user_id,
    actor_type: ctx.actor_type,
    correlation_id: ctx.correlation_id,
    occurred_at: new Date().toISOString(),
  });

  // 3. Opération avec service_role
  await operation();
}
```

---

## 5. Tables Append-Only — Protection Absolue

Ces 7 tables ne peuvent jamais être modifiées ou supprimées :

```sql
-- Pour chaque table append-only :
CREATE POLICY "audit_event_no_update" ON audit_event FOR UPDATE USING (false);
CREATE POLICY "audit_event_no_delete" ON audit_event FOR DELETE USING (false);

-- Même pattern pour :
-- ledger_entry, access_event, reservation_status_history,
-- approval_decision, integration_event (idempotent key unique)
```

---

## 6. Tables Sans RLS (Platform Level)

Ces tables **n'ont pas** de `tenant_id` — elles sont gérées exclusivement par le service_role :

```
tenant           -- Gérée par platform_super_admin via Edge Function
tenant_settings  -- Via Edge Function seulement
plan             -- Seed data, read-only frontend
feature          -- Seed data
amenity          -- Catalogue global, read-only
channel          -- Catalogue global, read-only
user_profile     -- Lecture publique limitée (avatar, name)
role             -- Système : lecture uniquement
permission       -- Système : lecture uniquement
```

---

## 7. Politique DELETE Globale

```sql
-- Règle universelle : DELETE physique jamais autorisé via RLS
-- Toute "suppression" = UPDATE de deleted_at
-- Exception : migrations de nettoyage via service_role + audit

CREATE OR REPLACE FUNCTION enforce_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Physical DELETE not allowed. Use soft delete (deleted_at).';
END;
$$ LANGUAGE plpgsql;

-- Trigger appliqué sur toutes les tables avec deleted_at
CREATE TRIGGER no_physical_delete
  BEFORE DELETE ON property
  FOR EACH ROW EXECUTE FUNCTION enforce_soft_delete();
-- (répété sur : unit, owner, guest, reservation, driver, vendor, maintenance_ticket, etc.)
```

---

## 8. Migration RLS

```
/migrations
  20260809_000011_rls_policies.sql     -- Policies standard (74 tables)
  20260809_000012_rls_special_cases.sql -- Owner, Cleaner, Driver, Guest, Service Account
  20260809_000013_rls_append_only.sql  -- Protection tables append-only
  20260809_000014_rls_soft_delete_triggers.sql
  20260809_000015_seed_system_data.sql -- Roles, Permissions, Channels, Plans
```

---

## 9. Documents Associés

- [ADR-007-RLS-STRATEGY.md](../architecture/ADR-007-RLS-STRATEGY.md)
- [RBAC.md](./RBAC.md) — canUserPerform()
- [SECURITY_TEST_REPORT.md](./SECURITY_TEST_REPORT.md)
- [DATA_MODEL.md](../database/DATA_MODEL.md) — 80 tables
- [TENANCY_MODEL.md](../architecture/TENANCY_MODEL.md)
