# ARCHITECTURE GLOBALE — PMS SaaS Agentique

**ADR Reference**: ADR-001, ADR-002, ADR-003  
**Phase**: PROMPT 02  
**Status**: ACCEPTED  

---

## 1. Vue d'ensemble

Le PMS SaaS Agentique adopte une architecture **Modular Monolith** déployée sur **Supabase/PostgreSQL**, avec **n8n** comme moteur d'orchestration des workflows et une couche agentique IA orchestrée indépendamment.

### Principe directeur

> Chaque module est une unité cohérente et autonome avec des frontières claires, capable de devenir un microservice indépendant ultérieurement sans refactoring majeur.

---

## 2. C4 Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PMS SaaS AGENTIQUE                                 │
│                     (Système central de gestion)                            │
└─────────────────────────────────────────────────────────────────────────────┘
          ▲                    ▲                    ▲
          │                    │                    │
┌─────────┴──────┐   ┌─────────┴──────┐   ┌────────┴───────┐
│ Acteurs internes│   │ Acteurs externes│   │ Systèmes tiers │
│                │   │                │   │                │
│ • Tenant Admin │   │ • Owner        │   │ • Airbnb       │
│ • Ops Manager  │   │ • Guest        │   │ • Booking.com  │
│ • Prop Manager │   │ • Vendor       │   │ • Vrbo         │
│ • Housekeeping │   │ • Auditor ext. │   │ • Stripe       │
│ • Inspector    │   │                │   │ • n8n          │
│ • Driver       │   │                │   │ • Smart Locks  │
│ • Accountant   │   │                │   │ • SMS/Email    │
│ • Super Admin  │   │                │   │ • Maps API     │
│ • AI Agent     │   │                │   │ • AI Provider  │
└────────────────┘   └────────────────┘   └────────────────┘
```

---

## 3. C4 Container Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ PMS SaaS AGENTIQUE — Containers                                                      │
│                                                                                      │
│  ┌─────────────────────┐    ┌──────────────────────────────────────────────────┐    │
│  │   FRONTEND          │    │  BACKEND (Supabase/PostgreSQL)                   │    │
│  │                     │    │                                                  │    │
│  │  React + TypeScript │◄───┤  ┌─────────────┐  ┌──────────────────────────┐  │    │
│  │  Tailwind CSS       │    │  │ Supabase Auth│  │  PostgreSQL Database     │  │    │
│  │  React Query        │    │  │ (JWT, RLS)   │  │  (23 Modules, RLS)       │  │    │
│  │  React Router       │    │  └─────────────┘  └──────────────────────────┘  │    │
│  │                     │    │  ┌─────────────┐  ┌──────────────────────────┐  │    │
│  │  Web App            │    │  │  Edge       │  │  Supabase Storage        │  │    │
│  │  Mobile (V2)        │    │  │  Functions  │  │  (Files, Photos)         │  │    │
│  └─────────────────────┘    │  └─────────────┘  └──────────────────────────┘  │    │
│                             │  ┌─────────────┐  ┌──────────────────────────┐  │    │
│  ┌─────────────────────┐    │  │  Realtime   │  │  Row Level Security      │  │    │
│  │   AUTOMATION        │    │  │  (WebSocket)│  │  (Isolation tenant)      │  │    │
│  │                     │    │  └─────────────┘  └──────────────────────────┘  │    │
│  │  n8n Workflows      │◄───┤                                                  │    │
│  │  (Orchestration)    │    └──────────────────────────────────────────────────┘    │
│  └─────────────────────┘                                                            │
│                                                                                      │
│  ┌─────────────────────┐    ┌──────────────────────────────────────────────────┐    │
│  │   AGENTIC LAYER     │    │  EXTERNAL SYSTEMS                                │    │
│  │                     │    │                                                  │    │
│  │  Agent Orchestrator │    │  OTA Channels: Airbnb, Booking, Vrbo             │    │
│  │  Policy Engine      │    │  Payment: Stripe                                 │    │
│  │  Tool Registry      │◄───┤  Smart Locks: Schlage, Yale, August              │    │
│  │  Specialized Agents │    │  Maps: IRouteProvider                            │    │
│  │                     │    │  Comms: Email, SMS, WhatsApp                     │    │
│  └─────────────────────┘    └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Architecture en Couches

```
┌──────────────────────────────────────────────────────────┐
│  CHANNELS (Airbnb, Booking, Vrbo, Direct, iCal)         │
└──────────────────────────────────┬───────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────┐
│  CHANNEL INTEGRATION LAYER                               │
│  IChannelAdapter + Canonical Event Model                 │
│  Idempotency SHA256 + SyncCursor + ConflictResolution    │
└──────────────────────────────────┬───────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────┐
│  PMS CORE                                                │
│  Calendar Engine (source of truth)                       │
│  Reservation Engine (concurrency control)                │
│  Guest Management                                        │
└──────────────────────────────────┬───────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────┐
│  DOMAIN SERVICES                                         │
│  Owner · Property · Housekeeping · Inspection            │
│  Transport · Maintenance · Access · Finance              │
│  Communications · Reporting · Audit                      │
└──────────────────────────────────┬───────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────┐
│  WORKFLOW ENGINE (n8n)                                   │
│  Event-driven orchestration                              │
│  API interne sécurisée uniquement                        │
└──────────────────────────────────┬───────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────┐
│  AGENTIC LAYER                                           │
│  Agent Orchestrator → Policy Engine → Tool Registry      │
│  Specialized Agents (Guest, HK, Transport, Finance...)   │
└──────────────────────────────────┬───────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────┐
│  HUMAN APPROVAL LAYER                                    │
│  ApprovalRequest → ApprovalDecision → Execution          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Module Dependency Diagram

```
                     ┌──────────┐
                     │   auth   │◄──────────────────────────────┐
                     └────┬─────┘                               │
                          │ provides: user context              │
                          ▼                                      │
                     ┌──────────┐                               │
                     │  tenant  │◄──────────────────────────────┤
                     └────┬─────┘  provides: tenant context     │
                          │                                      │
         ┌────────────────┼────────────────────────────┐        │
         ▼                ▼                            ▼        │
   ┌──────────┐    ┌───────────┐               ┌──────────┐    │
   │  owner   │    │ property  │               │saas-admin│    │
   └────┬─────┘    └─────┬─────┘               └──────────┘    │
        │                │                                      │
        │         ┌──────▼──────┐                              │
        │         │  calendar   │◄─────────────────────────────┤
        │         └──────┬──────┘  provides: availability      │
        │                │                                      │
        │         ┌──────▼──────┐   ┌──────────┐              │
        │         │ reservation │──►│  channel │              │
        │         └──────┬──────┘   └──────────┘              │
        │                │                                      │
        │    ┌───────────┼──────────────────┐                  │
        │    ▼           ▼                  ▼                  │
        │  ┌───────┐ ┌───────┐       ┌──────────────┐         │
        │  │ guest │ │comms  │       │  operations  │         │
        │  └───────┘ └───────┘       └──────┬───────┘         │
        │                                   │                  │
        │         ┌─────────────────────────┼──────────┐      │
        │         ▼                         ▼          ▼      │
        │   ┌──────────┐           ┌──────────────┐  ┌──────┐ │
        │   │housekeep.│           │  inspection  │  │transp│ │
        │   └──────────┘           └──────────────┘  └──────┘ │
        │                                                      │
        │    ┌──────────┐  ┌──────────┐  ┌──────────┐         │
        └───►│ payments │  │ finance  │  │inventory │         │
             └────┬─────┘  └─────┬────┘  └──────────┘         │
                  │              │                              │
             ┌────▼──────────────▼────┐                        │
             │       reporting        │                        │
             └────────────────────────┘                        │
                                                               │
         ┌──────────┐  ┌──────────┐  ┌──────────┐             │
         │   access │  │approvals │  │   audit  │─────────────┘
         └──────────┘  └──────────┘  └──────────┘
                                          ▲
                              (all modules emit audit events)
```

---

## 6. Définition des 23 Modules

### 6.1 MODULE: auth
- **Responsabilité**: Authentification, sessions, tokens JWT
- **Frontières**: Supabase Auth exclusivement. Aucun stockage de mot de passe interne.
- **Dépendances**: aucune (fondation)
- **APIs exposées**: `getCurrentUser()`, `getTenantContext()`, `verifyToken()`
- **Événements émis**: `UserLoggedIn`, `UserLoggedOut`, `SessionExpired`

### 6.2 MODULE: tenant
- **Responsabilité**: Gestion des tenants SaaS, membres, rôles, paramètres, branding
- **Frontières**: Toute donnée tenant-specific est isolée par tenant_id
- **Dépendances**: auth
- **APIs exposées**: `resolveTenantContext()`, `getTenantMembers()`, `canUserPerform()`
- **Événements émis**: `TenantCreated`, `MemberAdded`, `MemberRoleChanged`, `TenantSuspended`

### 6.3 MODULE: owner
- **Responsabilité**: Profils propriétaires, contrats, associations propriétés
- **Frontières**: Un owner appartient à un seul tenant
- **Dépendances**: auth, tenant
- **APIs exposées**: `getOwner()`, `createOwner()`, `getOwnerProperties()`, `getOwnerContracts()`
- **Événements émis**: `OwnerCreated`, `OwnerContractSigned`, `OwnerNotified`

### 6.4 MODULE: property
- **Responsabilité**: Propriétés, unités, équipements, documents, photos, règles
- **Frontières**: Une propriété appartient à un owner, lui-même dans un tenant
- **Dépendances**: auth, tenant, owner
- **APIs exposées**: `getProperty()`, `getUnits()`, `getPropertyStatus()`, `setPropertyReady()`
- **Événements émis**: `PropertyCreated`, `PropertyStatusChanged`, `PropertyReadyForCheckIn`

### 6.5 MODULE: calendar
- **Responsabilité**: Source unique de vérité des disponibilités. Contrôle de concurrence.
- **Frontières**: Aucun autre module ne modifie la disponibilité sans passer par ce module
- **Dépendances**: auth, tenant, property
- **APIs exposées**: `checkAvailability()`, `acquireLock()`, `createBlock()`, `releaseBlock()`, `getCalendar()`
- **Événements émis**: `CalendarUpdated`, `BlockCreated`, `BlockReleased`, `LockAcquired`, `LockExpired`

### 6.6 MODULE: reservation
- **Responsabilité**: Cycle de vie complet des réservations (création, modification, annulation, check-in/out)
- **Frontières**: Toujours passer par calendar pour les vérifications de disponibilité
- **Dépendances**: auth, tenant, property, calendar, guest
- **APIs exposées**: `createReservation()`, `modifyReservation()`, `cancelReservation()`, `checkIn()`, `checkOut()`
- **Événements émis**: `ReservationCreated`, `ReservationModified`, `ReservationCancelled`, `GuestCheckedIn`, `GuestCheckedOut`

### 6.7 MODULE: channel
- **Responsabilité**: Intégration OTA (Airbnb, Booking, Vrbo, Direct). Modèle canonique.
- **Frontières**: IChannelAdapter — aucun couplage direct aux APIs OTA dans le domaine
- **Dépendances**: auth, tenant, property, calendar, reservation
- **APIs exposées**: `connectChannel()`, `pullReservations()`, `pushAvailability()`, `pushRates()`, `reconcile()`
- **Événements émis**: `ChannelEventReceived`, `ReservationSynced`, `SyncConflictDetected`, `ChannelHealthChanged`

### 6.8 MODULE: guest
- **Responsabilité**: Profils voyageurs, historique séjours, portail voyageur
- **Frontières**: Un guest peut exister dans plusieurs tenants (déduplication possible V1)
- **Dépendances**: auth, tenant
- **APIs exposées**: `getGuest()`, `createGuest()`, `getGuestHistory()`, `getGuestPortal()`
- **Événements émis**: `GuestCreated`, `GuestUpdated`

### 6.9 MODULE: communications
- **Responsabilité**: Messages, templates, notifications, boîte unifiée
- **Frontières**: L'IA ne peut que suggérer des messages. L'envoi final passe par ce module.
- **Dépendances**: auth, tenant, guest, reservation
- **APIs exposées**: `sendMessage()`, `createTemplate()`, `getConversation()`, `triggerNotification()`
- **Événements émis**: `MessageSent`, `NotificationDelivered`, `ConversationCreated`

### 6.10 MODULE: operations
- **Responsabilité**: Événements opérationnels, tâches, affectations. Event-driven hub.
- **Frontières**: Orchestre les autres modules opérationnels sans les posséder
- **Dépendances**: auth, tenant, reservation, property
- **APIs exposées**: `createTask()`, `assignTask()`, `completeTask()`, `escalateTask()`
- **Événements émis**: `TaskCreated`, `TaskAssigned`, `TaskCompleted`, `HousekeepingRequired`, `InspectionRequired`, `MaintenanceRequired`

### 6.11 MODULE: housekeeping
- **Responsabilité**: Jobs ménage, checklists, photos, scores, affectation équipes
- **Frontières**: Déclenché par operations, valide vers inspection
- **Dépendances**: auth, tenant, property, operations
- **APIs exposées**: `createHousekeepingJob()`, `assignTeam()`, `completeChecklist()`, `uploadPhoto()`
- **Événements émis**: `HousekeepingJobCreated`, `HousekeepingJobStarted`, `HousekeepingJobCompleted`, `HousekeepingJobFailed`

### 6.12 MODULE: inspection
- **Responsabilité**: Inspections qualité, findings, validation propriété prête
- **Frontières**: Seul ce module peut valider `property.status = ready`
- **Dépendances**: auth, tenant, property, housekeeping, operations
- **APIs exposées**: `createInspection()`, `addFinding()`, `passInspection()`, `failInspection()`
- **Événements émis**: `InspectionStarted`, `InspectionPassed`, `InspectionFailed`, `PropertyReady`

### 6.13 MODULE: transport
- **Responsabilité**: Chauffeurs, véhicules, trajets, affectation équipes
- **Frontières**: IRouteProvider — aucun couplage à un provider cartographique
- **Dépendances**: auth, tenant, operations
- **APIs exposées**: `createTrip()`, `assignDriver()`, `confirmPickup()`, `updateTripStatus()`
- **Événements émis**: `TripCreated`, `TripAssigned`, `PickupConfirmed`, `TripCompleted`

### 6.14 MODULE: maintenance
- **Responsabilité**: Tickets, bons de travail, prestataires, devis, escalades
- **Frontières**: IMaintenanceProvider pour les prestataires externes
- **Dépendances**: auth, tenant, property, operations, approvals
- **APIs exposées**: `createTicket()`, `createWorkOrder()`, `assignVendor()`, `requestQuote()`, `escalateIncident()`
- **Événements émis**: `MaintenanceTicketCreated`, `WorkOrderIssued`, `IncidentEscalated`, `VendorAssigned`

### 6.15 MODULE: inventory
- **Responsabilité**: Inventaires propriété, signalement manquants/endommagés
- **Frontières**: Lié à property et inspection
- **Dépendances**: auth, tenant, property, inspection
- **APIs exposées**: `getInventory()`, `reportDamage()`, `reportMissing()`
- **Événements émis**: `InventoryItemReported`, `DamageClaimCreated`

### 6.16 MODULE: access
- **Responsabilité**: Serrures intelligentes, codes d'accès, politiques, événements accès
- **Frontières**: ISmartLockProvider — aucun couplage à un provider. Aucun LLM ne génère des codes.
- **Dépendances**: auth, tenant, reservation, property
- **APIs exposées**: `generateAccessCode()`, `revokeAccessCode()`, `getAccessEvents()`
- **Événements émis**: `AccessCodeGenerated`, `AccessCodeRevoked`, `AccessGranted`, `AccessDenied`

### 6.17 MODULE: payments
- **Responsabilité**: Paiements voyageurs, remboursements, taxes
- **Frontières**: IPaymentProvider — Stripe est le premier provider, d'autres peuvent être ajoutés
- **Dépendances**: auth, tenant, reservation
- **APIs exposées**: `createPayment()`, `refundPayment()`, `getPaymentStatus()`
- **Événements émis**: `PaymentReceived`, `PaymentFailed`, `RefundIssued`

### 6.18 MODULE: finance
- **Responsabilité**: Relevés propriétaires, paiements propriétaires, commissions, grand livre
- **Frontières**: Calculs déterministes uniquement. Aucun LLM.
- **Dépendances**: auth, tenant, owner, payments, reservation
- **APIs exposées**: `calculateOwnerStatement()`, `generatePayout()`, `getLedger()`, `exportAccounting()`
- **Événements émis**: `StatementGenerated`, `PayoutProcessed`, `LedgerEntryCreated`

### 6.19 MODULE: reporting
- **Responsabilité**: Dashboards, KPIs, rapports opérationnels et financiers
- **Frontières**: Lecture seule sur tous les autres modules
- **Dépendances**: tous les modules (lecture)
- **APIs exposées**: `getDashboard()`, `getOccupancyReport()`, `getRevenueReport()`, `getQualityReport()`
- **Événements émis**: aucun (module de lecture)

### 6.20 MODULE: approvals
- **Responsabilité**: Circuit de validation humain pour décisions critiques
- **Frontières**: Toute action critique passe par ce module avant exécution
- **Dépendances**: auth, tenant
- **APIs exposées**: `createApprovalRequest()`, `approveRequest()`, `rejectRequest()`, `escalateRequest()`
- **Événements émis**: `ApprovalRequested`, `ApprovalGranted`, `ApprovalRejected`, `ApprovalEscalated`

### 6.21 MODULE: agents
- **Responsabilité**: Agent Orchestrator, Policy Engine, Tool Registry, agents spécialisés
- **Frontières**: Aucun agent n'accède directement à PostgreSQL. Tout passe par Tool Registry → PMS API.
- **Dépendances**: tous les modules via Tool Registry (API uniquement)
- **APIs exposées**: `executeAgent()`, `getAgentPolicy()`, `logAgentRun()`, `logToolCall()`
- **Événements émis**: `AgentRunStarted`, `AgentRunCompleted`, `AgentDecisionMade`, `AgentApprovalRequired`

### 6.22 MODULE: audit
- **Responsabilité**: Traçabilité immuable de toutes les actions sensibles
- **Frontières**: Écriture uniquement (append-only). Aucun audit event ne peut être modifié.
- **Dépendances**: auth, tenant (tous les modules émettent des events)
- **APIs exposées**: `logAuditEvent()`, `searchAuditEvents()`, `exportAuditLog()`
- **Événements émis**: aucun (module récepteur)

### 6.23 MODULE: saas-admin
- **Responsabilité**: Super Admin platform, gestion tenants globale, billing, plans, métriques
- **Frontières**: Cross-tenant uniquement pour Super Admin. Strictement séparé du domaine tenant.
- **Dépendances**: auth, tenant
- **APIs exposées**: `getAllTenants()`, `suspendTenant()`, `configurePlan()`, `getUsageMetrics()`
- **Événements émis**: `TenantSuspended`, `PlanChanged`, `QuotaExceeded`

---

## 7. Patterns Architecturaux

### 7.1 Couche d'accès aux données (Repository Pattern)

```
UI Component
    │
    ▼
Application Service (use case)
    │
    ▼
Repository Interface
    │
    ▼
Supabase Client
    │
    ▼
PostgreSQL (+ RLS)
```

Chaque module dispose de son propre repository. Jamais d'appel Supabase direct depuis un composant UI.

### 7.2 Pattern Événementiel

Tous les événements suivent le format :
```typescript
interface DomainEvent {
  event_id: string;          // UUID v4
  tenant_id: string;         // UUID
  correlation_id: string;    // UUID (chaîne d'événements liés)
  event_type: string;        // e.g. "ReservationCreated"
  resource_type: string;     // e.g. "reservation"
  resource_id: string;       // UUID
  occurred_at: string;       // ISO 8601
  payload: Record<string, unknown>;
  actor_id: string;          // user_id ou "system" ou agent_id
}
```

### 7.3 Idempotence

- Réservations OTA : `SHA256(provider + provider_account_id + provider_reservation_id)`
- Appels n8n : `Idempotency-Key` header obligatoire
- Événements de canal : `integration_event.idempotency_key` unique

### 7.4 Abstractions (Interfaces)

| Interface | Module | Implémentations |
|-----------|--------|-----------------|
| IChannelAdapter | channel | AirbnbAdapter, BookingAdapter, VrboAdapter, iCalAdapter |
| IPaymentProvider | payments | StripeProvider (V1) |
| ISmartLockProvider | access | SchlageProvider, YaleProvider (V1) |
| IRouteProvider | transport | GoogleMapsProvider (V1) |
| INotificationProvider | communications | EmailProvider, SMSProvider |
| IWorkflowProvider | operations | N8nProvider |
| IAIProvider | agents | OpenAIProvider, AnthropicProvider |

---

## 8. Contraintes Non-Fonctionnelles

| Contrainte | Valeur |
|------------|--------|
| Isolation tenant | RLS PostgreSQL — garantie au niveau DB |
| Concurrence calendrier | Version lock optimiste |
| Idempotence | Sur toutes les opérations externes |
| Audit | Toutes les actions sensibles — append-only |
| LLM interdit pour | Calculs financiers, codes d'accès, données factuelles |
| tenant_id source | Toujours depuis auth context, jamais formulaire |
| Langue | FR, EN, AR (RTL) — MVP |
| Devises | CAD, MAD — MVP |

---

## 9. Évolution vers Microservices

Chaque module est conçu pour être extrait en service indépendant :

```
Phase actuelle:  Modular Monolith (tous les modules dans un déploiement)
Phase future:    Calendar → service indépendant
                 Channel → service indépendant
                 Agents  → service indépendant
```

Prérequis pour extraction : interfaces stables + contrats d'événements documentés.

---

## 10. Documents Associés

- [ADR-001 — Modular Monolith](./ADR-001-MODULAR-MONOLITH.md)
- [ADR-002 — Supabase/PostgreSQL](./ADR-002-SUPABASE-POSTGRESQL.md)
- [ADR-003 — n8n Orchestration](./ADR-003-N8N-ORCHESTRATION.md)
- [Tenancy Model](./TENANCY_MODEL.md) — PROMPT 03
- [RBAC](../security/RBAC.md) — PROMPT 04
- [Data Model](../database/DATA_MODEL.md) — PROMPT 05
