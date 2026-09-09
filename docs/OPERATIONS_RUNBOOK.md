# OPERATIONS RUNBOOK — PMS SaaS Agentique
**Version**: 1.0  
**Date**: 2026-08-11  
**Phase**: PROMPT 25 — Production Readiness

---

## 1. OPÉRATIONS QUOTIDIENNES

### 1.1 Checklist Matin (9h00)

```
□ Supabase Dashboard : vérifier status DB (CPU < 70%, connections < 80%)
□ OnSpace Cloud Logs : aucune erreur Edge Function critique (< 1% error rate)
□ ReportsPage → Platform Health : tous services GREEN
□ Pending Approvals (/approvals) : traiter expirations (< 2h restantes)
□ n8n Workflows : W-00 à W-13 tous ACTIVE (W-13 vérifier si approval reçue)
□ Queued notifications (backlog < 100 messages)
□ Storage quota : < 80%
□ Vérifier backup de la nuit : status SUCCESS
```

### 1.2 Checklist Soir (18h00)

```
□ Review audit_event : aucune action service_role non planifiée
□ AgentRun failed/timeout : identifier et résoudre
□ Rate limit alerts : aucun tenant en alerte (seuil 80% quota)
□ Erreurs TypeScript/build en staging : 0 erreur
□ Review ApprovalRequest expirées du jour : déléguer si nécessaire
```

### 1.3 Checklist Hebdomadaire (Lundi 9h)

```
□ Rapport sécurité : vérifier 0 nouveaux CVE critiques dans les dépendances
□ Revue des feature flags : aucun flag stuck en rollout
□ Rotation des logs (archiver > 90 jours vers cold storage)
□ Test webhook HMAC-SHA256 (staging)
□ Mise à jour des dépendances (patch level uniquement)
□ Review MRR / churn (ReportsPage → Platform → Métriques)
□ Vérifier TTL des smart lock codes (aucun code expiré actif)
```

---

## 2. DÉPLOIEMENT EN PRODUCTION

### 2.1 Procédure Standard

```
Pré-requis :
□ PRODUCTION_CHECKLIST.md complétée (100%)
□ Test E2E staging : 10/10 PASS (§11 de PRODUCTION_CHECKLIST.md)
□ Code review approuvé (≥ 2 reviewers)
□ ADR impacts identifiés (aucun ADR gelé violé)

Étapes :
1. Tag de version : git tag v1.x.y && git push origin v1.x.y
2. CI pipeline → build → lint → type-check → PASS
3. Deploy staging automatique → smoke tests (5 min)
4. Approbation manuelle : Tech Lead + Platform Engineer
5. Deploy production via OnSpace Dashboard
6. Health check : /api/health → 200 OK
7. Smoke test production (5 scénarios E2E critiques)
8. Mise à jour CHANGELOG.md

Rollback automatique si :
- Health check échoue dans les 5 min post-deploy
- Error rate > 5% dans les 15 min post-deploy
- Durée rollback : < 3 minutes (redéploiement version précédente)
```

### 2.2 Déploiement Edge Functions

```bash
# Déploiement via CI/CD (recommandé)
# GitHub Actions → workflow "deploy-edge-functions" → manual trigger

# Déploiement manuel (urgence)
# OnSpace Dashboard → Edge Functions → [function] → Deploy

# Vérification post-déploiement
curl -X POST https://[project].backend.onspace.ai/functions/v1/[function-name] \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Attendu : {"status":"ok"} ou résultat métier valide
```

### 2.3 Migration de Schéma

```
RÈGLES IMMUABLES (ADR-006) :
✗ JAMAIS DROP TABLE, DROP COLUMN, TRUNCATE en production
✗ JAMAIS modifier une migration existante
✗ JAMAIS désactiver RLS sur une table

Procédure migration :
1. Créer migration dans supabase/migrations/ (numérotée séquentiellement)
2. Tester en local : supabase db reset
3. Tester en staging : apply migration → 24 RLS tests PASS
4. Backup DB production avant migration
5. Appliquer via Supabase Dashboard → Database → Migrations
6. Vérifier RLS policies post-migration (pg_policies)
7. Documenter dans CHANGELOG.md

Rollback migration :
- Écrire migration INVERSE (jamais supprimer la migration originale)
- Tester rollback en staging avant d'en avoir besoin
```

---

## 3. GESTION DES TENANTS

### 3.1 Onboarding Nouveau Tenant

```sql
-- 1. Créer le tenant (service_role + AuditEvent obligatoire)
INSERT INTO tenants (slug, company_name, contact_email, plan_id, status)
VALUES ('nouveau-slug', 'Société XYZ', 'admin@xyz.com', 'trial', 'trial');

-- 2. Créer le TenantMembership pour l'admin
INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
VALUES ('[tenant_id]', '[user_id]', 'tenant_admin', 'active');

-- 3. Initialiser les quotas
INSERT INTO tenant_quotas (tenant_id, max_properties, max_members, max_storage_gb)
VALUES ('[tenant_id]', 2, 3, 1); -- Plan Trial

-- 4. Vérifier isolation RLS
-- Connexion avec token user → SELECT tenants WHERE id = tenant_id_autre → 0 rows
```

### 3.2 Suspension Tenant

```sql
-- Via SaaS Admin (service_role + AuditEvent)
UPDATE tenants SET status = 'suspended', updated_at = NOW()
WHERE slug = 'tenant-slug';

-- Invalider toutes les sessions (Supabase Auth Admin API)
-- POST /auth/v1/admin/users/{user_id}/logout (pour chaque user du tenant)

-- Notification : envoyer email au contact_email du tenant
```

### 3.3 Upgrade Plan

```sql
-- Mise à jour plan
UPDATE tenants SET plan_id = 'growth', updated_at = NOW()
WHERE slug = 'tenant-slug';

-- Mise à jour quotas
UPDATE tenant_quotas
SET max_properties = 20, max_members = 15, max_storage_gb = 50
WHERE tenant_id = '[tenant_id]';
```

---

## 4. MONITORING AGENTS IA (ADR-019/020)

### 4.1 Surveillance AgentRun

```sql
-- AgentRuns en échec aujourd'hui
SELECT agent_id, status, error_message, started_at
FROM agent_runs
WHERE DATE(started_at) = CURRENT_DATE
AND status IN ('failed', 'timeout', 'blocked')
ORDER BY started_at DESC;

-- Runs awaiting_approval > 4h (risque expiration)
SELECT id, agent_id, tenant_id, started_at,
       NOW() - started_at AS waiting_time
FROM agent_runs
WHERE status = 'awaiting_approval'
AND started_at < NOW() - INTERVAL '4 hours';
```

### 4.2 Approbations en Attente

```sql
-- ApprovalRequests expirant dans les 2 prochaines heures
SELECT id, scenario, title, priority, deadline
FROM approval_requests
WHERE status = 'pending'
AND deadline < NOW() + INTERVAL '2 hours'
AND deadline > NOW()
ORDER BY deadline ASC;

-- Déléguer si approver absent
-- Via /approvals/:id → "Déléguer" button (ADR-020)
```

### 4.3 PromptGuard Alerts

```sql
-- Tentatives d'injection bloquées cette semaine
SELECT agent_id, tenant_id, blocked_patterns, risk_score, created_at
FROM agent_audit_log
WHERE action = 'PROMPT_GUARD_BLOCK'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY risk_score DESC;
```

---

## 5. GESTION INCIDENTS N8N (ADR-016)

### 5.1 Workflow en Erreur

```
Diagnostic :
1. Vérifier integration_event WHERE status = 'failed'
2. Identifier le workflow (W-00 à W-13) et l'étape
3. Vérifier les logs n8n (n8n UI → Executions → failed)
4. Tester manuellement l'Edge Function appelée par n8n

Résolution :
A) Edge Function répond : re-trigger depuis n8n
B) Edge Function down : voir §2.2 (redeploy)
C) HMAC invalide : vérifier rotation des clés (§5.3 PRODUCTION_CHECKLIST)
D) Payload > 1MB : identifier la source, fragmenter

Replay sécurisé (idempotency) :
- integration_event.idempotency_key protège contre le double traitement
- Re-trigger n8n : ON CONFLICT DO NOTHING garantit l'idempotency
```

### 5.2 W-13 Activation (ADR-016, RÈGLE-N8N-007)

```
W-13 est suspendu jusqu'à la validation de l'approval system (PROMPT 20).
Approval system TERMINÉ (ADR-020). W-13 peut être activé.

Procédure d'activation :
1. Vérifier que /approvals est opérationnel (10/10 politiques actives)
2. Tester ApprovalRequest → ApprovalDecision en staging
3. Activer W-13 dans n8n : Workflow → Activate
4. Créer un ApprovalRequest test → valider le flux complet
5. Documenter l'activation dans audit_event (service_role)
```

---

## 6. MAINTENANCE DONNÉES (RGPD)

### 6.1 Anonymisation Automatique (Art. 17 RGPD)

```sql
-- Identifier guests avec données > 3 ans (rétention policy)
SELECT id, first_name, last_name, email, phone, created_at
FROM guests
WHERE deleted_at IS NOT NULL
AND deleted_at < NOW() - INTERVAL '3 years';

-- Anonymisation (soft delete + PII nullification)
UPDATE guests
SET first_name = 'Anonyme', last_name = 'Anonyme',
    email = CONCAT('anon-', id, '@deleted.pms'),
    phone = NULL, notes = NULL,
    updated_at = NOW()
WHERE deleted_at < NOW() - INTERVAL '3 years';

-- Créer AuditEvent pour traçabilité RGPD
INSERT INTO audit_event (tenant_id, action, entity_type, description, created_by)
VALUES (NULL, 'RGPD_ANONYMIZATION', 'guests', 'Anonymisation automatique 3 ans', 'compliance_agent');
```

### 6.2 Export RGPD (droit d'accès)

```sql
-- Export complet données d'un voyageur (Art. 15 RGPD)
SELECT
  g.first_name, g.last_name, g.email, g.phone, g.nationality,
  r.check_in, r.check_out, r.total_amount, r.currency, r.channel,
  c.content, c.channel AS comm_channel, c.sent_at
FROM guests g
LEFT JOIN reservations r ON r.guest_id = g.id
LEFT JOIN messages c ON c.conversation_id IN (
  SELECT id FROM conversations WHERE guest_id = g.id
)
WHERE g.email = 'guest@example.com'
AND g.tenant_id = '[tenant_id]';
```

---

## 7. ON-CALL ROTATION

### 7.1 Niveaux d'Escalade

| Niveau | Déclencheur | Contact | Délai |
|--------|------------|---------|-------|
| L1 (Auto) | Monitoring alert | PagerDuty → on-call engineer | Immédiat |
| L2 (Engineer) | P1/P2 non résolu en 30min | Tech Lead | 30 min |
| L3 (Management) | P0 ou breach | CTO + Fondateurs | 15 min (P0) |

### 7.2 Rotation On-Call

```
Semaine 1 : Engineer A (Lun-Dim)
Semaine 2 : Engineer B (Lun-Dim)
Semaine 3 : Engineer C (Lun-Dim)
...rotation de 3 semaines minimum

Horaires couverts : 24h/7j pour P0/P1
                    8h-20h heure locale pour P2/P3
```

### 7.3 Post-Mortem (obligatoire pour P0/P1)

```
Délai : dans les 48h après résolution
Format :
1. Résumé exécutif (3 lignes max)
2. Chronologie des événements (timestamps précis)
3. Cause racine (5 Pourquoi)
4. Impact (tenants affectés, données, durée)
5. Actions correctives (avec responsable + date)
6. Mesures préventives (avec responsable + date)
7. Révision des ADRs si nécessaire

Stockage : docs/incidents/YYYY-MM-DD-[description].md
```

---

## 8. MÉTRIQUES & SLAs

### 8.1 SLAs par Plan

| Plan | Disponibilité | Support | RTO |
|------|-------------|---------|-----|
| Trial | 99.0% | Email 48h | — |
| Starter | 99.5% | Email 24h | 8h |
| Growth | 99.5% | Email 12h + Chat | 4h |
| Enterprise | 99.9% | 24/7 + Account Manager | 2h |

### 8.2 Métriques Surveillées (ReportsPage → Platform)

| Métrique | Seuil Alerte | Seuil Critique |
|----------|-------------|----------------|
| Error rate API | > 1% | > 5% |
| P95 latency | > 2s | > 5s |
| DB connection pool | > 70% | > 90% |
| Storage utilisation | > 80% | > 95% |
| Auth failures | > 10/min | > 50/min |
| Agent failures | > 5/h | > 20/h |
| Approval expiry rate | > 20% | > 40% |

---

## 9. COMMANDES UTILES

```bash
# Status base de données
# Supabase Dashboard → Database → Health

# Logs Edge Functions (OnSpace Cloud)
# Dashboard → Logs → Edge Functions → [function-name]

# Vérifier migrations appliquées
# Supabase Dashboard → Database → Migrations

# Test health check
curl https://app.gestion-soleil.com/api/health

# Forcer rebuild frontend (OnSpace)
# OnSpace Dashboard → Deploy → Rebuild

# Review RLS policies
SELECT tablename, policyname, cmd, permissive
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, cmd;

# Review agent runs récents
SELECT id, agent_id, status, started_at, completed_at
FROM agent_runs ORDER BY started_at DESC LIMIT 20;

# Compter pending approvals par priorité
SELECT priority, COUNT(*) FROM approval_requests
WHERE status = 'pending' GROUP BY priority;
```

---

*Runbook généré le 2026-08-11 · PMS SaaS Agentique v1.0 · Phase 25 COMPLETED*
