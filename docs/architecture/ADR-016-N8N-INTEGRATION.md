# ADR-016 — Intégration n8n

**Status**: FROZEN 2026-08-10  
**Décideurs**: Architecture Committee  
**Décision**: n8n = moteur d'orchestration uniquement · jamais source de vérité · jamais accès DB direct · toutes les actions via PMS Edge Functions sécurisées

---

## Contexte

Le PMS SaaS nécessite l'automatisation de 14 workflows couvrant :
- Synchronisation calendrier et import réservations OTA
- Notifications (voyageur, housekeeper, chauffeur, propriétaire)
- Création automatique de jobs ménage et tickets maintenance
- Génération de relevés financiers
- Pipeline d'actions agents IA avec supervision humaine

La règle ADR-003 (FROZEN) établit que n8n est un orchestrateur. Ce document précise les patterns d'implémentation.

---

## Décision

### 1. Catalogue des 14 Workflows

| ID | Domaine | Déclencheur | Description |
|----|---------|-------------|-------------|
| W-00 | tenant | on_tenant_created | Bootstrap tenant (config, quota, welcome) |
| W-01 | calendar | on_availability_change | Push disponibilités vers OTAs |
| W-02 | reservation | Toutes les 15 min (schedule) | Import réservations OTA (polling + idempotence) |
| W-03 | reservation | POST /webhook/reservation-confirmed | Email + SMS confirmation voyageur |
| W-04 | guest | Quotidien 10h00 | Notification check-in J-1 + code accès |
| W-05 | guest | Quotidien 08h00 | Rappel check-out J |
| W-06 | housekeeping | on_reservation_checked_out | Auto-création checkout_clean |
| W-07 | housekeeping | on_job_assigned | Notification housekeeper |
| W-08 | maintenance | on_job_issue_reported | Escalade → ticket maintenance |
| W-09 | transport | Toutes les 30 min (vols du jour) | Suivi vol · adjusted_at non-destructif |
| W-10 | transport | on_trip_assigned / on_trip_time_adjusted | Notification chauffeur |
| W-11 | finance | 1er du mois 06h00 UTC | Génération relevés propriétaires |
| W-12 | finance | POST /webhook/statement-send | Email PDF relevé propriétaire |
| W-13 | agents | POST /webhook/agent-action-approved | Pipeline action agent IA post-approbation |

### 2. Règles d'Architecture (ADR-003 étendues)

```
RÈGLE-N8N-001 : n8n ne lit JAMAIS la base de données directement
  → Toutes les requêtes passent par des Edge Functions PMS sécurisées
  → Aucune connexion Supabase dans les nœuds n8n

RÈGLE-N8N-002 : n8n n'est JAMAIS source de vérité
  → Les états (réservation, job, ticket) sont stockés dans le PMS uniquement
  → n8n lit et transmet, le PMS valide et persiste

RÈGLE-N8N-003 : Toutes les Edge Functions appelées par n8n vérifient canUserPerform()
  → Le service_account header X-Tenant-ID est validé
  → Un AuditEvent est créé pour chaque mutation

RÈGLE-N8N-004 : W-13 (Pipeline Agent IA) ne s'exécute QUE sur approval_status = granted
  → Vérification côté Edge Function fn-agent-execute-action, pas côté n8n
  → Actions financières et accès physique : double confirmation obligatoire

RÈGLE-N8N-005 : Retry exponentiel (1min → 5min → 30min → 1h → abandon)
  → Alerte admin après 3 échecs consécutifs
  → Rate limit OTA → backoff avec log (jamais de perte silencieuse)
```

### 3. Sécurité Webhook

```
Validation obligatoire :
- X-PMS-Signature : HMAC-SHA256(body, webhook_secret)
- webhook_secret stocké dans Supabase Secrets (jamais en clair)
- Replay protection : timestamp < 5 minutes
- IP whitelist n8n (production)

Headers injectés par n8n vers Edge Functions :
- Authorization: Bearer <service_account_jwt>
- X-Tenant-ID: <tenant_id>  ← validé côté Edge Function
- X-Workflow-ID: W-XX       ← pour l'audit trail
```

### 4. Pattern Edge Function

```typescript
// Exemple : fn-housekeeping-create-job
export const handler = async (req: Request) => {
  const tenant_id = validateServiceAccountHeader(req); // RÈGLE-N8N-003
  await canUserPerform(service_account, tenant_id, 'housekeeping.job.create');
  
  const { reservation_id } = await req.json();
  
  // PMS crée le job — n8n ne le crée JAMAIS directement
  const job = await createHousekeepingJob(tenant_id, reservation_id);
  
  await createAuditEvent({ tenant_id, action: 'housekeeping.job.created', ...});
  return Response.json({ job_id: job.id });
};
```

### 5. Monitoring

- Dashboard `/integrations/n8n` : statut temps réel des 14 workflows
- Execution logs : 30 jours de rétention (append-only via integration_event)
- Alertes : admin notifié si status = error après retry épuisé
- Métriques : executions/jour, durée moyenne, taux de succès

---

## Conséquences

**Bénéfices** :
- Workflows swappables (remplacer n8n par autre orchestrateur sans modifier le PMS)
- Sécurité préservée (toutes mutations via Edge Functions + RLS)
- Audit trail complet via integration_event (append-only)
- Idempotence garantie côté PMS (n8n peut re-déclencher sans risque)

**Contraintes** :
- Chaque nouvelle automatisation nécessite une Edge Function PMS (pas de raccourci DB)
- W-13 nécessite que le système d'approbation (PROMPT 17) soit opérationnel avant activation
- W-09 dépend d'une clé API FlightAware (non incluse dans MVP iCal-only)

---

## Alternatives Rejetées

| Alternative | Raison du rejet |
|-------------|-----------------|
| n8n accès DB direct (Supabase node) | Viole ADR-003 + contourne RLS + pas d'audit |
| n8n comme source de vérité des statuts | Viole ADR-003 + perte de données si n8n redémarre |
| Cron jobs dans Edge Functions (sans n8n) | Pas de monitoring visuel, retry complexe |
| LLM pour décider les déclencheurs | RÈGLE PERMANENTE — interdit |

---

## Références

- ADR-003 : n8n Orchestration (FROZEN — règle mère)
- ADR-007 : RLS Strategy (Edge Functions = service_role avec AuditEvent)
- ADR-010 : Moteur Réservations (W-02, W-03 idempotence external_reservation_id)
- ADR-013 : Housekeeping Engine (W-06, W-07, W-08)
- ADR-014 : Transport & Maintenance (W-09, W-10)
- ADR-015 : Moteur Financier (W-11, W-12)
- PERMANENT_RULES.md : LLM interdit pour orchestration automatique
