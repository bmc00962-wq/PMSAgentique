# BUSINESS RULES

Règles métier fondamentales du PMS SaaS Agentique.

---

## Règles de Calendrier

### BR-CAL-001 — Source unique de vérité
Le calendrier PMS est la seule source officielle de disponibilité.
Toutes les plateformes OTA doivent se synchroniser depuis le PMS, jamais l'inverse sans réconciliation.

### BR-CAL-002 — Contrôle de concurrence
Avant toute création de réservation :
1. Vérifier la disponibilité
2. Valider la version du calendrier
3. Acquérir un verrou
4. Créer la réservation
5. Mettre à jour le calendrier
6. Libérer le verrou (COMMIT)
Toute tentative de réservation sur une période déjà verrouillée doit échouer proprement.

### BR-CAL-003 — Types de blocs mutuellement exclusifs
Une unité ne peut avoir qu'un seul bloc actif sur une période donnée.
Types : available | reserved | owner_block | maintenance | housekeeping | check_in | check_out

---

## Règles de Réservation

### BR-RES-001 — Idempotence OTA
Toute réservation entrante d'un canal OTA doit être identifiée par :
`SHA256(provider + provider_account_id + provider_reservation_id)`
Un doublon doit être ignoré silencieusement (pas d'erreur, pas de duplication).

### BR-RES-002 — Statuts valides
Transitions autorisées :
- pending → confirmed
- pending → cancelled
- confirmed → checked_in
- confirmed → cancelled
- confirmed → modified → confirmed
- checked_in → checked_out
- confirmed → no_show

### BR-RES-003 — Annulation
Toute annulation doit enregistrer : motif, date, origine (guest / manager / channel / system), et déclencher une évaluation de remboursement.

### BR-RES-004 — tenant_id jamais fourni par le frontend
Le tenant_id d'une réservation doit toujours provenir du contexte d'authentification, jamais d'un paramètre de formulaire.

---

## Règles de Ménage

### BR-HK-001 — Déclenchement automatique
Un job de ménage DOIT être créé automatiquement lors de chaque checkout (statut → checked_out).

### BR-HK-002 — Propriété non prête
Une propriété dont le ménage n'est pas validé ne peut pas recevoir de nouveau check-in.

### BR-HK-003 — Inspection obligatoire
Après chaque job de ménage, une inspection doit être réalisée avant que la propriété soit marquée "prête".

### BR-HK-004 — Escalade automatique
Si une inspection échoue : créer automatiquement un ticket de maintenance et notifier le superviseur.

---

## Règles d'Accès

### BR-ACC-001 — Condition de génération de code d'accès
Un code d'accès ne peut être généré que si :
- `reservation.status = confirmed`
- `property.status = ready`
- `access_policy.valid = true`

### BR-ACC-002 — Aucun LLM pour les codes d'accès
Les codes d'accès ne sont jamais générés, transmis ou interprétés par un LLM.

---

## Règles Financières

### BR-FIN-001 — Déterminisme financier
Aucun calcul financier (commissions, relevés, taxes) ne doit être réalisé par un LLM.
Tous les calculs sont réalisés par le moteur financier déterministe.

### BR-FIN-002 — Séparation des flux
Quatre flux financiers distincts et séparés :
1. SaaS Billing (tenant → plateforme)
2. Guest Payment (voyageur → agence)
3. Owner Payout (agence → propriétaire)
4. Vendor Payment (agence → prestataire)

### BR-FIN-003 — Seuils d'approbation
Tout remboursement ou paiement au-delà du seuil configuré par tenant nécessite une approbation humaine.

---

## Règles Agents IA

### BR-AI-001 — Aucun accès direct PostgreSQL
Aucun agent IA ne peut accéder directement à la base de données.
Tous les accès passent par le Tool Registry → PMS API.

### BR-AI-002 — Données factuelles depuis le PMS
L'IA ne peut jamais inventer ou halluciner :
- Adresse d'une propriété
- Prix d'une réservation
- Dates de séjour
- Code d'accès
Ces données doivent toujours provenir d'une requête API au PMS.

### BR-AI-003 — Humain dans la boucle
Toute décision critique d'un agent doit passer par le circuit d'approbation humain avant exécution.

---

## Règles de Sécurité

### BR-SEC-001 — Isolation tenant
Un utilisateur d'un tenant A ne peut jamais lire, modifier ou supprimer les données d'un tenant B.
Cette isolation est enforced par Row Level Security au niveau PostgreSQL.

### BR-SEC-002 — Validation côté serveur
Toutes les autorisations sensibles sont validées côté serveur via `canUserPerform()`.
Le frontend ne décide jamais seul si une action est autorisée.

### BR-SEC-003 — Audit obligatoire
Toute action sensible (création/modification/suppression de réservation, paiement, accès, approbation) génère un `audit_event` immuable.

---

## Règles de Multitenance

### BR-MT-001 — tenant_id sur toutes les tables métier
Toutes les tables de données spécifiques à un tenant comportent `tenant_id UUID NOT NULL`.

### BR-MT-002 — Résolution du contexte tenant
Le tenant_id doit toujours être résolu via `resolveTenantContext()` depuis :
- L'utilisateur authentifié (TenantMembership)
- Le domaine de la requête
- Le compte d'intégration authentifié
Jamais depuis un paramètre de formulaire.

---

## Règles n8n

### BR-N8N-001 — n8n n'est pas une source de vérité
n8n est un moteur d'orchestration. Il ne stocke aucune donnée métier.

### BR-N8N-002 — n8n passe par les APIs internes
n8n ne modifie jamais directement les tables PostgreSQL.
Il utilise exclusivement les APIs internes sécurisées du PMS.

### BR-N8N-003 — Idempotence des appels n8n
Tout appel n8n doit inclure : `Authorization`, `X-Correlation-ID`, `Idempotency-Key`.
