# RISKS REGISTER

## Format

```
### RISK-XXX — [TITLE]
- **Category**: Technical | Product | Business | Security | Compliance
- **Probability**: LOW | MEDIUM | HIGH
- **Impact**: LOW | MEDIUM | HIGH | CRITICAL
- **Status**: OPEN | MITIGATED | ACCEPTED | CLOSED
- **Description**: What is the risk
- **Mitigation**: How we address it
```

---

## Risks

### RISK-001 — Double réservation (race condition)
- **Category**: Technical
- **Probability**: MEDIUM
- **Impact**: CRITICAL
- **Status**: OPEN (mitigation prévue en PROMPT 09)
- **Description**: Deux réservations simultanées sur la même unité, période identique
- **Mitigation**: Contrôle de concurrence avec version lock + test de concurrence obligatoire avant mise en production

---

### RISK-002 — Fuite de données cross-tenant
- **Category**: Security
- **Probability**: MEDIUM
- **Impact**: CRITICAL
- **Status**: OPEN (mitigation prévue en PROMPT 06)
- **Description**: Un utilisateur d'un tenant A accède aux données d'un tenant B
- **Mitigation**: Row Level Security sur toutes les tables + tests d'isolation automatisés obligatoires

---

### RISK-003 — Désynchronisation calendrier OTA
- **Category**: Technical
- **Probability**: HIGH
- **Impact**: HIGH
- **Status**: OPEN (mitigation prévue en PROMPT 11)
- **Description**: Le calendrier PMS et les calendriers Airbnb/Booking divergent, causant des sur-réservations
- **Mitigation**: Modèle canonique PMS comme source de vérité, réconciliation quotidienne, idempotence SHA256

---

### RISK-004 — Agent IA hallucine des données factuelles
- **Category**: Technical / Product
- **Probability**: HIGH
- **Impact**: HIGH
- **Status**: MITIGATED (règle BR-AI-002 définie)
- **Description**: Un agent IA invente une adresse, un prix, des dates ou un code d'accès
- **Mitigation**: Règle stricte : toutes les données factuelles viennent d'une requête API PMS. Aucun agent n'accède directement à PostgreSQL.

---

### RISK-005 — Scope creep
- **Category**: Product
- **Probability**: HIGH
- **Impact**: MEDIUM
- **Status**: OPEN
- **Description**: Ajout de fonctionnalités non planifiées qui retardent le MVP
- **Mitigation**: Périmètre MVP verrouillé dans MVP.md. Toute nouvelle fonctionnalité est classifiée V1/V2/V3.

---

### RISK-006 — Non-conformité RGPD / LPRPDE / CNDP Maroc
- **Category**: Compliance
- **Probability**: MEDIUM
- **Impact**: HIGH
- **Status**: OPEN (mitigation prévue en V1)
- **Description**: La plateforme traite des données personnelles voyageurs, propriétaires, personnel. Non-conformité réglementaire.
- **Mitigation**: Politique de rétention, droit à l'oubli, audit trail, conformité à implémenter en V1

---

### RISK-007 — Dépendance à un provider de serrures intelligentes
- **Category**: Technical
- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Status**: MITIGATED (interface ISmartLockProvider définie)
- **Description**: Couplage fort à un fournisseur de serrures (Schlage, Yale, etc.)
- **Mitigation**: Interface ISmartLockProvider abstraite — le provider peut être remplacé sans impact sur le domaine

---

### RISK-008 — Dépendance à Stripe pour les paiements
- **Category**: Technical
- **Probability**: LOW
- **Impact**: MEDIUM
- **Status**: MITIGATED (interface IPaymentProvider définie)
- **Description**: Couplage fort à Stripe
- **Mitigation**: Interface IPaymentProvider abstraite — Stripe est le premier provider, d'autres peuvent être ajoutés

---

### RISK-009 — Disruption des APIs OTA (Airbnb, Booking)
- **Category**: Technical / Business
- **Probability**: LOW
- **Impact**: HIGH
- **Status**: OPEN
- **Description**: Airbnb ou Booking modifient leur API sans préavis
- **Mitigation**: Modèle canonique indépendant, adapters par canal, dégradation gracieuse vers iCal

---

### RISK-010 — Adoption faible marché Maroc
- **Category**: Business
- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Status**: OPEN
- **Description**: Le marché marocain pourrait avoir des besoins spécifiques non couverts (langue arabe RTL, devise MAD, réglementation locale)
- **Mitigation**: Arabe natif dès le MVP, support MAD, conformité CNDP Maroc en V1

---

## Risk Matrix Summary

| ID | Titre | Catégorie | Probabilité | Impact | Statut |
|----|-------|-----------|-------------|--------|--------|
| RISK-001 | Double réservation | Technical | MEDIUM | CRITICAL | OPEN |
| RISK-002 | Fuite cross-tenant | Security | MEDIUM | CRITICAL | OPEN |
| RISK-003 | Désync calendrier OTA | Technical | HIGH | HIGH | OPEN |
| RISK-004 | IA hallucine données | Technical | HIGH | HIGH | MITIGATED |
| RISK-005 | Scope creep | Product | HIGH | MEDIUM | OPEN |
| RISK-006 | Non-conformité RGPD | Compliance | MEDIUM | HIGH | OPEN |
| RISK-007 | Dépendance serrures | Technical | MEDIUM | MEDIUM | MITIGATED |
| RISK-008 | Dépendance Stripe | Technical | LOW | MEDIUM | MITIGATED |
| RISK-009 | Disruption API OTA | Technical/Business | LOW | HIGH | OPEN |
| RISK-010 | Adoption Maroc | Business | MEDIUM | MEDIUM | OPEN |
