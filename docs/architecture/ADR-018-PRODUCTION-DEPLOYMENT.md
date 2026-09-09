# ADR-018 — Production & Déploiement : Configuration Tenant & SaaS Admin

**Statut** : FROZEN 🔒  
**Date** : 2026-08-10  
**PROMPT** : 18 — Production & Déploiement  

---

## Contexte

Le PMS SaaS est désormais fonctionnel sur 18 phases (ADR-001 à ADR-017). La phase de production couvre la configuration tenant en libre-service, le panneau SaaS Admin pour la gestion des comptes, et les conventions d'environnement pour le déploiement.

---

## Décision

**La configuration tenant est gérée via un formulaire dédié `/settings` (Zod + React Hook Form) avec persistence dans `tenant_settings`. Le panneau `/saas-admin` est accessible uniquement aux `platform_super_admin` et utilise le contexte auth pour bypass RLS.**

---

## Règles Permanentes

### RÈGLE-PROD-001 — Secrets jamais exposés au frontend
Variables sensibles (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `N8N_WEBHOOK_SECRET`) : côté serveur uniquement, jamais dans le bundle React.

### RÈGLE-PROD-002 — tenant_id depuis auth context uniquement
Même sur la page `/settings`, le `tenant_id` est résolu via `resolveTenantContext()` — jamais depuis un paramètre URL ou un champ de formulaire (ADR-004).

### RÈGLE-PROD-003 — canUserPerform() pour toute mutation
Toute modification de `tenant_settings` appelle `canUserPerform(user, tenant, 'tenant:update_settings')`. Seuls `tenant_admin` et `platform_super_admin` peuvent modifier la configuration.

### RÈGLE-PROD-004 — SaaS Admin bypass RLS via service_role
`/saas-admin` utilise le contexte `edge_function` (service_role) avec un `AuditEvent` obligatoire avant chaque opération cross-tenant (ADR-007).

### RÈGLE-PROD-005 — Soft delete et lifecycle tenant
La suspension et suppression de tenants suivent le lifecycle défini : `active → suspended → pending_deletion → deleted`. Jamais de suppression physique immédiate (ADR-006).

### RÈGLE-PROD-006 — Configuration CORS et rate limiting
- CORS: origines autorisées depuis `tenant_domain` uniquement
- Rate limiting: 100 req/min par `membership_id`, 10 req/min par IP anonyme
- Webhooks n8n: HMAC-SHA256 validé côté Edge Function (ADR-016)

---

## Configuration d'environnement

```env
# Supabase (obligatoires)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>

# Stripe (V1 - optionnel MVP)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# n8n (côté serveur uniquement - Edge Function secrets)
N8N_BASE_URL=https://<n8n>.onspace.app
N8N_WEBHOOK_SECRET=<hmac_secret>

# Monitoring (V1)
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
```

---

## Plans tarifaires

| Plan | Propriétés | Unités | Membres | Stockage | Prix/mois |
|------|-----------|--------|---------|---------|-----------|
| Trial | 2 | 5 | 2 | 1 GB | Gratuit |
| Starter | 10 | 25 | 5 | 10 GB | 149 CAD |
| Growth | 50 | 150 | 20 | 100 GB | 399 CAD |
| Enterprise | ∞ | ∞ | ∞ | 1 TB | Sur devis |

---

## Checklist de déploiement

- [ ] Variables d'environnement configurées
- [ ] RLS activé sur 74 tables (ADR-007)
- [ ] Supabase Auth email templates configurés
- [ ] Stripe Webhooks enregistrés (V1)
- [ ] n8n Workflows W-00→W-12 activés (W-13 après validation)
- [ ] CORS configuré pour domaines tenant
- [ ] Monitoring Sentry activé
- [ ] Backups PostgreSQL planifiés (quotidiens + WAL)
- [ ] CDN pour Supabase Storage (images propriétés)
- [ ] Alerte erreur Slack/email pour W-09 (ménage post-départ)

---

## Conséquences

**Positif :** Onboarding en libre-service · SaaS Admin centralisé · Quotas appliqués côté backend · Lifecycle tenant traceable.

**Négatif :** Configuration OTA non automatisée (nécessite clés API manuelles) · Pas de SSO en MVP.

**Mitigations :** Wizard d'onboarding V1 · SSO SAML V2 · OAuth apps OTA V2.

---

*Ce document est FROZEN. Toute modification nécessite un nouveau ADR.*
