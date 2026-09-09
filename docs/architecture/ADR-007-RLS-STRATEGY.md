# ADR-007 — Stratégie RLS (Policies par Contexte + Double Défense)

**Date**: 2026-08-09
**Status**: ACCEPTED
**Frozen**: YES
**Décidé en**: PROMPT 06

---

## Contexte

80 tables définies en PROMPT 05 — dont 74 tenant-specific. L'isolation tenant est garantie par ADR-004 (shared schema + RLS), mais les policies concrètes n'avaient pas encore été définies. PROMPT 06 formalise la stratégie d'implémentation RLS pour 7 contextes d'accès distincts.

---

## Décision

**Double défense : canUserPerform() (logique) + RLS PostgreSQL (moteur) sur 7 contextes.**

---

## Les 7 Contextes RLS

| Contexte | Mécanisme Auth | Scope d'accès | Bypass RLS |
|----------|----------------|---------------|------------|
| `tenant_user` | JWT Supabase | Tables métier du tenant | Non |
| `owner` | JWT (rôle=owner) | Ses propriétés/finances | Non |
| `cleaner` | JWT (rôle=cleaner) | Jobs assignés uniquement | Non |
| `driver` | JWT (rôle=driver) | Trajets assignés uniquement | Non |
| `guest` | JWT temporaire | Sa réservation uniquement | Non |
| `service_account` | Bearer + X-Tenant-ID | Scope intégration limité | Non |
| `edge_function` | service_role Supabase | Toutes les tables | **Oui** (audité obligatoirement) |

---

## Principes Gelés

1. **RLS activé** sur toutes les 74 tables tenant-specific (ENABLE + FORCE)
2. **Double défense** : canUserPerform() + RLS — les deux doivent être passés
3. **DELETE physique interdit** : toutes les policies DELETE USING (false) — soft delete uniquement
4. **tenant_id imposé par JWT** : INSERT WITH CHECK(tenant_id = auth.get_tenant_id()) — jamais depuis le body
5. **Append-only protégé** : UPDATE et DELETE bloqués sur 7 tables (audit_event, ledger_entry, etc.)
6. **service_role bypass** : autorisé UNIQUEMENT si AuditEvent créé AVANT l'opération
7. **Guest token** : limité à sa propre réservation par email JWT — aucun accès finance/agent/audit

---

## Fonctions Helper

```sql
auth.get_tenant_id()      -- UUID depuis JWT app_metadata
auth.get_role()           -- Rôle depuis JWT app_metadata
auth.get_membership_id()  -- UUID membership depuis JWT
auth.is_platform_super_admin()  -- BOOLEAN
auth.has_active_membership(UUID) -- BOOLEAN
```

---

## Pattern d'Isolation Standard

```sql
-- SELECT : tenant isolation stricte
USING (auth.is_platform_super_admin() OR tenant_id = auth.get_tenant_id())

-- INSERT : tenant_id depuis JWT uniquement
WITH CHECK (tenant_id = auth.get_tenant_id() AND auth.has_active_membership(tenant_id))

-- UPDATE : même tenant
USING (tenant_id = auth.get_tenant_id()) WITH CHECK (tenant_id = auth.get_tenant_id())

-- DELETE : toujours bloqué
USING (false)
```

---

## Tests de Validation (12 Tests — 12 PASS)

```
TEST-ISO-001: Tenant A lit Tenant B           → 0 rows ✅
TEST-ISO-002: Tenant A INSERT tenant_id B     → BLOCKED ✅
TEST-ISO-003: Owner A finances Owner B        → 0 rows ✅
TEST-ISO-004: Cleaner → propriété non assignée → 0 rows ✅
TEST-ISO-005: Service Account X-Tenant-ID invalide → 401 ✅
TEST-ISO-006: Guest → réservation autre guest  → 0 rows ✅
TEST-AUTH-001: User Tenant A → Tenant B       → 403 ✅
TEST-AUTH-002: Owner → finances autre owner   → 403 ✅
TEST-AUTH-003: Cleaner → propriété non assignée → 403 ✅
TEST-AUTH-004: Guest → autre réservation      → 403 ✅
TEST-AUTH-005: Service Account invalid header → 401 ✅
TEST-AUTH-006: AI Agent action sans approbation → BLOCKED ✅
```

---

## Conséquences

### Positives
- Isolation garantie au niveau moteur PostgreSQL — indépendante du code applicatif
- 7 contextes couvrent tous les cas d'usage MVP
- Append-only protégé — audit trail inviolable
- Soft delete enforced — conformité RGPD simplifiée

### Risques / Mitigations
- Performance : policies avec JOIN (cleaner, owner) → indexation tenant_id + FK obligatoire
- Oubli d'activation RLS sur nouvelle table → CI check obligatoire à chaque migration
- service_role mal utilisé → Code review + AuditEvent check automatisé

---

## Conditions de Révision

Peut être révisé si :
- Besoin de RLS par colonne (column-level security) → extension additive
- Performance dégradée → views matérialisées ou policies simplifiées avec cache

---

## Décision Gelée

**GELÉE**. Les principes fondamentaux (double défense, DELETE interdit, tenant_id depuis JWT, append-only protégé, service_role audité) ne peuvent pas être remis en question sans nouvel ADR.
