# ADR-005 — RBAC Granulaire + canUserPerform()

**Date**: 2026-08-09
**Status**: ACCEPTED
**Frozen**: YES
**Décidé en**: PROMPT 04

---

## Contexte

Le PMS SaaS multitenant nécessite un modèle d'autorisation qui :
- Supporte 12 rôles distincts avec des périmètres variés (tenant, propriété, opération)
- Garantit l'isolation tenant (aucun accès cross-tenant)
- Permet des permissions granulaires par domaine métier
- Valide les autorisations côté serveur **uniquement**

---

## Décision

1. **Supabase Auth** — authentification (email/password + OTP pour MVP)
2. **RBAC granulaire** — ~88 permissions sur 21 domaines
3. **`canUserPerform()`** — fonction canonique unique d'autorisation (serveur seulement)
4. **JWT Claims** — `tenant_id` + `role` + `membership_id` injectés par Supabase Auth
5. **Permissions effectives** = permissions du rôle + overrides JSONB - permissions retirées

---

## Principes Gelés

1. Le **frontend ne décide jamais** si une action est autorisée
2. `canUserPerform()` est appelé dans **chaque Edge Function** avant toute mutation
3. `tenant_id` dans le JWT provient **exclusivement** de TenantMembership validée
4. AI Agent = permissions définies par `AgentPolicy` uniquement, jamais hard-coded
5. Service Account = Bearer token + `X-Tenant-ID` header validé serveur
6. Toute action du `platform_super_admin` génère un `AuditEvent` obligatoire

---

## Conséquences

### Positives
- Double validation : `canUserPerform()` (logique) + RLS (moteur DB)
- Flexibilité : `permissions_override JSONB` permet des cas spéciaux sans nouveaux rôles
- Auditabilité : actions sensibles tracées
- Extension : custom roles V1 via table `MembershipRole`

### Risques
- Discipline requise : chaque Edge Function doit appeler `canUserPerform()`
- Oubli de l'appel = faille de sécurité (mitigation : code review + test AUTH-00x)

---

## Conditions de Révision

Peut être révisé si :
- Besoin de permissions dynamiques par ressource (→ ABAC partiel)
- Adoption d'un service IAM dédié (ex: OPA) pour la scalabilité

---

## Décision Gelée

**GELÉE**. Les principes fondamentaux (server-side only, `canUserPerform()` obligatoire, JWT claims) ne peuvent pas être remis en question sans nouvel ADR + plan de migration.
