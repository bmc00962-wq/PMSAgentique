# ADR-004 — Modèle de Multitenance (Shared Schema + Row-Level Isolation)

**Date**: 2026-08-09
**Status**: ACCEPTED
**Frozen**: YES
**Décidé en**: PROMPT 03

---

## Contexte

Le PMS SaaS doit servir plusieurs entreprises de gestion locative (tenants) sur une infrastructure partagée. Trois patterns ont été évalués :

1. **Database per tenant** : base PostgreSQL dédiée par tenant
2. **Schema per tenant** : schéma PostgreSQL dédié par tenant
3. **Shared schema, Row-level isolation** : mêmes tables pour tous, isolation par `tenant_id` + RLS

---

## Décision

**Pattern retenu : Shared Database, Shared Schema, Row-Level Isolation via PostgreSQL RLS**

---

## Justification

| Critère | DB/Tenant | Schema/Tenant | Shared+RLS |
|---------|-----------|----------------|------------|
| Coût infrastructure | ❌ Élevé | ⚠️ Moyen | ✅ Optimal |
| Migrations | ❌ N migrations | ⚠️ N migrations | ✅ 1 migration |
| Compatibilité Supabase | ⚠️ Complexe | ⚠️ Support limité | ✅ Natif |
| Isolation sécurité | ✅ Max | ✅ Bonne | ✅ Garantie par moteur |
| Reports cross-tenant | ❌ Impossible | ❌ Complexe | ✅ Natif (Super Admin) |
| Time to market | ❌ Long | ⚠️ Moyen | ✅ Rapide |
| Evolution Enterprise | ✅ Simple | ✅ Simple | ✅ Migration possible |

---

## Principes Fondamentaux (GELÉS)

1. `tenant_id UUID NOT NULL` sur toutes les tables métier
2. RLS activé sur toutes les tables tenant-specific
3. `tenant_id` provient **exclusivement** du contexte authentifié
4. `resolveTenantContext()` est la fonction canonique unique de résolution
5. Storage isolé par préfixe `tenant-{tenant_id}/`
6. Secrets chiffrés par tenant, jamais exposés au frontend
7. Rate limiting par tenant sur tous les endpoints

---

## Règle Absolue — Sources du tenant_id

```
✅ VALIDE:
  • JWT claim (Supabase Auth)
  • TenantMembership lookup (user_id → tenant_id)
  • Domain résolution (Host header → TenantDomain → tenant_id)
  • Service Account (X-Tenant-ID header validé serveur)

❌ INTERDIT:
  • Formulaire frontend
  • Query param non validé
  • Body non authentifié
```

---

## Conséquences

### Positives
- Infrastructure optimale pour 1 à 1000 tenants sans surcoût
- Migrations centralisées — un seul fichier SQL pour tous
- RLS PostgreSQL garantit l'isolation au niveau moteur
- Compatible natif OnSpace Cloud / Supabase
- Super Admin peut faire des queries cross-tenant (monitoring)

### Négatives / Risques
- Discipline stricte requise (tenant_id sur chaque table)
- Erreur de RLS = fuite cross-tenant (mitigation : tests ISO obligatoires)
- Base unique = contention potentielle à très grande échelle (mitigation : migration Enterprise vers DB dédiée si nécessaire)

---

## Évolution Enterprise (V2)

Pour les tenants Enterprise, migration possible vers une infrastructure dédiée sans changer le code métier :
- Export snapshot tenant
- Provision PostgreSQL dédié
- Restauration + validation
- Basculement transparent

---

## Conditions de Révision

Peut être révisé si :
- Un client Enterprise exige une isolation physique totale (→ DB dédiée)
- Les performances globales se dégradent à >500 tenants actifs simultanément

---

## Décision Gelée

**GELÉE**. Les principes fondamentaux (tenant_id obligatoire, source auth context uniquement, RLS) ne peuvent pas être remis en question sans nouvel ADR + plan de migration complet.
