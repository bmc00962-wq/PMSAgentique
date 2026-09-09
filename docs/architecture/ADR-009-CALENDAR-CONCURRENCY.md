# ADR-009 — Contrôle de concurrence du moteur calendrier

**Status:** FROZEN  
**Date:** 2026-08-09  
**Phase:** PROMPT 09 — Calendar Engine  
**Décision par:** Architecture PMS SaaS

---

## Contexte

Le calendrier d'un PMS gère simultanément :
- Des imports OTA (Airbnb, Booking.com, Vrbo) via webhooks / iCal
- Des mutations UI directes (blocages, modifications de réservation)
- Des workflows n8n automatiques (pre-check-in, extensions, upsells)
- Des agents IA (gap detection, dynamic pricing)

Sans contrôle de concurrence strict, le risque de **double réservation** est critique (ADR-RISK-001).

---

## Décision

### 1. Table pivot : `calendar_availability`

Chaque disponibilité d'une unité pour un jour donné est une ligne unique :

```sql
calendar_availability (
  unit_id UUID NOT NULL,
  date    DATE NOT NULL,
  status  availability_status NOT NULL DEFAULT 'available',
  reservation_id UUID,
  block_id UUID,
  -- tenant isolation
  tenant_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (unit_id, date)
)
```

**Contrainte critique :** `PRIMARY KEY (unit_id, date)` — une seule ligne par unité par jour.

---

### 2. Verrou pessimiste sur toute mutation

Toute transaction qui tente de modifier une disponibilité :

```sql
BEGIN;
  SELECT * FROM calendar_availability
  WHERE unit_id = $1 AND date BETWEEN $2 AND $3
  FOR UPDATE; -- verrou pessimiste ligne par ligne
  
  -- Vérification : status = 'available' sur TOUTES les lignes
  -- Si une seule ligne est != 'available' → ROLLBACK avec code ERR_DOUBLE_BOOKING
  
  UPDATE calendar_availability SET status = 'reserved', reservation_id = $4 ...;
COMMIT;
```

---

### 3. Idempotency key sur imports OTA

Chaque événement OTA porte une `idempotency_key` (hash du channel_id + event_id).  
L'Edge Function vérifie `integration_event.idempotency_key` avant tout traitement.  
Si déjà traité → retourne 200 sans mutation (safe retry).

---

### 4. Priorité de résolution de conflits

En cas de conflit simultané entre un import OTA et une mutation manuelle :

| Priorité | Source | Raison |
|----------|--------|--------|
| 1 | Import OTA confirmé | Revenus directs, risque chargeback |
| 2 | Réservation directe confirmée | Canal propriétaire |
| 3 | Blocage propriétaire | Obligation contractuelle |
| 4 | Blocage maintenance | Opérationnel |
| 5 | Gap block / prep | Auto-généré |

---

### 5. Détection des doubles réservations

Avant tout INSERT/UPDATE sur `reservation`, l'Edge Function :
1. Appelle `canUserPerform()` (ADR-005)
2. Vérifie la disponibilité via `SELECT FOR UPDATE`
3. Si conflit → retourne `ERR_DOUBLE_BOOKING` avec les détails
4. Si OK → commit atomique
5. L'ApprovalRequest est créée si l'action vient d'un agent IA (ADR-005)

---

### 6. Tables append-only protégées (ADR-007)

- `reservation_status_history` — jamais modifiable, audit trail
- `integration_event` — idempotency log, jamais modifiable
- Toute transition de statut crée une nouvelle ligne dans `reservation_status_history`

---

## Conséquences

✅ **Avantages :**
- Garantie mathématique : pas de double réservation possible si toutes mutations passent par `SELECT FOR UPDATE`
- Idempotency key protège contre les retries OTA
- Audit complet via `reservation_status_history`

⚠️ **Contraintes :**
- `SELECT FOR UPDATE` crée une contention sur les imports massifs → mitigé par timeout configurable (default: 5s)
- n8n ne peut jamais modifier `calendar_availability` directement (ADR-003) — toujours via PMS API

❌ **Alternatives rejetées :**
- Verrouillage optimiste seul : insuffisant pour double booking (taux d'erreur non-nul)
- SKIP LOCKED : risque de silence sur conflit
- Gestion applicative sans verrou DB : violente ADR-002 (Supabase/PostgreSQL comme source de vérité)

---

## Règles d'or du calendrier

1. `calendar_availability.PRIMARY KEY (unit_id, date)` ne sera jamais supprimée
2. Toute mutation passe par Edge Function avec `SELECT FOR UPDATE`
3. n8n orchestre via PMS API, jamais accès direct à `calendar_availability`
4. Agents IA créent `ApprovalRequest` → humain valide → Edge Function execute
5. `reservation_status_history` est append-only (RLS DELETE USING false)
6. Idempotency key obligatoire pour tous les imports OTA

---

## Référence croisée

- ADR-002: Supabase/PostgreSQL comme source de vérité
- ADR-003: n8n jamais source de vérité, jamais accès direct DB
- ADR-005: canUserPerform() avant toute mutation
- ADR-007: RLS + append-only protection
- RISK R-001: Double réservation (CRITICAL)
