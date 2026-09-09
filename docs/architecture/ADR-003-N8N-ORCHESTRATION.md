# ADR-003 — n8n comme Moteur d'Orchestration (Non Source de Vérité)

**Date**: 2026-08-09  
**Status**: ACCEPTED  
**Frozen**: YES  
**Décidé en**: PROMPT 02  

---

## Contexte

Le PMS nécessite un moteur d'orchestration de workflows pour automatiser les processus opérationnels complexes :
- Réception événements OTA → création réservation → dispatch ménage → notification
- Gestion des incidents → escalade → approbation → résolution
- Synchronisation quotidienne des calendriers OTA
- Dispatch des chauffeurs

Plusieurs options ont été évaluées :
- **n8n** : workflow engine open source, self-hostable
- **Temporal** : workflow engine durable, code-first
- **Logique custom** dans l'application
- **Zapier/Make** : outils no-code propriétaires

---

## Décision

**Moteur retenu : n8n**

n8n est utilisé exclusivement comme moteur d'orchestration des workflows. Il n'est **jamais une source de vérité** pour les données métier.

---

## Principes fondamentaux

### Ce que n8n FAIT
- Orchestrer les séquences d'actions entre modules PMS
- Appeler les APIs internes sécurisées du PMS
- Gérer les retry, les délais, les branchements conditionnels
- Réagir aux événements du PMS
- Déclencher des notifications

### Ce que n8n NE FAIT PAS
- Stocker des données métier
- Modifier directement des tables PostgreSQL
- Générer des données factuelles (adresses, prix, codes)
- Prendre des décisions financières
- Contourner le circuit d'approbation humain

---

## Contrats d'interface n8n ↔ PMS

### Sécurité obligatoire sur tous les appels
```
Headers requis:
  Authorization: Bearer {SERVICE_ACCOUNT_TOKEN}
  X-Tenant-ID: {tenant_id}
  X-Correlation-ID: {uuid}
  Idempotency-Key: {unique_key}
```

### Endpoints internes exposés à n8n
```
POST /automation/events              # Réception événement PMS
GET  /automation/reservations/:id/context  # Contexte complet réservation
POST /automation/tasks               # Création tâche opérationnelle
POST /automation/housekeeping        # Dispatch job ménage
POST /automation/transport           # Dispatch trajet
POST /automation/notifications       # Envoi notification
POST /automation/approvals           # Soumission demande approbation
POST /automation/incidents           # Création incident
POST /automation/audit               # Log audit event
```

---

## Workflows Prévus (V1)

| Workflow | Déclencheur | Actions |
|----------|-------------|---------|
| 00_ERROR_HANDLER | Erreur workflow | Log, alerte, retry |
| 01_CHANNEL_EVENT_GATEWAY | Webhook OTA | Validation, normalisation, routage |
| 02_RESERVATION_UPSERT | Événement OTA | Idempotence, création/mise à jour réservation |
| 03_RESERVATION_ORCHESTRATOR | ReservationCreated | Dispatch ménage, notifications, serrure |
| 04_GUEST_COMMUNICATIONS | Events réservation | Envoi messages automatiques |
| 05_HOUSEKEEPING_DISPATCH | HousekeepingRequired | Sélection équipe, assignation, confirmation |
| 06_DRIVER_DISPATCH | TransportRequired | Sélection chauffeur, route, confirmation |
| 07_SMART_LOCK_ACCESS | PropertyReady + Confirmed | Génération code accès |
| 08_MAINTENANCE_INCIDENT | InspectionFailed | Création ticket, escalade |
| 09_HUMAN_APPROVAL | ApprovalRequired | Envoi notification, attente, timeout |
| 10_OWNER_NOTIFICATION | Events propriétaire | Email/SMS propriétaire |
| 11_DAILY_RECONCILIATION | Cron quotidien | Sync OTA, vérifications, rapports |
| 12_CHANNEL_OUTBOUND_SYNC | CalendarUpdated | Push vers OTA |
| 13_AI_MESSAGE_TRIAGE | MessageReceived | Analyse, catégorisation, réponse suggérée |

---

## Justification

| Critère | n8n | Alternatives |
|---------|-----|-------------|
| Self-hostable | ✅ | Zapier ❌, Make ❌ |
| Open source | ✅ | Zapier ❌, Make ❌ |
| Intégration Supabase | ✅ natif | Temporal : custom |
| Visuel + code | ✅ | Temporal : code only |
| Retry management | ✅ | Code custom : manuel |
| Coût | Faible | Zapier/Make : élevé |
| Contrôle opérationnel | Total | SaaS : limité |

---

## Contraintes importantes

1. **n8n n'est pas un microservice** — il est un orchestrateur externe
2. **Les données canoniques restent dans PostgreSQL** — n8n passe en transit
3. **Un workflow n8n défaillant ne doit pas corrompre la base** — idempotence obligatoire
4. **Monitoring** — chaque workflow doit être loggué dans `integration_event`
5. **Rate limiting** — les APIs internes sont protégées contre les appels excessifs de n8n

---

## Conséquences

### Positives
- Workflows visuels facilement modifiables par des non-développeurs
- Séparation claire entre orchestration et domaine
- Retry et error handling centralisés
- Possibilité de modifier un workflow sans déployer l'application

### Négatives / Risques
- Point de défaillance externe (mitigation : retry + circuit breaker)
- Dépendance à un service supplémentaire
- Nécessite une infrastructure n8n dédiée (self-hosted)

---

## Conditions de révision

Peut être révisé si :
- n8n ne peut pas gérer la charge (>10 000 événements/jour)
- Besoin de workflows durables long-running (migration vers Temporal possible)

---

## Décision gelée

Cette décision est **GELÉE**. Le principe fondamental — n8n n'est PAS une source de vérité — ne peut pas être remis en question sans ADR supérieur.
