# TENANCY MODEL — PMS SaaS Agentique

**Phase**: PROMPT 03 | **ADR**: ADR-004 | **Status**: ACCEPTED | **Date**: 2026-08-09

---

## 1. Pattern Retenu

**Shared Database · Shared Schema · Row-Level Isolation via PostgreSQL RLS**

| Pattern | Verdict |
|---------|---------|
| Database per tenant | ❌ Coût élevé, N migrations, complexité opérationnelle |
| Schema per tenant | ❌ Support Supabase limité, N migrations |
| **Shared schema + RLS** | ✅ RETENU — optimal MVP→V1, migrations centralisées, RLS natif |

---

## 2. Hiérarchie Organisationnelle

```
Platform (SaaS)
└── Tenant (Entreprise de gestion locative)
    └── Brand (Marque commerciale — optionnel)
        └── Region (Zone géographique)
            └── Portfolio (Groupe de propriétés)
                └── Owner (Propriétaire)
                    └── Property (Bien immobilier)
                        └── Unit (Logement individuel)
```

| Niveau | Exemples Canada | Exemples Maroc |
|--------|-----------------|----------------|
| Tenant | "Gestion Prestige Montréal" | "Riad Excellence Sarl" |
| Region | "Vieux-Montréal", "Plateau" | "Médina", "Guéliz" |
| Owner | "Jean-Pierre Dubois" | "Mohammed Al-Fassi" |
| Property | "355 rue de la Commune" | "Riad Bacha" |
| Unit | "Apt 3B", "Studio" | "Chambre Sultan" |

---

## 3. Entités Tenant (Conceptuelles)

### Tenant
```
id UUID PK · slug TEXT UNIQUE · name TEXT · status ENUM
plan_id UUID · data_region TEXT · trial_ends_at · suspended_at · deleted_at
```
Status: `trial | active | suspended | pending_deletion | deleted | migrating`

### TenantSettings
```
tenant_id UUID PK · default_language TEXT · default_currency TEXT
timezone TEXT · check_in_time TIME · check_out_time TIME
cleaning_buffer_hours INT · commission_default DECIMAL
allow_owner_portal BOOL · allow_guest_portal BOOL · require_inspection BOOL
```

### TenantBranding
```
tenant_id UUID PK · logo_url TEXT · primary_color TEXT · secondary_color TEXT
company_name TEXT · support_email TEXT · support_phone TEXT · website TEXT
```

### TenantDomain
```
id UUID PK · tenant_id UUID · domain TEXT UNIQUE
is_primary BOOL · is_verified BOOL · ssl_status ENUM · domain_type ENUM
-- Default: {slug}.pmsagentique.app
```

### TenantMembership
```
id UUID PK · tenant_id UUID · user_id UUID · role TEXT · status ENUM
invited_at · joined_at · suspended_at · permissions_override JSONB
properties_scope UUID[] -- NULL = toutes les propriétés
UNIQUE(tenant_id, user_id)
```

### TenantFeature
```
id UUID PK · tenant_id UUID · feature_key TEXT · is_enabled BOOL
config JSONB · expires_at TIMESTAMPTZ
UNIQUE(tenant_id, feature_key)
Keys: "channel_manager" | "ai_agents" | "smart_locks" | "transport"
```

### TenantQuota
```
tenant_id UUID PK
-- Limites plan: max_properties · max_units · max_members
--               max_channels · max_ai_agents · max_api_calls_per_day · max_storage_gb
-- Compteurs:    current_properties · current_units · current_members · current_storage_gb
-- -1 = illimité
```

---

## 4. Règle Fondamentale — tenant_id

### OBLIGATOIRE sur toutes les tables métier
```sql
tenant_id UUID NOT NULL REFERENCES tenant(id)
```

### Source du tenant_id — UNIQUEMENT depuis auth context

```
✅ SOURCES VALIDES:
  ① JWT claims (tenant_id dans le token Supabase)
  ② TenantMembership lookup (user_id → tenant_id)
  ③ Domain résolution (Host header → TenantDomain → tenant_id)
  ④ Service Account (header X-Tenant-ID validé côté serveur)

❌ JAMAIS ACCEPTÉ:
  ✗ Champ de formulaire frontend
  ✗ Query parameter non validé
  ✗ Body de requête non authentifié
  ✗ Variable d'environnement côté client
```

---

## 5. resolveTenantContext()

```typescript
interface TenantContext {
  tenant_id: string;
  tenant: Tenant;
  membership: TenantMembership;
  user_id: string;
  role: string;
  permissions: string[];
  properties_scope: string[] | null; // null = toutes les propriétés
  features: string[];
  quotas: TenantQuota;
}

async function resolveTenantContext(request: Request): Promise<TenantContext> {
  // 1. Valider le JWT via Supabase Auth
  const { user } = await supabase.auth.getUser(token);

  // 2. Résoudre tenant_id depuis:
  //    a) JWT claim  b) TenantMembership  c) Host header  d) X-Tenant-ID (service account)
  const tenant_id = await resolveTenantId(user, request.headers);

  // 3. Vérifier statut tenant (active, not suspended)
  await assertTenantActive(tenant_id);

  // 4. Charger membership et permissions
  const membership = await getTenantMembership(user.id, tenant_id);
  await assertMembershipActive(membership);

  return {
    tenant_id,
    tenant: await getTenant(tenant_id),
    membership,
    user_id: user.id,
    role: membership.role,
    permissions: await getPermissionsForRole(membership.role, membership.permissions_override),
    properties_scope: membership.properties_scope,
    features: await getTenantFeatures(tenant_id),
    quotas: await getTenantQuota(tenant_id),
  };
}
```

---

## 6. Isolation des Données

### PostgreSQL RLS — Pattern Standard
```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "[table]_tenant_isolation" ON [table_name]
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_membership
      WHERE user_id = auth.uid() AND status = 'active'
      LIMIT 1
    )
  );
```

### Tests d'Isolation Obligatoires
```
TEST-ISO-001: Tenant A SELECT sur Tenant B       → DOIT ÉCHOUER (0 rows)
TEST-ISO-002: Tenant A INSERT avec tenant_id B   → DOIT ÉCHOUER
TEST-ISO-003: Tenant A UPDATE sur Tenant B       → DOIT ÉCHOUER
TEST-ISO-004: Tenant A DELETE sur Tenant B       → DOIT ÉCHOUER
TEST-ISO-005: Service Account A → X-Tenant-ID B  → DOIT ÉCHOUER
```

### Storage Isolation
```
Bucket structure:
  tenant-{tenant_id}/
    properties/{property_id}/photos/
    properties/{property_id}/documents/
    housekeeping/{job_id}/photos/
    inspections/{inspection_id}/photos/

Policy: vérification préfixe tenant_id sur tout accès Storage
```

---

## 7. Quotas par Plan

| Feature | Trial | Starter | Growth | Enterprise |
|---------|-------|---------|--------|------------|
| Propriétés | 3 | 10 | 50 | Illimité |
| Membres | 2 | 5 | 20 | Illimité |
| Canaux | 1 | 2 | 5 | Illimité |
| Storage | 5 GB | 20 GB | 100 GB | 1 TB |
| API calls/jour | 1 000 | 10 000 | 100 000 | Illimité |
| AI Agents | Non | Non | 3 | Illimité |
| Smart Locks | Non | Non | Oui | Oui |

### Vérification de Quota
```typescript
async function checkQuota(tenant_id: string, resource: string, increment = 1) {
  const quota = await getTenantQuota(tenant_id);
  const current = quota[`current_${resource}`];
  const max = quota[`max_${resource}`];
  if (max !== -1 && current + increment > max) {
    throw new QuotaExceededError(resource, current, max);
  }
}
```

---

## 8. Secrets par Tenant

```
TenantSecret {
  tenant_id: UUID
  key_name: TEXT        -- "AIRBNB_API_KEY" | "STRIPE_SECRET_KEY"
  encrypted_value: TEXT -- Chiffré avec clé dérivée du tenant_id
  rotated_at: TIMESTAMPTZ
}
```

**Règle** : Secrets utilisés uniquement dans les Edge Functions. Jamais exposés au frontend.

---

## 9. Rate Limiting

| Endpoint | Limite |
|----------|--------|
| /api/reservations | 100 req/min |
| /api/calendar | 200 req/min |
| /api/automation/* (n8n) | 50 req/min |
| /api/agents/* | 20 req/min |
| /api/admin/* | 10 req/min |

Dépassement → HTTP 429 + header `Retry-After`

---

## 10. Lifecycle du Tenant

### Suspension
```
TRIGGER: Plan expiré | Violation ToS | Non-paiement | Super Admin
EFFET: tenant.status = 'suspended' · sessions invalidées · API bloquée (403)
       données conservées · webhooks OTA désactivés · n8n suspendus
DURÉE: 30 jours par défaut
```

### Suppression
```
1. Super Admin → status = 'pending_deletion'
2. Période de grâce: 30 jours · notification Tenant Admin
3. Possibilité d'export (RGPD)
4. Après délai: suppression physique en cascade + purge Storage
5. Audit event immuable enregistré
```

### Export RGPD
```
FORMAT: JSON + CSV par domaine
CONTENU: Toutes données + fichiers Storage + audit logs (3 ans)
DÉLAI: 72h max · lien chiffré à durée limitée
ACCÈS: Tenant Admin uniquement
```

### Migration Enterprise (V2)
```
1. Export snapshot · 2. Provision infra dédiée · 3. Restauration
4. Validation · 5. Basculement DNS · 6. Transition 7 jours
```

---

## 11. Infrastructure

### Shared (défaut — MVP à V1)
Même PostgreSQL · même Supabase Auth · même Storage · même n8n

### Dedicated Enterprise (V2)
PostgreSQL dédié · région dédiée · VPC dédié · SLA renforcé

---

## 12. Documents Associés

- [ADR-004 — Multitenant Model](./ADR-004-MULTITENANT-MODEL.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [RBAC.md](../security/RBAC.md) — PROMPT 04
- [DATA_MODEL.md](../database/DATA_MODEL.md) — PROMPT 05
