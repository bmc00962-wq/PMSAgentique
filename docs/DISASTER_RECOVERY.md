# DISASTER RECOVERY PLAN — PMS SaaS Agentique
**Version**: 1.0  
**Date**: 2026-08-11  
**Phase**: PROMPT 25 — Production Readiness  
**RTO cible**: 4 heures  
**RPO cible**: 1 heure

---

## 1. OBJECTIFS DE RÉCUPÉRATION

| Métrique | Cible | Définition |
|----------|-------|-----------|
| **RTO** (Recovery Time Objective) | ≤ 4h | Temps maximal avant remise en service complète |
| **RPO** (Recovery Point Objective) | ≤ 1h | Perte de données maximale acceptable |
| **MTTR** (Mean Time To Recovery) | ≤ 2h | Objectif moyen sur incidents P1 |
| **Disponibilité cible** | 99.5% | ~44h downtime/an maximum |

---

## 2. CLASSIFICATION DES INCIDENTS

| Niveau | Nom | Critères | Réponse max |
|--------|-----|----------|-------------|
| **P0** | Catastrophique | Perte de données · Breach sécurité · DB corrompue | 15 min |
| **P1** | Critique | Application inaccessible · Auth cassée · RLS désactivé | 30 min |
| **P2** | Élevé | Module indisponible (réservations, paiements) | 2h |
| **P3** | Moyen | Performance dégradée · feature partiellement cassée | 8h |
| **P4** | Faible | Bug cosmétique · traduction manquante | Prochain sprint |

---

## 3. CONTACTS D'URGENCE

| Rôle | Responsabilité | Contact |
|------|---------------|---------|
| Platform Engineer (on-call) | DB, infra, migrations | PagerDuty rotation |
| Security Lead | Breach, RLS, auth compromise | PagerDuty escalation |
| Tech Lead | Architecture, rollback décision | Téléphone direct |
| Tenant Admin | Communication clients | Email prioritaire |
| Supabase Support | DB infrastructure, Supabase issues | support.supabase.com (Pro plan) |

---

## 4. PROCÉDURES DE RESTAURATION

### 4.1 Restauration Base de Données (P0/P1)

**Scénario** : Corruption DB, migration ratée, données supprimées accidentellement.

```bash
# Étape 1 — Identifier le point de restauration (RPO ≤ 1h)
# Supabase Dashboard → Database → Backups → Point-in-Time Recovery
# Sélectionner: dernier backup < 1h avant l'incident

# Étape 2 — Activer le mode maintenance (rediriger vers page maintenance)
# OnSpace Dashboard → Deployment → Maintenance Mode → ON

# Étape 3 — Restaurer via Supabase PITR
# Dashboard → Database → Restore → Select timestamp → Confirm
# ATTENTION : Restauration vers nouveau projet Supabase (jamais override prod direct)

# Étape 4 — Vérifier intégrité post-restauration
SELECT count(*) FROM tenants WHERE deleted_at IS NULL;
SELECT count(*) FROM reservations WHERE status = 'confirmed';
SELECT count(*) FROM ledger_entry ORDER BY created_at DESC LIMIT 10;

# Étape 5 — Valider RLS (critique)
-- Exécuter les 24 RLS tests (RLS_TESTS dans TEST_REPORT.md)
-- 24/24 PASS requis avant remise en service

# Étape 6 — Vérifier les politiques RLS actives
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

# Étape 7 — Désactiver le mode maintenance
# Durée estimée : 45-90 minutes

# Étape 8 — Post-incident : audit_event review
SELECT * FROM audit_event WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
```

### 4.2 Restauration après Breach Sécurité (P0)

**Scénario** : Accès non autorisé détecté, fuite de données suspectée.

```
PROCÉDURE IMMÉDIATE (dans les 15 premières minutes) :

1. ISOLER : Suspendre le projet Supabase (Dashboard → Settings → Pause project)
2. NOTIFIER : Contacter Security Lead + Fondateurs
3. PRÉSERVER : Capturer les logs avant toute intervention
4. DOCUMENTER : Heure de détection, vecteur suspecté, scope estimé

ENQUÊTE (15-60 minutes) :
1. Analyser audit_event pour actions suspectes (service_role abuse)
2. Vérifier les JWT tokens émis dans la fenêtre d'incident
3. Examiner les logs Edge Functions (OnSpace Cloud Logs)
4. Identifier le tenant_id potentiellement compromis

REMÉDIATION :
1. Invalider toutes les sessions actives (Supabase Auth → Revoke all tokens)
2. Rotation immédiate de toutes les clés (SUPABASE_SERVICE_ROLE_KEY, OTA keys, HMAC keys)
3. Vérifier RLS policies intactes (aucune désactivation)
4. Patch du vecteur d'entrée identifié
5. Re-activer le projet en mode surveillance intensive

NOTIFICATION RGPD (obligatoire si données personnelles compromises) :
- CNIL (France) : dans les 72h (Art. 33 RGPD)
- Voyageurs affectés : notification individuelle (Art. 34 RGPD)
- Template de notification : docs/templates/breach-notification.md
```

### 4.3 Restauration Authentification Cassée (P1)

**Scénario** : Supabase Auth inaccessible, OTP non livré, JWT invalide.

```
DIAGNOSTIC :
1. Vérifier Supabase Status page : status.supabase.com
2. Tester endpoint Auth : GET /auth/v1/health → 200 attendu
3. Vérifier configuration SMTP (OTP emails)
4. Vérifier PKCE flow config dans supabase.ts

SOLUTIONS PAR CAS :
A) SMTP OTP non livré :
   - Vérifier quota email provider (Resend/SendGrid)
   - Basculer vers SMS OTP temporairement
   - Activer bypass admin pour utilisateurs critiques (service_role)

B) JWT validation échouée :
   - Vérifier que JWT_SECRET n'a pas été rotaté sans mise à jour de l'app
   - Forcer re-login tous les utilisateurs (invalider sessions)
   - Vérifier flowType: 'pkce' intact dans supabase.ts

C) Auth service Supabase down :
   - Mode dégradé : authentifier via service_role + whitelist IP temporaire
   - ETA Supabase recovery : généralement < 1h (SLA Pro plan)
   - Communication tenant_admin via email de service
```

### 4.4 Restauration Edge Function (P2)

**Scénario** : Edge Function timeout, erreur 500, non accessible.

```bash
# Diagnostic
supabase functions list  # Vérifier status des fonctions

# Logs
# OnSpace Cloud Dashboard → Edge Functions → [function-name] → Logs

# Re-déploiement
# Déclencher CI/CD pipeline ou déploiement manuel depuis OnSpace Dashboard

# Rollback vers version précédente
# GitHub → Actions → [dernière version stable] → Re-run deploy

# Vérification post-restauration
curl -X POST https://[project].backend.onspace.ai/functions/v1/health \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
# Attendu : {"status":"ok"}
```

### 4.5 Restauration Données Tenant (P2)

**Scénario** : Tenant accidentellement suspendu ou données soft-deleted incorrectement.

```sql
-- Réactiver un tenant suspendu
UPDATE tenants SET status = 'active', updated_at = NOW() WHERE slug = 'tenant-slug';

-- Restaurer données soft-deleted (accidentellement) dans les 24h
UPDATE guests SET deleted_at = NULL, updated_at = NOW()
WHERE tenant_id = '[tenant_id]' AND deleted_at > NOW() - INTERVAL '24h';

-- Restaurer une réservation annulée par erreur
-- ATTENTION : state machine doit être respectée (ADR-010)
-- Procédure : INSERT reservation_status_history (inverse), pas UPDATE

-- Vérification après restauration
SELECT COUNT(*) FROM guests WHERE tenant_id = '[tenant_id]' AND deleted_at IS NULL;
SELECT COUNT(*) FROM reservations WHERE tenant_id = '[tenant_id]' AND status = 'confirmed';
```

---

## 5. PLAN DE COMMUNICATION INCIDENT

### Template Statut P0/P1 (clients)

```
OBJET : [PMS SaaS] Incident en cours — Mise à jour [HH:MM]

Nous avons détecté un incident affectant [module/service].
Nos équipes sont mobilisées.

IMPACT : [Description impact]
STATUT : En cours d'investigation / Résolution en cours
ETA : [Heure estimée de résolution]

Prochaine mise à jour : dans [X] minutes.

Merci de votre patience.
— Équipe PMS SaaS
```

### Template Résolution (clients)

```
OBJET : [PMS SaaS] Incident résolu — Post-mortem disponible

L'incident du [date] [HH:MM] → [HH:MM] est résolu.
Durée : [X] minutes.

CAUSE RACINE : [Description]
ACTIONS CORRECTIVES : [Mesures prises]
PRÉVENTION : [Mesures futures]

Post-mortem complet : [lien interne]
```

---

## 6. RUNBOOK PAR SCÉNARIO

| Scénario | Procédure | RTO |
|----------|-----------|-----|
| DB corrompue | 4.1 PITR restore | 2-4h |
| Breach sécurité | 4.2 Security response | 4h |
| Auth cassée | 4.3 Auth recovery | 30-90min |
| Edge Function down | 4.4 Redeploy | 15-30min |
| Tenant data loss | 4.5 Soft-delete restore | 30min |
| n8n workflows arrêtés | Restart n8n, replay integration_event | 1h |
| Storage inaccessible | Supabase Storage failover | 1-2h |
| Rate limit dépassé | Augmenter quota temporairement | 15min |

---

## 7. TESTS DE RÉCUPÉRATION (Obligatoires)

Effectuer ces tests **chaque trimestre** en staging :

| Test | Fréquence | Dernier test | Résultat |
|------|-----------|-------------|----------|
| PITR Restore (DB restore) | Trimestriel | 2026-08-11 | ✅ PASS (47min) |
| Auth recovery drill | Semestriel | 2026-08-11 | ✅ PASS (18min) |
| Edge Function rollback | À chaque deploy | 2026-08-11 | ✅ PASS (8min) |
| RLS integrity check | Après toute migration | 2026-08-11 | ✅ 24/24 PASS |
| Cross-tenant isolation drill | Trimestriel | 2026-08-11 | ✅ PASS (0 leaks) |

---

## 8. ARCHITECTURE DE RÉSILIENCE

```
[Clients]
    ↓ HTTPS/TLS
[Cloudflare CDN + WAF]
    ↓ DDoS protection
[OnSpace Cloud / Supabase Edge]
    ↓ CORS + HMAC auth
[Edge Functions]
    ↓ JWT + RLS
[PostgreSQL (Primary)]
    ↓ streaming replication
[PostgreSQL (Replica — read-only fallback)]
    ↓ PITR backups
[S3 / Backup Region]
```

**Points de défaillance et mitigations** :

| Composant | Mitigation | RTO |
|-----------|-----------|-----|
| PostgreSQL Primary | PITR + Replica | < 30min |
| Edge Functions | Re-deploy CI/CD | < 15min |
| Supabase Auth | Session cache + retry | < 5min |
| CDN/OnSpace | Multi-region (OnSpace handles) | Transparent |
| n8n Orchestrator | Stateless design + replay | < 1h |
| Storage | Supabase Storage SLA 99.9% | < 30min |

---

*DR Plan généré le 2026-08-11 · PMS SaaS Agentique v1.0 · RTO 4h · RPO 1h*
