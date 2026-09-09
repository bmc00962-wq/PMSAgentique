# DECISIONS LOG

Ce fichier enregistre toutes les décisions architecturales, produit et techniques prises pendant le projet.

## Format

```
### ADR-XXX — [TITLE]
- **Date**: YYYY-MM-DD
- **Status**: PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
- **Context**: Why this decision was needed
- **Decision**: What was decided
- **Consequences**: What this means going forward
- **Frozen**: YES | NO
```

---

## Décisions

### ADR-001 — Architecture Modular Monolith
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: 23 domaines métier à organiser. Choix entre Microservices et Modular Monolith pour le MVP + V1.
- **Decision**: Architecture Modular Monolith — un seul déploiement, modules avec frontières strictes, interfaces claires.
- **Consequences**: Développement plus rapide, frontières claires, migration future vers microservices non bloquée. Discipline requise pour maintenir l'isolation des modules.
- **Frozen**: YES
- **Détail**: [ADR-001-MODULAR-MONOLITH.md](./architecture/ADR-001-MODULAR-MONOLITH.md)

---

### ADR-002 — Backend Supabase / PostgreSQL
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: Choix de la base de données et des services backend pour le PMS multitenant.
- **Decision**: Supabase + PostgreSQL comme backend principal. Auth, Storage, Realtime, Edge Functions via Supabase. RLS pour l'isolation tenant.
- **Consequences**: Infrastructure gérée, RLS natif, isolation tenant garantie au niveau moteur. Dépendance à Supabase.
- **Frozen**: YES
- **Détail**: [ADR-002-SUPABASE-POSTGRESQL.md](./architecture/ADR-002-SUPABASE-POSTGRESQL.md)

---

### ADR-003 — n8n comme Moteur d'Orchestration (Non Source de Vérité)
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: Besoin d'un moteur de workflow pour orchestrer les processus opérationnels complexes.
- **Decision**: n8n est utilisé comme moteur d'orchestration. Il passe toujours par les APIs internes sécurisées du PMS. Il n'accède jamais directement à PostgreSQL. Il n'est jamais une source de vérité.
- **Consequences**: Workflows visuels, séparation claire, retry centralisé. Nécessite une infrastructure n8n dédiée.
- **Frozen**: YES
- **Détail**: [ADR-003-N8N-ORCHESTRATION.md](./architecture/ADR-003-N8N-ORCHESTRATION.md)

---

### ADR-004 — Multitenance Shared Schema + Row-Level Isolation
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: Choix du pattern de multitenance pour un PMS SaaS multi-clients partageant la même infrastructure.
- **Decision**: Shared database, shared schema, isolation par `tenant_id UUID NOT NULL` + PostgreSQL RLS. Le `tenant_id` provient toujours du contexte authentifié (JWT, TenantMembership, domaine, service account), jamais d'un formulaire frontend.
- **Consequences**: Coût infrastructure optimal, migrations centralisées, isolation garantie au niveau moteur PostgreSQL. Discipline stricte requise sur resolveTenantContext(). Migration Enterprise vers DB dédiée possible en V2.
- **Frozen**: YES
- **Détail**: [ADR-004-MULTITENANT-MODEL.md](./architecture/ADR-004-MULTITENANT-MODEL.md)

---

### ADR-005 — RBAC Granulaire + canUserPerform()
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: Le PMS nécessite un modèle d'autorisation supportant 12 rôles distincts, des permissions granulaires par domaine et une validation strictement côté serveur.
- **Decision**: Supabase Auth (email/password + OTP MVP). RBAC avec ~88 permissions sur 21 domaines. `canUserPerform()` comme fonction canonique unique d'autorisation. JWT Claims : `tenant_id` + `role` + `membership_id`. Le frontend ne décide jamais.
- **Consequences**: Double validation (canUserPerform + RLS). Flexibilité via `permissions_override JSONB`. Auditabilité des actions sensibles. Custom roles V1 via MembershipRole.
- **Frozen**: YES
- **Détail**: [ADR-005-RBAC.md](./architecture/ADR-005-RBAC.md)

---

### ADR-006 — Stratégie de Versioning du Schéma (Migrations Immuables)
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: Modèle de données V1 avec 80 tables sur 15 domaines. Stratégie d'évolution du schéma pour un SaaS multitenant en production.
- **Decision**: Migrations séquentielles immuables. Jamais d'édition après application. Pas de DROP TABLE/COLUMN en prod. Soft delete + ALTER ADD. version INTEGER pour optimistic locking. NUMERIC(12,4) pour valeurs monétaires.
- **Consequences**: Schéma évolutif sans rupture. Auditabilité complète. Discipline requise (pas d'édition de migrations existantes).
- **Frozen**: YES
- **Détail**: [ADR-006-SCHEMA-VERSIONING.md](./architecture/ADR-006-SCHEMA-VERSIONING.md)

---

### ADR-008 — Application Foundation (Architecture Frontend + Service Layer)
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: Structure applicative concrète pour les 23 modules : répertoires, couche service, abstractions, i18n (fr/en/ar + RTL), routing React Router, types TypeScript alignés sur le data model, composants UI réutilisables.
- **Decision**: Architecture en couches UI → Application Service → Repository → Supabase. canUserPerform() toujours côté Edge Function (jamais React). i18n via useI18n() hook avec localStorage persistence. Stubs pour toutes les dépendances backend.
- **Consequences**: Séparation claire et testable. RTL supporté dès la fondation. Migration progressive vers vraie implémentation Supabase. Modules verrouillés dans la sidebar jusqu'à leur implémentation (PROMPT 08+).
- **Frozen**: YES
- **Détail**: [ADR-008-APP-FOUNDATION.md](./architecture/ADR-008-APP-FOUNDATION.md)

---

### ADR-007 — Stratégie RLS (Policies par Contexte + Double Défense)
- **Date**: 2026-08-09
- **Status**: ACCEPTED
- **Context**: 74 tables tenant-specific à protéger. Définition des policies RLS concrètes pour 7 contextes d'accès (Tenant User, Owner, Cleaner, Driver, Guest, Service Account, Edge Function).
- **Decision**: Double défense canUserPerform() + RLS. 7 contextes avec policies SELECT/INSERT/UPDATE/DELETE dédiées. DELETE physique interdit (USING false). service_role bypass autorisé uniquement si AuditEvent créé. 12 tests de sécurité obligatoires : 12/12 PASS.
- **Consequences**: Isolation physique garantie par le moteur PostgreSQL. Append-only protégé (audit_event, ledger_entry, etc.). soft delete enforced. Indexation FK + tenant_id obligatoire pour performance.
- **Frozen**: YES
- **Détail**: [ADR-007-RLS-STRATEGY.md](./architecture/ADR-007-RLS-STRATEGY.md)

---

## Index des Décisions Gelées

| ADR | Titre | Date | Gelée |
|-----|-------|------|-------|
| ADR-001 | Modular Monolith | 2026-08-09 | ✅ OUI |
| ADR-002 | Supabase/PostgreSQL Backend | 2026-08-09 | ✅ OUI |
| ADR-003 | n8n Orchestration (non source de vérité) | 2026-08-09 | ✅ OUI |
| ADR-004 | Multitenance Shared Schema + RLS | 2026-08-09 | ✅ OUI |
| ADR-005 | RBAC Granulaire + canUserPerform() | 2026-08-09 | ✅ OUI |
| ADR-006 | Migrations Immuables (Schema Versioning) | 2026-08-09 | ✅ OUI |
| ADR-007 | RLS Strategy — 7 Contextes + Double Défense | 2026-08-09 | ✅ OUI |
| ADR-008 | Application Foundation — Service Layer + i18n + Architecture Frontend | 2026-08-09 | ✅ OUI |

---

## Décisions en attente

| Phase | Décision attendue |
|-------|------------------|
| PROMPT 09 | ADR-009 — Contrôle de concurrence calendrier (optimistic locking) |
| PROMPT 11 | ADR-010 — Niveaux d'intégration canaux (Level 1/2/3) |
| PROMPT 17 | ADR-011 — IPaymentProvider (Stripe premier provider) |
| PROMPT 19 | ADR-012 — Architecture agentique (Tool Registry + Policy Engine) |
