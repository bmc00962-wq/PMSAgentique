# ADR-002 — Backend Supabase / PostgreSQL

**Date**: 2026-08-09  
**Status**: ACCEPTED  
**Frozen**: YES  
**Décidé en**: PROMPT 02  

---

## Contexte

Le PMS nécessite :
- Un système de base de données relationnel robuste (relations complexes entre domaines)
- Authentification multi-tenant sécurisée
- Isolation stricte des données par tenant
- Stockage de fichiers (photos, documents)
- Temps réel (notifications, mise à jour statuts)
- Fonctions serverless (logique backend sécurisée)
- Compatibilité avec la plateforme OnSpace

---

## Décision

**Backend retenu : Supabase + PostgreSQL**

Supabase fournit l'ensemble des services backend nécessaires sur une infrastructure PostgreSQL gérée, compatible avec la plateforme OnSpace et offrant Row Level Security native.

---

## Composants retenus

### PostgreSQL
- Base de données relationnelle principale
- Toutes les données métier (23 modules)
- Transactions ACID cross-domaine
- Extensions : `uuid-ossp`, `pgcrypto`, `pg_trgm` (recherche texte)

### Supabase Auth
- Authentification email/password (MVP)
- OTP (MVP)
- JWT avec claims personnalisés (tenant_id, role)
- MFA (V1)
- SSO (V2)

### Row Level Security (RLS)
- Isolation tenant garantie au niveau PostgreSQL
- Policies par rôle et par contexte
- Aucune donnée cross-tenant accessible par défaut
- Tests d'isolation automatisés obligatoires (PROMPT 06)

### Supabase Storage
- Photos de propriétés
- Documents (contrats, assurances)
- Photos de preuves ménage/inspection
- Isolation par tenant (bucket policy)

### Supabase Realtime
- Statut des jobs ménage en temps réel
- Notifications opérationnelles
- Mise à jour du tableau de bord

### Edge Functions
- Logique backend sécurisée (non exposée au frontend)
- Webhooks OTA entrants
- Intégration n8n (API interne)
- Calculs financiers critiques
- Génération de rapports

---

## Justification

| Critère | Supabase/PostgreSQL | Alternatives rejetées |
|---------|---------------------|----------------------|
| Isolation tenant | RLS native PostgreSQL | MongoDB (pas de RLS), Firebase (isolation applicative seulement) |
| Relations complexes | Clés étrangères, JOINs performants | MongoDB (NoSQL, JOIN difficile) |
| Conformité RGPD | Hébergement EU possible | Certains services sans option EU |
| Temps réel | Intégré (Realtime) | Firebase (vendor lock-in fort) |
| Auth | Supabase Auth intégré | Auth0 (coût supplémentaire) |
| Compatibilité OnSpace | Natif OnSpace Cloud | — |
| Open source | PostgreSQL + Supabase OSS | Firebase (propriétaire) |

---

## Règles d'implémentation

### Schéma
1. Toutes les tables métier ont `tenant_id UUID NOT NULL`
2. Toutes les tables ont `id UUID DEFAULT uuid_generate_v4()`
3. Toutes les tables ont `created_at TIMESTAMPTZ DEFAULT NOW()`
4. Toutes les tables ont `updated_at TIMESTAMPTZ DEFAULT NOW()`
5. Soft delete : `deleted_at TIMESTAMPTZ` sur les entités critiques (pas de suppression physique)
6. Versioning : `version INTEGER DEFAULT 1` sur les entités avec contrôle de concurrence

### Migrations
- Toutes les évolutions de schéma passent par des fichiers de migration
- Aucune modification directe du schéma en production
- Format : `V{numero}_{YYYY-MM-DD}_{description}.sql`
- Migrations immuables — jamais modifiées après application

### Sécurité
- RLS activé sur toutes les tables tenant-specific
- Jamais de `service_role` key exposée côté frontend
- Accès anonyme uniquement pour le portail voyageur (token réservation)
- Edge Functions pour toute logique sensible

### Performance
- Index sur : `tenant_id`, `property_id`, `reservation_id`, `status`, `created_at`
- Pagination obligatoire sur toutes les listes
- Queries filtrées par `tenant_id` en premier

---

## Conséquences

### Positives
- Infrastructure gérée (pas de DBA nécessaire)
- RLS — isolation tenant garantie au niveau moteur
- Realtime intégré
- Auth intégré
- Storage intégré
- Compatible OnSpace Cloud natif

### Négatives / Risques
- Dépendance à Supabase comme fournisseur
- Limites de scaling Supabase pour très grandes volumétries (mitigation : architecture modulaire permet migration future)
- PostgreSQL single-region par défaut (mitigation V2 : multi-region Supabase Pro)

---

## Conditions de révision

Cette décision peut être révisée si :
- Supabase ne peut plus répondre aux besoins de scaling
- Exigence de déploiement on-premise enterprise

---

## Décision gelée

Cette décision est **GELÉE**. Toute modification nécessite un ADR supérieur avec plan de migration de données.
