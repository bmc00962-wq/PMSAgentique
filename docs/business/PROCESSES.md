# KEY BUSINESS PROCESSES

Principaux processus métier du PMS SaaS Agentique.

---

## P-01 — Cycle de vie d'une réservation

```
[Canal OTA / Réservation directe / Manuelle]
  ↓
Réception événement réservation
  ↓
Idempotence check (SHA256 key)
  ↓
Vérification disponibilité calendrier
  ↓
Lock calendrier + validation version
  ↓
Création ReservationRecord (status: pending)
  ↓
Mise à jour calendrier (bloc: reserved)
  ↓
Confirmation → ReservationStatusHistory (confirmed)
  ↓
AuditEvent
  ↓
Déclenchement communications voyageur (booking_confirmation, pre_arrival)
  ↓
[J-1 check-in] Génération code accès (si conditions remplies)
  ↓
Check-in → ReservationStatusHistory (checked_in)
  ↓
[Durée du séjour]
  ↓
Check-out → ReservationStatusHistory (checked_out)
  ↓
Déclenchement Housekeeping Required
  ↓
Communication post-séjour (review_request)
```

---

## P-02 — Processus de ménage et inspection

```
ReservationCheckedOut event
  ↓
Création HousekeepingJob (status: required)
  ↓
Calcul score d'affectation
  [disponibilité × distance × qualité × charge de travail × équipe préférée]
  ↓
Affectation équipe → HousekeepingJob (status: assigned)
  ↓
Notification équipe
  ↓
Confirmation équipe
  ↓
Transport (si nécessaire) → TransportTrip créé
  ↓
Arrivée équipe → HousekeepingJob (status: in_progress)
  ↓
Réalisation checklist → ChecklistItem (completed)
  ↓
Upload photos de preuve
  ↓
HousekeepingJob (status: completed)
  ↓
Création Inspection (status: required)
  ↓
Inspecteur arrive → Inspection (status: in_progress)
  ↓
[Si OK] → Inspection (status: passed) → Property (status: ready)
           → Owner Notification envoyée
           → Calendrier mis à jour
[Si NOK] → Inspection (status: failed)
           → InspectionFinding créé
           → MaintenanceTicket créé automatiquement
           → Superviseur notifié
           → Re-nettoyage planifié
```

---

## P-03 — Synchronisation canal OTA

```
[Niveau 1 - iCalendar]
Récupération iCal depuis Airbnb / Booking
  ↓
Parsing événements
  ↓
Idempotence check
  ↓
Réconciliation avec calendrier PMS
  ↓
Création / annulation réservations
  ↓
IntegrationEvent enregistré

[Niveau 2 - Channel Manager certifié]
Push disponibilités PMS → Canal
Push tarifs PMS → Canal
Push restrictions PMS → Canal
Pull nouvelles réservations ← Canal
  ↓
Résolution conflits (SyncConflict si nécessaire)
  ↓
Réconciliation quotidienne
```

---

## P-04 — Processus d'approbation

```
Événement déclencheur (montant > seuil, décision agent IA critique, etc.)
  ↓
Création ApprovalRequest (status: pending)
  ↓
Notification approbateur(s) désignés
  ↓
[Délai max configuré]
  ↓
[Si approuvé] → ApprovalDecision (approved)
               → Action exécutée
               → AuditEvent

[Si refusé] → ApprovalDecision (rejected)
             → Action annulée
             → AuditEvent
             → Notification demandeur

[Si délai dépassé] → Escalade au niveau supérieur
```

---

## P-05 — Onboarding d'un nouveau tenant

```
Super Admin crée le tenant
  ↓
Configuration tenant (nom, branding, domaine)
  ↓
Création Tenant Admin
  ↓
Invitation membres de l'équipe
  ↓
Configuration des rôles et permissions
  ↓
Ajout premier propriétaire
  ↓
Ajout première propriété + unités
  ↓
Configuration calendrier basique
  ↓
Test réservation manuelle
  ↓
Tenant opérationnel
```

---

## P-06 — Gestion d'un incident critique

```
Incident détecté (maintenance critique, sécurité, etc.)
  ↓
Création Incident
  ↓
[Si agent IA] → Agent Incident Orchestrator activé
  ↓
Évaluation urgence (P1 / P2 / P3)
  ↓
[P1] → Notification immédiate Ops Manager + Tenant Admin
       → Blocage calendrier propriété
       → Création MaintenanceTicket prioritaire
       → ApprovalRequest pour dépense d'urgence

[P2/P3] → Création MaintenanceTicket standard
          → Affectation technicien
          → Suivi workflow standard
```

---

## P-07 — Génération relevé propriétaire mensuel

```
Fin de mois (trigger automatique)
  ↓
Collecte toutes les réservations du mois pour les propriétés de l'owner
  ↓
Application règles de commission (CommissionRule)
  ↓
Déduction dépenses (maintenance, etc.)
  ↓
Calcul revenu net propriétaire
  ↓
Génération OwnerStatement
  ↓
[Si > seuil approbation] → ApprovalRequest
  ↓
Envoi relevé au propriétaire (PDF + email)
  ↓
Déclenchement Payout
  ↓
LedgerEntry créé
  ↓
AuditEvent
```
