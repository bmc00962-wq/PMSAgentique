# ROADMAP

## Vision
Plateforme PMS SaaS multitenant et agentique pour la gestion de logements de location de courte durée. Marchés initiaux : Canada (Québec) et Maroc.

---

## Product Versions

### MVP — Flux opérationnel de base
**Objectif** : Permettre à une agence de gérer propriétaires, propriétés, calendrier, réservations, ménage, inspection et notification propriétaire.

Périmètre MVP :
- Tenant management (onboarding, membres, rôles)
- Owner management (profil, contrats, notifications)
- Property management (propriété, unités, équipements, documents)
- Calendar engine (source de vérité, iCal import, concurrence)
- Reservation engine (manuelle + iCal, check-in/out, statuts)
- Guest management (profil basique, portail simple)
- Communication (templates basiques, emails automatiques)
- Housekeeping (jobs, checklists, photos, statuts)
- Inspection (findings, photos, validation prête)
- Audit (events sur actions sensibles)
- Dashboard opérationnel

### VERSION 1 — Plateforme complète
- Channel Manager certifié (Level 2 : push/pull bidirectionnel)
- Stripe paiements voyageurs
- Finance propriétaires (relevés, paiements, commissions)
- Serrures intelligentes (codes d'accès)
- Maintenance avancée (devis, approbations)
- Transport chauffeurs (interface mobile)
- Agents IA : triage messages, dispatch ménage, incidents
- n8n workflows (orchestration automatisée)
- Reporting complet (occupation, RevPAR, qualité)
- SaaS Billing (plans, subscriptions, métriques)
- RGPD + Conformité Canada/Maroc

### VERSION 2 — Plateforme intelligente
- Mobile iOS + Android (native)
- Agents IA avancés (Revenue Agent, Compliance Agent)
- Direct API OTA (Level 3 : Airbnb, Booking, Vrbo)
- Revenue Management automatisé
- Optimisation listings par IA
- Traduction automatique multi-langue
- Tracking transport temps réel
- Maintenance préventive planifiée
- Portail propriétaire mobile avancé
- Expansion France, UAE

### VERSION 3 — Plateforme Enterprise
- Tenant dédié (infrastructure isolée)
- SLA Enterprise
- Business Intelligence avancée
- Rapport fiscal multi-pays
- Export données complet
- Migration tenant entre régions
- A/B testing listings

---

## Development Phases

| Phase | Nom | Statut | Version |
|-------|-----|--------|---------|
| 00 | Initialization | ✅ COMPLETED | — |
| 01 | Product Definition | ✅ COMPLETED | — |
| 02 | Architecture Globale | ⏳ NEXT | — |
| 03 | Multitenancy | 🔲 PENDING | — |
| 04 | Auth & RBAC | 🔲 PENDING | — |
| 05 | Data Model | 🔲 PENDING | — |
| 06 | RLS & Security | 🔲 PENDING | — |
| 07 | App Foundation | 🔲 PENDING | MVP |
| 08 | Owner & Property | 🔲 PENDING | MVP |
| 09 | Calendar Engine | 🔲 PENDING | MVP |
| 10 | Reservation Engine | 🔲 PENDING | MVP |
| 11 | Channel Manager | 🔲 PENDING | MVP→V1 |
| 12 | Guest & Communication | 🔲 PENDING | MVP |
| 13 | Operations Engine | 🔲 PENDING | MVP |
| 14 | Housekeeping | 🔲 PENDING | MVP |
| 15 | Transport | 🔲 PENDING | V1 |
| 16 | Maintenance & Access | 🔲 PENDING | V1 |
| 17 | Financial Engine | 🔲 PENDING | V1 |
| 18 | n8n Integration | 🔲 PENDING | V1 |
| 19 | Agentic Architecture | 🔲 PENDING | V1 |

---

## Markets

| Marché | Langue | Devise | Version |
|--------|--------|--------|---------|
| Canada (Québec) | FR, EN | CAD | MVP |
| Maroc | FR, AR | MAD | MVP |
| France | FR, EN | EUR | V2 |
| UAE / Maghreb | AR, EN | AED/MAD | V2 |

---

## Platform Targets

| Plateforme | Version |
|------------|---------|
| Web | MVP |
| iOS | V2 |
| Android | V2 |
