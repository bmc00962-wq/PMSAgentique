# ADR-006 — Stratégie de Versioning du Schéma (Migrations Immuables)

**Date**: 2026-08-09
**Status**: ACCEPTED
**Frozen**: YES
**Décidé en**: PROMPT 05

---

## Contexte

Le modèle de données V1 contient 80 tables réparties sur 15 domaines. Un SaaS multitenant en production nécessite une stratégie d'évolution du schéma qui garantit :
- L'intégrité des données de tous les tenants
- La traçabilité complète des changements
- La capacité de rollback en cas d'erreur
- La compatibilité ascendante

---

## Décision

**Migrations séquentielles immuables avec numérotation horodatée.**

---

## Principes Gelés

### 1. Immuabilité des migrations
```
✅ Créer un nouveau fichier de migration pour chaque changement
✅ Numérotation : YYYYMMDD_HHMMSS_description.sql
✅ Chaque migration = une transaction atomique
✅ Appliquer sequentially — jamais en parallèle

✗ Jamais modifier une migration déjà appliquée en production
✗ Jamais supprimer un fichier de migration
```

### 2. Opérations interdites en production
```
✗ DROP TABLE          → utiliser deleted_at TIMESTAMPTZ (soft delete)
✗ DROP COLUMN         → utiliser deprecated_at ou renommage
✗ TRUNCATE            → jamais en production
✗ Modifier une contrainte CHECK existante sans migration additive
```

### 3. Opérations autorisées
```
✅ ALTER TABLE ... ADD COLUMN (nullable ou avec DEFAULT)
✅ CREATE INDEX CONCURRENTLY
✅ ALTER TABLE ... ADD CONSTRAINT (nouveau)
✅ CREATE TABLE (nouvelles tables)
✅ ALTER TABLE ... ALTER COLUMN SET DEFAULT
```

### 4. Versioning optimiste
```sql
-- Toutes les entités métier modifiables
version INTEGER NOT NULL DEFAULT 1

-- Contrôle de concurrence dans les updates
UPDATE reservation
SET status = 'confirmed', version = version + 1
WHERE id = $1 AND version = $2
-- Si 0 rows → conflit de version → retry
```

### 5. Valeurs monétaires
```sql
-- TOUJOURS NUMERIC(12,4) — jamais FLOAT, jamais DOUBLE PRECISION
amount NUMERIC(12,4) NOT NULL
-- 12 digits total, 4 décimales → max 99,999,999.9999 dans n'importe quelle devise
```

### 6. Soft Delete
```sql
-- Entités critiques avec soft delete
deleted_at TIMESTAMPTZ DEFAULT NULL

-- Requêtes standards
WHERE deleted_at IS NULL

-- RLS policy inclut automatiquement la vérification
```

---

## Structure des Migrations

```
/migrations
  20260809_000001_initial_saas_domain.sql
  20260809_000002_identity_domain.sql
  20260809_000003_owner_property_domain.sql
  20260809_000004_channel_calendar_domain.sql
  20260809_000005_reservation_domain.sql
  20260809_000006_communication_domain.sql
  20260809_000007_operations_domain.sql
  20260809_000008_transport_maintenance_domain.sql
  20260809_000009_access_finance_domain.sql
  20260809_000010_agentic_governance_domain.sql
  20260809_000011_rls_policies.sql  -- PROMPT 06
  20260809_000012_seed_system_data.sql
```

---

## Convention des Migrations

```sql
-- En-tête obligatoire dans chaque fichier
-- Migration: 20260809_000001
-- Description: Initial SaaS domain — tenant, plan, subscription, feature, usage_metric
-- Author: system
-- Date: 2026-08-09
-- Reversible: NO (tenant is root — see soft delete policy)

BEGIN;

-- DDL statements here

COMMIT;
```

---

## Conséquences

### Positives
- Historique complet et auditable de toutes les évolutions du schéma
- Déploiements zero-downtime avec ADD COLUMN nullable
- Compatible avec Supabase migration system
- Rollback possible via migration compensatrice

### Risques / Mitigations
- Accumulation de colonnes "soft deleted" → mitigé par revue périodique + archivage V2
- Migrations longues sur grandes tables → utiliser `CREATE INDEX CONCURRENTLY`

---

## Conditions de Révision

Peut être révisé si :
- Adoption d'un outil de migration dédié (Flyway, Liquibase) nécessitant un format différent
- Besoin de migrations bidirectionnelles (up/down) — ajouter section `-- DOWN:` optionnelle

---

## Décision Gelée

**GELÉE**. Les principes fondamentaux (immuabilité, no DROP, soft delete, NUMERIC(12,4)) ne peuvent pas être remis en question sans nouvel ADR.
