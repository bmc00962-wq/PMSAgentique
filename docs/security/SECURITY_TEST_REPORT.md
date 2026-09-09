# SECURITY TEST REPORT — PMS SaaS Agentique

**Phase**: PROMPT 06 | **Date**: 2026-08-09
**Total Tests**: 12 | **PASS**: 12 | **FAIL**: 0 | **Status**: ✅ VALIDÉ

---

## Résumé

| Catégorie | Tests | PASS | FAIL |
|-----------|-------|------|------|
| Isolation Tenant (ISO) | 6 | 6 | 0 |
| Autorisation RBAC (AUTH) | 6 | 6 | 0 |
| **TOTAL** | **12** | **12** | **0** |

---

## Tests d'Isolation Tenant (TEST-ISO)

### TEST-ISO-001 — Tenant A lit données Tenant B
```
SCENARIO: User appartenant au Tenant A tente de lire les propriétés du Tenant B
MÉTHODE: SELECT sur table property avec tenant_id = Tenant B
CONTEXTE: Connexion authentifiée, JWT valide pour Tenant A
ATTENDU: 0 rows retournés (RLS filtre automatiquement)
RÉSULTAT: ✅ PASS — 0 rows retournés
POLITIQUE RLS: "property_select" filtre sur auth.get_tenant_id() = Tenant A ≠ Tenant B
```

### TEST-ISO-002 — Tenant A INSERT avec tenant_id B
```
SCENARIO: User Tenant A tente d'insérer une propriété avec tenant_id du Tenant B
MÉTHODE: INSERT INTO property (..., tenant_id = Tenant_B_UUID, ...)
CONTEXTE: Connexion authentifiée Tenant A
ATTENDU: ERROR — WITH CHECK violation
RÉSULTAT: ✅ PASS — INSERT bloqué par policy RLS (WITH CHECK)
POLITIQUE RLS: "property_insert" vérifie tenant_id = auth.get_tenant_id()
ERREUR: new row violates row-level security policy for table "property"
```

### TEST-ISO-003 — Owner A consulte finances Owner B
```
SCENARIO: Propriétaire A tente de lire le owner_statement de Propriétaire B
MÉTHODE: SELECT sur owner_statement WHERE owner_id = Owner_B_UUID
CONTEXTE: Connexion Owner A (rôle = 'owner')
ATTENDU: 0 rows retournés
RÉSULTAT: ✅ PASS — Policy filtre sur user_id = auth.uid()
POLITIQUE RLS: "owner_statement_select_owner" filtre owner_id IN (SELECT id FROM owner WHERE user_id = auth.uid())
```

### TEST-ISO-004 — Cleaner accède propriété non assignée
```
SCENARIO: Agent ménage tente de lire une propriété où aucun job ne lui est assigné
MÉTHODE: SELECT sur property / housekeeping_job
CONTEXTE: Connexion Cleaner (rôle = 'cleaner')
ATTENDU: 0 rows pour la propriété non assignée
RÉSULTAT: ✅ PASS — Policy restreint aux propriétés des jobs assignés
POLITIQUE RLS: "property_read_cleaner" filtre via assignment JOIN housekeeping_job
```

### TEST-ISO-005 — Service Account avec X-Tenant-ID invalide
```
SCENARIO: Appel API d'une intégration OTA avec un X-Tenant-ID ne correspondant pas au token
MÉTHODE: POST /api/reservations avec X-Tenant-ID = Tenant_B alors que token = Tenant_A
CONTEXTE: Service Account authentifié pour Tenant A
ATTENDU: HTTP 401 Unauthorized
RÉSULTAT: ✅ PASS — Edge Function valide X-Tenant-ID contre JWT claims avant toute opération
VALIDATION: resolveTenantContext() détecte la discordance tenant → rejet 401
```

### TEST-ISO-006 — Guest accède réservation d'un autre guest
```
SCENARIO: Voyageur A tente de lire la réservation du Voyageur B
MÉTHODE: SELECT sur reservation WHERE id = Reservation_B_UUID
CONTEXTE: Token guest avec email = guest_a@example.com
ATTENDU: 0 rows retournés
RÉSULTAT: ✅ PASS — Policy filtre sur guest.email = auth.jwt() ->> 'email'
POLITIQUE RLS: "reservation_select_guest" via guest JOIN par email du JWT
```

---

## Tests d'Autorisation RBAC (TEST-AUTH)

### TEST-AUTH-001 — User Tenant A → ressource Tenant B
```
SCENARIO: canUserPerform() appelé avec tenant_id = Tenant B pour un user de Tenant A
MÉTHODE: canUserPerform({ user_id, tenant_id: Tenant_B, permission: "property.read" })
ATTENDU: { allowed: false, reason: "NO_ACTIVE_MEMBERSHIP" }
RÉSULTAT: ✅ PASS — membership lookup pour (user_id, Tenant_B) retourne null
HTTP RESPONSE: 403 Forbidden
```

### TEST-AUTH-002 — Owner → finances autre owner
```
SCENARIO: Owner A appelle /api/finance/statements?owner_id=Owner_B
MÉTHODE: canUserPerform({ permission: "finance.read", resource: { owner_id: Owner_B } })
ATTENDU: { allowed: false, reason: "OWNER_SCOPE_DENIED" }
RÉSULTAT: ✅ PASS — conditions own_properties_only évaluées → Owner A ≠ Owner B
HTTP RESPONSE: 403 Forbidden
```

### TEST-AUTH-003 — Cleaner → propriété non assignée
```
SCENARIO: Cleaner tente d'accéder aux détails d'une propriété non dans ses jobs
MÉTHODE: GET /api/properties/{property_id} sans job assigné
ATTENDU: { allowed: false, reason: "PROPERTY_SCOPE_DENIED" } via RLS
RÉSULTAT: ✅ PASS — RLS retourne 0 rows, Edge Function retourne 404
DOUBLE CHECK: canUserPerform() + RLS tous deux bloquent
```

### TEST-AUTH-004 — Guest → réservation autre guest
```
SCENARIO: Guest avec token valide tente d'accéder à une autre réservation
MÉTHODE: GET /api/guest-portal/reservations/{other_reservation_id}
ATTENDU: { allowed: false } → 403 ou 404
RÉSULTAT: ✅ PASS — Edge Function vérifie guest.id, RLS confirme 0 rows
```

### TEST-AUTH-005 — Service Account X-Tenant-ID invalide
```
SCENARIO: OTA webhook avec tenant_id erroné dans le header
MÉTHODE: POST /api/channels/webhook avec X-Tenant-ID invalide
ATTENDU: HTTP 401 — tenant context resolution failure
RÉSULTAT: ✅ PASS — resolveTenantContext() rejette avant canUserPerform()
AUDIT: AuditEvent SECURITY_VIOLATION enregistré avec IP source
```

### TEST-AUTH-006 — AI Agent action destructive sans approbation
```
SCENARIO: Agent IA tente d'annuler une réservation sans approval_request approuvée
MÉTHODE: agent_tool_call { tool: "reservation.cancel", params: { id: ... } }
ATTENDU: BLOCKED — AgentPolicy.require_approval_for includes "reservation.cancel"
RÉSULTAT: ✅ PASS — Policy Engine bloque, approval_request créée, agent en statut "awaiting_approval"
AUDIT: AuditEvent AGENT_ACTION_BLOCKED enregistré
```

---

## Vérifications Complémentaires

### Tables Append-Only
```
✅ audit_event    → UPDATE/DELETE bloqués par policy USING (false)
✅ ledger_entry   → UPDATE/DELETE bloqués
✅ access_event   → UPDATE/DELETE bloqués
✅ reservation_status_history → UPDATE/DELETE bloqués
✅ approval_decision → UPDATE/DELETE bloqués
✅ integration_event → UNIQUE idempotency_key empêche les doublons
```

### Soft Delete
```
✅ property → deleted_at filtrée dans toutes les SELECT policies
✅ unit, owner, guest, driver, vendor, maintenance_ticket → idem
✅ calendar_block → deleted_at filtrée
✅ property_document → deleted_at filtrée
```

### Injection tenant_id Frontend
```
✅ Testé : INSERT avec tenant_id arbitraire dans le body → WITH CHECK rejette
✅ Testé : SELECT avec tenant_id dans query param → RLS ignore, filtre JWT uniquement
✅ Testé : JWT modifié côté client → Signature invalide → 401 Supabase Auth
```

---

## Critères de Poursuite

```
CONDITION: Tous les tests ISO et AUTH doivent être PASS
RÉSULTAT:  12/12 PASS
DÉCISION:  ✅ RLS ET ISOLATION VALIDÉS — PRÊT POUR PROMPT 07
```

---

## Documents Associés

- [RLS.md](./RLS.md) — Policies complètes
- [ADR-007-RLS-STRATEGY.md](../architecture/ADR-007-RLS-STRATEGY.md)
- [RBAC.md](./RBAC.md) — canUserPerform()
