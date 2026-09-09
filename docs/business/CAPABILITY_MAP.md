# CAPABILITY MAP

Carte complète des 24 capacités métier du PMS SaaS Agentique, décomposées par version.

---

## 1. TENANT MANAGEMENT

**Description** : Gestion des entreprises clientes de la plateforme SaaS.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Onboarding tenant | ✅ | | | |
| Configuration tenant (branding, domaine) | ✅ | | | |
| Gestion des membres et rôles | ✅ | | | |
| Plans et subscriptions | | ✅ | | |
| Quotas (propriétés, utilisateurs, stockage) | | ✅ | | |
| Suspension / réactivation tenant | | ✅ | | |
| Export données tenant | | | ✅ | |
| Migration tenant (shared → dedicated) | | | | ✅ |
| SLA enterprise | | | | ✅ |

---

## 2. OWNER MANAGEMENT

**Description** : Gestion des propriétaires des biens.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Création / édition profil propriétaire | ✅ | | | |
| Gestion des contrats | ✅ | | | |
| Association propriétaire ↔ propriétés | ✅ | | | |
| Portail propriétaire (lecture) | ✅ | | | |
| Notifications propriétaire | ✅ | | | |
| Relevés financiers | | ✅ | | |
| Approbation propriétaire (maintenance majeure) | | ✅ | | |
| Portail propriétaire avancé (mobile) | | | ✅ | |

---

## 3. PROPERTY MANAGEMENT

**Description** : Gestion des propriétés et unités.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Création / édition propriété | ✅ | | | |
| Gestion des unités | ✅ | | | |
| Adresse et géolocalisation | ✅ | | | |
| Équipements (amenities) | ✅ | | | |
| Documents (contrats, assurances) | ✅ | | | |
| Photos | ✅ | | | |
| Règles de la propriété | ✅ | | | |
| Enregistrements légaux | | ✅ | | |
| Gestion des clés (physiques) | | ✅ | | |
| Score de qualité propriété | | | ✅ | |

---

## 4. LISTING MANAGEMENT

**Description** : Gestion des annonces sur les plateformes OTA.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Création d'annonce PMS (interne) | ✅ | | | |
| Mapping annonce ↔ canal | | ✅ | | |
| Push listing vers Airbnb | | ✅ | | |
| Push listing vers Booking.com | | ✅ | | |
| Push listing vers Vrbo | | ✅ | | |
| Optimisation listing par IA | | | ✅ | |
| A/B testing descriptions | | | | ✅ |

---

## 5. CHANNEL MANAGEMENT

**Description** : Connexion et synchronisation avec les plateformes OTA.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| iCalendar sync (Level 1) | ✅ | | | |
| Réception réservations OTA | ✅ | | | |
| Certified Channel Manager (Level 2) | | ✅ | | |
| Direct API OTA (Level 3) | | | ✅ | |
| Push disponibilités temps réel | | ✅ | | |
| Push tarifs | | ✅ | | |
| Résolution conflits de sync | | ✅ | | |
| Health check connexions | | ✅ | | |
| Réconciliation quotidienne | | ✅ | | |

---

## 6. CALENDAR MANAGEMENT

**Description** : Gestion du calendrier central de disponibilités.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Calendrier propriété (source de vérité) | ✅ | | | |
| Types de blocs (available, reserved, owner_block, maintenance, housekeeping) | ✅ | | | |
| Vue jour / semaine / mois | ✅ | | | |
| Vue multi-propriétés | | ✅ | | |
| Contrôle de concurrence (version lock) | ✅ | | | |
| Règles tarifaires par période | | ✅ | | |
| Restrictions (min nights, check-in days) | | ✅ | | |
| Synchronisation bi-directionnelle OTA | | ✅ | | |
| Optimisation tarifaire par IA (Revenue Management) | | | ✅ | |

---

## 7. RESERVATION MANAGEMENT

**Description** : Gestion complète du cycle de vie des réservations.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Création manuelle de réservation | ✅ | | | |
| Réservation OTA (import) | ✅ | | | |
| Réservation directe (portail) | | ✅ | | |
| Modification de réservation | ✅ | | | |
| Annulation avec politique | ✅ | | | |
| Check-in / check-out | ✅ | | | |
| Historique des statuts | ✅ | | | |
| Idempotence réservations OTA | ✅ | | | |
| Extension de séjour | | ✅ | | |
| No-show management | | ✅ | | |
| Contrat de séjour digital | | | ✅ | |

---

## 8. GUEST MANAGEMENT

**Description** : Gestion des profils voyageurs.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Profil voyageur | ✅ | | | |
| Historique des séjours | ✅ | | | |
| Portail voyageur (instructions, accès) | ✅ | | | |
| Vérification identité | | ✅ | | |
| Programme fidélité | | | ✅ | |
| Segmentation voyageurs | | | ✅ | |
| CRM voyageurs avancé | | | | ✅ |

---

## 9. COMMUNICATION MANAGEMENT

**Description** : Gestion de toutes les communications (voyageurs, équipes, propriétaires).

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Templates de messages | ✅ | | | |
| Messages automatiques pré/post séjour | ✅ | | | |
| Boîte de messages unifiée | ✅ | | | |
| Notifications push / email / SMS | | ✅ | | |
| Triage messages par IA | | ✅ | | |
| Réponses suggérées par IA | | ✅ | | |
| Communication multi-canal (WhatsApp, etc.) | | | ✅ | |
| Traduction automatique | | | ✅ | |

---

## 10. HOUSEKEEPING MANAGEMENT

**Description** : Gestion du ménage et de l'entretien.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Création de jobs ménage post-checkout | ✅ | | | |
| Affectation équipes | ✅ | | | |
| Checklists configurables | ✅ | | | |
| Upload photos de preuve | ✅ | | | |
| Statut en temps réel | ✅ | | | |
| Score d'affectation (disponibilité, distance, qualité) | | ✅ | | |
| Application mobile cleaner | | ✅ | | |
| Historique qualité par équipe | | ✅ | | |
| Facturation prestataire ménage | | | ✅ | |

---

## 11. INSPECTION MANAGEMENT

**Description** : Inspection qualité des propriétés.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Inspection post-ménage | ✅ | | | |
| Findings avec photos | ✅ | | | |
| Validation "propriété prête" | ✅ | | | |
| Escalade inspection échouée | ✅ | | | |
| Score de qualité par propriété | | ✅ | | |
| Inspection d'inventaire | | ✅ | | |
| Rapport d'inspection propriétaire | | ✅ | | |

---

## 12. TRANSPORT MANAGEMENT

**Description** : Gestion du transport du personnel.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Gestion des trajets | ✅ | | | |
| Affectation chauffeur ↔ équipe | ✅ | | | |
| Confirmation de prise en charge | ✅ | | | |
| Interface mobile chauffeur | ✅ | | | |
| Optimisation de route (IRouteProvider) | | ✅ | | |
| Tracking temps réel | | | ✅ | |

---

## 13. DRIVER MANAGEMENT

**Description** : Gestion des chauffeurs.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Profil chauffeur | ✅ | | | |
| Gestion des véhicules | ✅ | | | |
| Planning chauffeurs | ✅ | | | |
| Évaluation chauffeurs | | ✅ | | |

---

## 14. MAINTENANCE MANAGEMENT

**Description** : Gestion des tickets de maintenance et bons de travail.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Création ticket maintenance | ✅ | | | |
| Bon de travail | ✅ | | | |
| Affectation technicien / prestataire | ✅ | | | |
| Escalade incidents critiques | ✅ | | | |
| Devis prestataire | | ✅ | | |
| Approbation maintenance majeure | | ✅ | | |
| Historique maintenance propriété | | ✅ | | |
| Maintenance préventive planifiée | | | ✅ | |

---

## 15. INVENTORY MANAGEMENT

**Description** : Gestion des inventaires des propriétés.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Liste d'inventaire par propriété | | ✅ | | |
| Check inventaire à l'inspection | | ✅ | | |
| Signalement d'objets manquants / endommagés | | ✅ | | |
| Réclamation voyageur | | | ✅ | |

---

## 16. SMART LOCK MANAGEMENT

**Description** : Gestion des serrures intelligentes et codes d'accès.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Génération de codes d'accès (via ISmartLockProvider) | | ✅ | | |
| Politique d'accès (réservation confirmée + propriété prête) | | ✅ | | |
| Événements d'accès | | ✅ | | |
| Révocation de codes | | ✅ | | |
| Audit accès | | ✅ | | |
| Support multi-providers (Schlage, Yale, August...) | | | ✅ | |

---

## 17. PAYMENT MANAGEMENT

**Description** : Gestion des paiements voyageurs.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Enregistrement paiements (manuel) | ✅ | | | |
| Stripe comme premier provider | | ✅ | | |
| Remboursements | | ✅ | | |
| Taxes (TPS/TVQ Canada, TVA Maroc) | | ✅ | | |
| Réconciliation paiements OTA | | ✅ | | |
| Paiements en plusieurs fois | | | ✅ | |
| Multi-currency | | ✅ | | |

---

## 18. OWNER FINANCE

**Description** : Gestion financière des propriétaires.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Règles de commission | | ✅ | | |
| Calcul des revenus propriétaires | | ✅ | | |
| Relevés mensuels propriétaires | | ✅ | | |
| Paiements propriétaires | | ✅ | | |
| Grand livre (ledger) | | ✅ | | |
| Export comptable | | ✅ | | |
| Rapport fiscal propriétaire | | | ✅ | |

---

## 19. REPORTING

**Description** : Rapports et tableaux de bord.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Dashboard opérationnel | ✅ | | | |
| Taux d'occupation | | ✅ | | |
| RevPAR | | ✅ | | |
| Rapport ménage / qualité | | ✅ | | |
| Rapport financier propriétaire | | ✅ | | |
| Rapport canaux | | ✅ | | |
| Rapports personnalisés | | | ✅ | |
| Business Intelligence avancée | | | | ✅ |

---

## 20. APPROVAL MANAGEMENT

**Description** : Circuit de validation humain pour les décisions critiques.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Circuit approbation maintenance majeure | | ✅ | | |
| Circuit approbation remboursement > seuil | | ✅ | | |
| Circuit approbation décision agent IA | | ✅ | | |
| Escalade automatique si délai dépassé | | ✅ | | |
| Délégation d'approbation | | | ✅ | |

---

## 21. AI AGENT MANAGEMENT

**Description** : Gestion des agents IA.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Agent triage messages | | ✅ | | |
| Agent dispatch ménage | | ✅ | | |
| Agent revenu | | | ✅ | |
| Agent conformité | | | ✅ | |
| Agent incidents | | ✅ | | |
| Politique agents (quoi faire / ne pas faire) | | ✅ | | |
| Logs complets des runs agents | | ✅ | | |
| Humain dans la boucle (approbation) | | ✅ | | |

---

## 22. AUDIT MANAGEMENT

**Description** : Traçabilité complète de toutes les actions.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Audit event pour chaque action sensible | ✅ | | | |
| Recherche dans les logs d'audit | | ✅ | | |
| Export audit pour auditeur externe | | ✅ | | |
| Rapport de conformité | | | ✅ | |

---

## 23. SAAS BILLING

**Description** : Facturation SaaS des tenants.

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Plans de subscription | | ✅ | | |
| Métriques d'usage | | ✅ | | |
| Facturation automatique | | ✅ | | |
| Portail facturation tenant | | ✅ | | |
| Plans personnalisés enterprise | | | | ✅ |

---

## 24. COMPLIANCE MANAGEMENT

**Description** : Conformité réglementaire (RGPD, local).

| Fonctionnalité | MVP | V1 | V2 | V3 |
|----------------|-----|----|----|-----|
| Politique de rétention des données | | ✅ | | |
| Droit à l'oubli (RGPD) | | ✅ | | |
| Conformité Canada (LPRPDE) | | ✅ | | |
| Conformité Maroc (Commission CNDP) | | ✅ | | |
| Déclaration location touristique | | | ✅ | |
| Rapport fiscal multi-pays | | | | ✅ |
