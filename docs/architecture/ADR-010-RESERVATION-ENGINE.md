# ADR-010 — Moteur de Réservations — State Machine & Business Rules

**Status:** FROZEN  
**Date:** 2026-08-09  
**Phase:** PROMPT 10 — Reservation Engine  
**Décision par:** Architecture PMS SaaS

---

## Contexte

Le moteur de réservations est le cœur fonctionnel du PMS. Il gère le cycle de vie complet
d'une réservation depuis la demande initiale jusqu'au départ du voyageur, avec des transitions
strictement définies, une comptabilité déterministe, et une auditabilité complète.

---

## Décision

### 1. Machine à états — 7 statuts

```
inquiry → pending → confirmed → checked_in → checked_out
                  ↗          ↘ cancelled
                                          → no_show
```

Transitions autorisées :

| De | Vers | Acteur | Permission |
|----|------|--------|------------|
| inquiry | pending | system / channel | reservation.create |
| pending | confirmed | property_manager, tenant_admin | reservation.confirm |
| pending | cancelled | any, guest | reservation.cancel |
| confirmed | checked_in | system (auto), property_manager | reservation.check_in |
| confirmed | cancelled | property_manager, tenant_admin | reservation.cancel |
| checked_in | checked_out | system (auto), property_manager | reservation.check_out |
| confirmed | no_show | system (T+2h), tenant_admin | reservation.flag_no_show |

**Toute transition invalide retourne `ERR_INVALID_TRANSITION`.**

---

### 2. Vérification de disponibilité avant création

Avant tout INSERT sur `reservation`, l'Edge Function :
1. Vérifie la disponibilité via `SELECT FOR UPDATE` sur `calendar_availability` (ADR-009)
2. Si conflit → retourne `ERR_OVERLAP` avec les dates en conflit
3. Si OK → commit atomique + mise à jour de `calendar_availability`

---

### 3. Calcul déterministe des charges

```
charges = [
  { type: base_rent,     amount: nights × base_price },
  { type: cleaning_fee,  amount: property.cleaning_fee },
  { type: tax,           amount: base_rent × tax_rate },     // CAD: 14.975%, MAD: 10%
  { type: service_fee,   amount: base_rent × ota_commission } // OTA uniquement ≈ 12%
]
```

**LLM INTERDIT** pour tout calcul financier (PERMANENT_RULES).  
Formules déterministes, valeurs `NUMERIC(12,4)` (ADR-006).

---

### 4. Audit trail append-only

- `reservation_status_history` : chaque transition crée une ligne immuable
- `ledger_entry` : chaque charge crée une entrée comptable immuable
- Aucune de ces tables n'accepte UPDATE ou DELETE (RLS ADR-007)

---

### 5. Annulation

- Calcul du remboursement selon `cancellation_policy` × jours avant arrivée :
  - flexible : 100% si > 24h, 0% sinon
  - moderate  : 50% si > 5j, 0% sinon
  - strict    : 50% si > 7j, 0% sinon
  - non_refundable : 0%
- Soft delete sur `reservation` : `cancelled_at TIMESTAMPTZ`, `cancelled_by UUID`
- Libération immédiate dans `calendar_availability`
- Notification automatique via n8n workflow W-03 (ADR-003)

---

### 6. Imports OTA

- Chaque import porte une `idempotency_key` (ADR-009)
- Le statut OTA est mappé vers le statut canonique PMS :
  - Airbnb `accepted` → `confirmed`
  - Booking `modified` → màj si statut PMS ≤ `pending`
- L'import ne remplace jamais les modifications manuelles d'un `confirmed`

---

### 7. Portail voyageur (V1)

- Guest JWT signé avec `reservation_id` + `email`
- Accès RLS limité à sa réservation unique (ADR-007 contexte `guest`)
- Ne peut consulter que : dates, charges, instructions arrivée, lien annulation

---

## Conséquences

✅ **Avantages :**
- Machine à états explicite → pas de statuts incohérents
- Audit trail complet via `reservation_status_history` append-only
- Calculs déterministes → pas d'erreur financière possible

⚠️ **Contraintes :**
- Toute transition passe par Edge Function (pas de mise à jour directe DB)
- n8n orchestre via PMS API uniquement (ADR-003)
- agents IA créent `ApprovalRequest` → humain valide (ADR-005)

❌ **Alternatives rejetées :**
- Statuts libres sans machine à états → incohérences garanties
- LLM pour calcul des charges → INTERDIT par PERMANENT_RULES
- Transitions directes via frontend → INTERDIT (canUserPerform() server-side)

---

## Référence croisée

- ADR-005 : canUserPerform() avant toute transition de statut
- ADR-006 : NUMERIC(12,4) pour toutes les charges monétaires
- ADR-007 : reservation_status_history et ledger_entry append-only
- ADR-009 : calendar_availability SELECT FOR UPDATE avant création
- PERMANENT_RULES : LLM interdit pour calculs financiers
