# DATA DICTIONARY — PMS SaaS Agentique

**Phase**: PROMPT 05 | **Tables**: 80 | **Date**: 2026-08-09

## Tables par Domaine

| Domain | Table | Purpose | Append-Only | Soft Delete |
|--------|-------|---------|:-----------:|:-----------:|
| SaaS | tenant | Entité racine du tenant SaaS | — | ✅ |
| SaaS | tenant_settings | Configuration par défaut du tenant | — | — |
| SaaS | plan | Plans d'abonnement SaaS | — | — |
| SaaS | subscription | Abonnement tenant → plan | — | — |
| SaaS | feature | Catalogue des fonctionnalités | — | — |
| SaaS | usage_metric | Métriques journalières par tenant | — | — |
| Identity | user_profile | Profil utilisateur étendu (= auth.users) | — | — |
| Identity | tenant_membership | Relation user ↔ tenant + rôle | — | — |
| Identity | role | Définition des rôles (système + custom) | — | — |
| Identity | permission | Permission granulaire (resource.action) | — | — |
| Identity | role_permission | Matrice rôle → permission + conditions | — | — |
| Identity | tenant_secret | Secrets chiffrés par tenant | — | — |
| Owner | owner | Profil propriétaire bailleur | — | ✅ |
| Owner | owner_contract | Contrat de gestion locative | — | — |
| Property | property | Bien immobilier | — | ✅ |
| Property | unit | Logement individuel dans une propriété | — | ✅ |
| Property | address | Adresse physique | — | — |
| Property | amenity | Catalogue équipements/commodités | — | — |
| Property | property_amenity | Équipement → propriété/unité | — | — |
| Property | property_document | Documents juridiques/administratifs | — | ✅ |
| Property | property_registration | Licence STR / numéro enregistrement | — | — |
| Property | property_insurance | Police d'assurance | — | — |
| Channel | channel | Définition canal OTA (Airbnb, Booking…) | — | — |
| Channel | channel_account | Compte OTA du tenant | — | — |
| Channel | channel_connection | Lien unité ↔ canal OTA | — | — |
| Channel | listing | Annonce PMS pour une unité | — | — |
| Channel | channel_listing_mapping | Synchronisation annonce ↔ canal | — | — |
| Calendar | availability | Disponibilité journalière (source de vérité) | — | — |
| Calendar | calendar_block | Blocages manuels/maintenance/ménage | — | ✅ |
| Calendar | rate_plan | Plan tarifaire | — | — |
| Calendar | rate_rule | Règle d'ajustement tarifaire | — | — |
| Calendar | restriction | Contraintes séjour (min/max nuits, fenêtre) | — | — |
| Reservation | guest | Profil voyageur | — | ✅ |
| Reservation | reservation | Réservation (cycle de vie complet) | — | ✅ |
| Reservation | reservation_guest | Voyageurs additionnels par réservation | — | — |
| Reservation | reservation_charge | Lignes de facturation (hébergement, frais…) | — | — |
| Reservation | reservation_tax | Taxes appliquées (TPS, TVQ, taxe tourisme…) | — | — |
| Reservation | reservation_status_history | Historique des changements de statut | ✅ | — |
| Reservation | cancellation | Enregistrement d'annulation | — | — |
| Reservation | refund | Remboursement | — | — |
| Communication | conversation | Fil de discussion (manager ↔ voyageur) | — | — |
| Communication | message | Message individuel (entrant/sortant) | — | — |
| Communication | message_template | Template de message réutilisable | — | — |
| Communication | notification | Notification système in-app/email | — | — |
| Operations | task | Tâche opérationnelle (hub événements) | — | — |
| Operations | assignment | Affectation tâche → membre équipe | — | — |
| Operations | housekeeping_job | Job ménage lié à une réservation | — | — |
| Operations | checklist | Checklist ménage ou inspection | — | — |
| Operations | checklist_item | Élément de checklist avec photo optionnelle | — | — |
| Operations | inspection | Inspection qualité post-ménage | — | — |
| Operations | inspection_finding | Problème constaté lors d'inspection | — | — |
| Transport | driver | Profil chauffeur | — | ✅ |
| Transport | vehicle | Véhicule de l'équipe | — | — |
| Transport | transport_trip | Trajet (ramassage équipe, transfert…) | — | — |
| Transport | transport_stop | Arrêt sur un trajet | — | — |
| Maintenance | maintenance_ticket | Demande de maintenance signalée | — | ✅ |
| Maintenance | work_order | Bon de travail émis vers prestataire | — | — |
| Maintenance | vendor | Prestataire/fournisseur externe | — | ✅ |
| Maintenance | vendor_quote | Devis prestataire | — | — |
| Access | smart_lock | Serrure intelligente connectée | — | — |
| Access | access_code | Code d'accès généré (jamais par LLM) | — | — |
| Access | access_event | Événement d'accès journalisé | ✅ | — |
| Finance | payment | Paiement voyageur | — | — |
| Finance | payout | Paiement propriétaire ou prestataire | — | — |
| Finance | expense | Dépense opérationnelle | — | — |
| Finance | commission_rule | Règle de calcul de commission | — | — |
| Finance | owner_statement | Relevé mensuel propriétaire | — | — |
| Finance | ledger_entry | Grand livre comptable (double entrée) | ✅ | — |
| Agentic | agent | Définition d'agent IA | — | — |
| Agentic | agent_policy | Politique de permissions de l'agent | — | — |
| Agentic | agent_run | Exécution d'un agent | — | — |
| Agentic | agent_step | Étape d'une exécution | — | — |
| Agentic | agent_tool_call | Appel d'outil par un agent | — | — |
| Agentic | agent_decision | Décision prise par un agent | — | — |
| Governance | approval_request | Demande d'approbation humaine | — | — |
| Governance | approval_decision | Décision sur une demande | ✅ | — |
| Governance | audit_event | Journal d'audit immuable | ✅ | — |
| Governance | integration_event | Événements reçus des canaux OTA | — | — |
| Governance | sync_conflict | Conflits détectés lors de synchronisation | — | — |
| Governance | incident | Incident opérationnel | — | — |

---

## Conventions Globales

| Convention | Valeur |
|-----------|--------|
| Clé primaire | `id UUID DEFAULT gen_random_uuid()` |
| Isolation tenant | `tenant_id UUID NOT NULL REFERENCES tenant(id)` |
| Timestamps | `created_at TIMESTAMPTZ` · `updated_at TIMESTAMPTZ` |
| Auteur | `created_by UUID REFERENCES user_profile(id)` |
| Locking optimiste | `version INTEGER DEFAULT 1` |
| Soft delete | `deleted_at TIMESTAMPTZ` |
| Valeurs monétaires | `NUMERIC(12,4)` — jamais FLOAT |
| Enums | `TEXT + CHECK(IN ...)` |

---

## Tables Append-Only (7 tables)

Ces tables ne doivent **jamais** être modifiées ni supprimées :

| Table | Raison |
|-------|--------|
| `audit_event` | Traçabilité immuable réglementaire |
| `ledger_entry` | Intégrité comptable double entrée |
| `access_event` | Journal d'accès physique |
| `reservation_status_history` | Audit trail réservations |
| `approval_decision` | Décisions humaines archivées |
| `integration_event` | Idempotence OTA |

---

## Références

- [DATA_MODEL.md](./DATA_MODEL.md) — Schéma SQL complet
- [ADR-006-SCHEMA-VERSIONING.md](../architecture/ADR-006-SCHEMA-VERSIONING.md)
- [RBAC.md](../security/RBAC.md) — Modèle d'accès
- [TENANCY_MODEL.md](../architecture/TENANCY_MODEL.md)
