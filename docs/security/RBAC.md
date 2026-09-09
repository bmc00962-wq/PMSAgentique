# RBAC — Authentication & Authorization Model

**Phase**: PROMPT 04 | **ADR**: ADR-005 | **Date**: 2026-08-09

---

## 1. Authentification (Supabase Auth)

| Méthode | Phase | Notes |
|---------|-------|-------|
| Email / Password | MVP | Hash bcrypt via Supabase |
| OTP (email / SMS) | MVP | 6 chiffres, expiration 10 min |
| MFA (TOTP) | V1 | Authenticator app |
| Magic Link | V1 | Lien email temporaire |
| SSO (SAML / OIDC) | V2 | Enterprise uniquement |

### JWT Claims personnalisés
```json
{
  "sub": "user_id",
  "app_metadata": {
    "tenant_id": "uuid",
    "role": "property_manager",
    "membership_id": "uuid"
  }
}
```

---

## 2. Entités RBAC

### UserProfile
```sql
id UUID PRIMARY KEY  -- = auth.users.id
email TEXT NOT NULL
full_name TEXT
avatar_url TEXT
phone TEXT
preferred_language TEXT DEFAULT 'fr'  -- 'fr' | 'en' | 'ar'
preferred_currency TEXT DEFAULT 'CAD'
timezone TEXT DEFAULT 'America/Montreal'
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### TenantMembership
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL REFERENCES tenant(id)
user_id UUID NOT NULL REFERENCES user_profile(id)
role TEXT NOT NULL
status TEXT NOT NULL DEFAULT 'invited'
  -- 'invited' | 'active' | 'inactive' | 'suspended'
permissions_override JSONB DEFAULT '{}'
  -- { "grant": ["extra.permission"], "deny": ["removed.permission"] }
properties_scope UUID[] DEFAULT NULL  -- NULL = all properties
invited_at TIMESTAMPTZ
invited_by UUID REFERENCES user_profile(id)
joined_at TIMESTAMPTZ
UNIQUE(tenant_id, user_id)
```

### Role
```sql
id UUID PRIMARY KEY
tenant_id UUID  -- NULL = system role (non modifiable)
name TEXT UNIQUE NOT NULL
display_name TEXT NOT NULL
is_system BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Permission
```sql
id UUID PRIMARY KEY
resource TEXT NOT NULL   -- "property" | "reservation" | ...
action TEXT NOT NULL     -- "read" | "create" | ...
name TEXT UNIQUE NOT NULL  -- "property.read"
is_sensitive BOOLEAN DEFAULT false
```

### MembershipRole (custom roles — V1)
```sql
id UUID PRIMARY KEY
membership_id UUID NOT NULL REFERENCES tenant_membership(id)
role_id UUID NOT NULL REFERENCES role(id)
granted_at TIMESTAMPTZ DEFAULT NOW()
granted_by UUID REFERENCES user_profile(id)
```

### RolePermission
```sql
id UUID PRIMARY KEY
role TEXT NOT NULL REFERENCES role(name)
permission TEXT NOT NULL REFERENCES permission(name)
conditions JSONB DEFAULT NULL
  -- { "own_properties_only": true } | { "assigned_only": true }
UNIQUE(role, permission)
```

---

## 3. Permissions Granulaires (~88 permissions / 21 domaines)

| Domaine | Permissions |
|---------|------------|
| `property` | read · create · update · delete · list |
| `unit` | read · create · update · delete |
| `owner` | read · create · update · delete · finance.read |
| `reservation` | read · create · modify · cancel · check_in · check_out · refund |
| `calendar` | read · update · block |
| `guest` | read · create · update · message |
| `channel` | read · connect · sync · configure |
| `listing` | read · create · update · publish |
| `housekeeping` | read · assign · complete · approve |
| `inspection` | read · create · complete · approve |
| `transport` | read · assign · complete |
| `maintenance` | read · create · approve · complete |
| `inventory` | read · update |
| `access` | read · generate · revoke |
| `payment` | read · refund · void |
| `finance` | read · export · payout.read · payout.approve · expense.create · expense.approve · statement.read |
| `communication` | read · send · template.read · template.create · template.update |
| `report` | read · export |
| `agent` | execute · approve · configure |
| `tenant` | admin · settings.update · members.manage · billing.read |
| `audit` | read · export |

---

## 4. Rôles Système (12 rôles)

| Rôle | Niveau | Périmètre | Restrictions |
|------|--------|-----------|-------------|
| `platform_super_admin` | Platform | ALL tenants | Chaque action auditée |
| `tenant_admin` | Tenant | Son tenant (all) | Pas d'accès cross-tenant |
| `operations_manager` | Tenant | Tout (hors finance totale) | — |
| `property_manager` | Tenant | Propriétés assignées | properties_scope |
| `owner` | External | Ses propres biens | own_properties_only |
| `accountant` | Tenant | Finance complète | — |
| `cleaner` | Ops | Jobs assignés | assigned_only |
| `driver` | Ops | Trajets assignés | assigned_only |
| `maintenance_tech` | Ops | Tickets assignés | assigned_only |
| `guest` | External | Sa réservation | Token temporaire |
| `ai_agent` | System | AgentPolicy.allowed_tools | Approbation humaine requise |
| `service_account` | System | channel.sync + reservation CRUD | Bearer + X-Tenant-ID validé |

---

## 5. Matrice Rôle × Permission (Synthèse)

| Domaine | super_admin | tenant_admin | ops_mgr | prop_mgr | owner | accountant | cleaner | driver | tech | guest | ai_agent |
|---------|:-----------:|:------------:|:-------:|:--------:|:-----:|:----------:|:-------:|:------:|:----:|:-----:|:--------:|
| property.* | ✅ | ✅ | ✅ | ✅ (own) | 👁 | — | — | — | — | — | Policy |
| reservation.* | ✅ | ✅ | ✅ | ✅ | 👁 | 👁 | — | — | — | 👁(own) | Policy |
| calendar.* | ✅ | ✅ | ✅ | ✅ | 👁 | — | — | — | — | — | Policy |
| owner.* | ✅ | ✅ | ✅ | 👁 | 👁(own) | 👁 | — | — | — | — | — |
| housekeeping.* | ✅ | ✅ | ✅ | ✅ | — | — | ✅(own) | — | — | — | Policy |
| transport.* | ✅ | ✅ | ✅ | — | — | — | — | ✅(own) | — | — | Policy |
| maintenance.* | ✅ | ✅ | ✅ | — | — | — | — | — | ✅(own) | — | Policy |
| finance.* | ✅ | ✅ | — | — | 👁(own) | ✅ | — | — | — | — | — |
| payment.* | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — |
| access.* | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | Policy |
| agent.* | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | 👁 |
| tenant.admin | ✅ | ✅ | — | — | — | — | — | — | — | — | — |
| audit.* | ✅ | ✅ | — | — | — | 👁 | — | — | — | — | — |
| communication.* | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | ✅(own) | Policy |

**Légende**: ✅ complet · 👁 lecture · (own) périmètre limité · Policy = défini par AgentPolicy

---

## 6. canUserPerform()

```typescript
interface AuthorizationRequest {
  user_id: string;
  tenant_id: string;
  permission: string; // "property.read"
  resource?: { type: string; id: string; property_id?: string; owner_id?: string };
}

interface AuthorizationResult {
  allowed: boolean;
  reason?: "ALLOWED" | "SUPER_ADMIN_BYPASS" | "NO_ACTIVE_MEMBERSHIP"
         | "TENANT_SUSPENDED" | "PERMISSION_DENIED"
         | "PROPERTY_SCOPE_DENIED" | "OWNER_SCOPE_DENIED" | "ASSIGNED_ONLY_DENIED";
}

async function canUserPerform(req: AuthorizationRequest): Promise<AuthorizationResult> {
  // ① Platform Super Admin bypass — toujours audité
  if (await isPlatformSuperAdmin(req.user_id)) {
    await createAuditEvent({ event_type: "SUPER_ADMIN_ACTION", ...req });
    return { allowed: true, reason: "SUPER_ADMIN_BYPASS" };
  }

  // ② TenantMembership
  const membership = await getTenantMembership(req.user_id, req.tenant_id);
  if (!membership || membership.status !== "active")
    return { allowed: false, reason: "NO_ACTIVE_MEMBERSHIP" };

  // ③ Statut tenant
  const tenant = await getTenant(req.tenant_id);
  if (tenant.status !== "active")
    return { allowed: false, reason: "TENANT_SUSPENDED" };

  // ④ Permissions effectives (role + overrides)
  const rolePerms = await getRolePermissions(membership.role);
  const granted = membership.permissions_override?.grant ?? [];
  const denied  = membership.permissions_override?.deny ?? [];
  const effective = [...rolePerms, ...granted].filter(p => !denied.includes(p));

  // ⑤ Vérifier permission
  if (!effective.includes(req.permission))
    return { allowed: false, reason: "PERMISSION_DENIED" };

  // ⑥ Conditions contextuelles (properties_scope)
  if (req.resource && membership.properties_scope) {
    const propertyId = req.resource.property_id ?? await resolvePropertyId(req.resource);
    if (propertyId && !membership.properties_scope.includes(propertyId))
      return { allowed: false, reason: "PROPERTY_SCOPE_DENIED" };
  }

  // ⑦ Conditions de rôle (own_properties_only)
  const conditions = await getRoleConditions(membership.role, req.permission);
  if (conditions?.own_properties_only && req.resource) {
    const isOwner = await isResourceOwner(req.user_id, req.resource);
    if (!isOwner) return { allowed: false, reason: "OWNER_SCOPE_DENIED" };
  }

  return { allowed: true, reason: "ALLOWED" };
}
```

---

## 7. Règles Absolues

```
✅ canUserPerform() appelé dans chaque Edge Function avant toute mutation
✅ RLS = seconde ligne de défense (defense in depth)
✅ Actions sensibles → AuditEvent créé
✅ AI Agent → AgentPolicy.allowed_tools uniquement + approbation circuit humain

✗ Décision d'autorisation dans un composant React
✗ tenant_id depuis un champ de formulaire
✗ Bypass RLS sans service_role token audité
✗ AI Agent avec accès direct PostgreSQL
✗ Service Account sans X-Tenant-ID validé serveur
```

---

## 8. Tests de Séparation Obligatoires

```
TEST-AUTH-001: User Tenant A → ressource Tenant B          → MUST RETURN 403
TEST-AUTH-002: Owner → finances autre owner                 → MUST RETURN 403
TEST-AUTH-003: Cleaner → propriété non assignée            → MUST RETURN 403
TEST-AUTH-004: Guest → réservation autre guest              → MUST RETURN 403
TEST-AUTH-005: Service Account → X-Tenant-ID invalide      → MUST RETURN 401
TEST-AUTH-006: AI Agent → action destructive sans approbation → MUST BE BLOCKED
```

---

## 9. Documents Associés

- [ADR-005-RBAC.md](../architecture/ADR-005-RBAC.md)
- [TENANCY_MODEL.md](../architecture/TENANCY_MODEL.md)
- [DATA_MODEL.md](../database/DATA_MODEL.md) — PROMPT 05
- [RLS.md](./RLS.md) — PROMPT 06
