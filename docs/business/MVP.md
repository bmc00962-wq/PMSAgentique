# MVP SCOPE

## Définition du MVP

Le MVP doit permettre à une entreprise de gestion locative de gérer un portefeuille de propriétés de location courte durée de bout en bout, sans intégrations OTA complètes ni finance automatisée, mais avec un flux opérationnel complet.

---

## Flux MVP Obligatoire

```
Tenant (entreprise)
  → Owner (propriétaire)
    → Property (propriété + unités)
      → Calendar (disponibilités)
        → Reservation (réservation manuelle ou iCal import)
          → Guest (profil voyageur)
            → Housekeeping (job de ménage post-checkout)
              → Inspection (validation propriété prête)
                → Owner Notification (notification propriétaire)
```

---

## Périmètre MVP Détaillé

### Tenant & Auth
- [x] Onboarding tenant (création compte, branding basique)
- [x] Gestion membres et rôles (Tenant Admin, Property Manager, Cleaner, Inspector)
- [x] Authentification (email/password via Supabase Auth)
- [x] Isolation tenant stricte (RLS)

### Owner
- [x] Création / édition propriétaire
- [x] Contrats propriétaire basiques
- [x] Association propriétaire ↔ propriétés
- [x] Notifications propriétaire (email) : arrivée, départ, rapport ménage

### Property
- [x] Création / édition propriété
- [x] Unités (multi-unités par propriété)
- [x] Adresse
- [x] Équipements
- [x] Documents (upload)
- [x] Photos
- [x] Règles de la propriété

### Calendar
- [x] Calendrier central par propriété (source de vérité)
- [x] Types de blocs : available, reserved, owner_block, maintenance, housekeeping
- [x] Vue jour / semaine / mois
- [x] Contrôle de concurrence (version lock avant réservation)
- [x] iCalendar sync (import depuis Airbnb/Booking)

### Reservation
- [x] Création manuelle de réservation
- [x] Import réservation OTA via iCal
- [x] Modification de réservation
- [x] Annulation
- [x] Check-in / check-out
- [x] Statuts : pending, confirmed, checked_in, checked_out, cancelled
- [x] Historique des statuts
- [x] Idempotence iCal

### Guest
- [x] Profil voyageur basique
- [x] Portail voyageur simple (instructions d'arrivée)
- [x] Historique des séjours

### Communication (MVP minimal)
- [x] Templates basiques (booking_confirmation, pre_arrival, checkout_reminder)
- [x] Envoi email automatique sur events clés
- [x] Messages manuels (boîte basique)

### Housekeeping
- [x] Création automatique job ménage au checkout
- [x] Affectation manuelle d'équipe
- [x] Checklist configurable
- [x] Upload photos de preuve
- [x] Statut en temps réel (assigné, en cours, terminé)

### Inspection
- [x] Inspection post-ménage
- [x] Findings avec photos
- [x] Validation "propriété prête"
- [x] Escalade si inspection échouée → ticket maintenance

### Dashboard opérationnel
- [x] Vue d'ensemble : réservations du jour, tâches en cours, problèmes ouverts

### Audit
- [x] Audit event pour chaque action sensible (création réservation, changement statut, etc.)

---

## Hors MVP (reporté V1+)

- Stripe / paiements en ligne
- Channel Manager certifié (Level 2/3)
- Serrures intelligentes
- Transport chauffeurs
- Maintenance avancée (devis, approbations)
- Relevés financiers propriétaires
- Agents IA
- n8n workflows
- Reporting avancé
- SaaS billing
- iOS / Android

---

## Critères de Succès MVP

| Critère | Mesure |
|---------|--------|
| Un tenant peut s'onboarder seul | < 10 min pour créer tenant + 1 propriété + 1 réservation |
| Aucune double réservation | 0 conflit calendrier en test de concurrence |
| Flux ménage complet | Du checkout à "propriété prête" en < 15 clics |
| Notification propriétaire | Email envoyé < 5 min après validation inspection |
| Isolation tenant | 0 fuite de données cross-tenant |
