# PERSONAS

Tous les personas identifiés pour le PMS SaaS Agentique.

---

## 1. Platform Super Admin

**Rôle** : Administrateur de la plateforme SaaS globale (équipe interne).

**Responsabilités**
- Gestion de tous les tenants
- Activation / suspension / migration de tenants
- Configuration des plans et fonctionnalités
- Accès complet à tous les logs et audits
- Gestion des incidents critiques inter-tenants

**Besoins**
- Vue globale de tous les tenants
- Métriques d'usage SaaS
- Outils de support et débogage

**Niveau d'accès** : SUPERADMIN — accès total cross-tenant (hors données financières privées propriétaires)

**Données utilisées** : tenant, subscription, plan, usage_metric, audit_event, incident

---

## 2. Tenant Administrator

**Rôle** : Administrateur principal de l'entreprise de gestion (ex : directeur général de l'agence).

**Responsabilités**
- Configuration complète du tenant (branding, domaine, paramètres)
- Gestion des membres et rôles
- Activation des intégrations canaux
- Configuration des règles de commission
- Validation des décisions financières majeures
- Accès aux rapports complets

**Besoins**
- Tableau de bord exécutif
- Gestion d'équipe
- Paramétrage métier global

**Niveau d'accès** : TENANT_ADMIN — accès complet dans son tenant

**Données utilisées** : toutes les tables du tenant

---

## 3. Operations Manager

**Rôle** : Responsable des opérations quotidiennes.

**Responsabilités**
- Supervision du planning ménage, inspection, transport
- Gestion des incidents opérationnels
- Approbation des décisions opérationnelles
- Suivi des KPIs opérationnels

**Besoins**
- Vue multi-propriétés en temps réel
- Tableau d'affectation des équipes
- Alertes et escalades

**Niveau d'accès** : Lecture/écriture opérations, lecture finances (agrégées), pas d'accès admin tenant

**Données utilisées** : task, assignment, housekeeping_job, inspection, transport_trip, maintenance_ticket, incident

---

## 4. Property Manager

**Rôle** : Gestionnaire d'un portefeuille de propriétés spécifiques.

**Responsabilités**
- Gestion des propriétés assignées
- Suivi des réservations
- Coordination ménage / inspection
- Communication voyageurs
- Rapports propriétaires

**Besoins**
- Vue calendrier par propriété
- Gestion des tâches opérationnelles
- Communication centralisée

**Niveau d'accès** : Accès limité aux propriétés assignées, pas de vue financière complète

**Données utilisées** : property, unit, reservation, calendar, housekeeping_job, inspection, conversation, owner_statement (agrégé)

---

## 5. Portfolio Manager

**Rôle** : Gestionnaire d'un grand portefeuille multi-propriétaires.

**Responsabilités**
- Supervision stratégique du portefeuille
- Optimisation des revenus
- Relations propriétaires senior
- Approbation des règles tarifaires

**Besoins**
- Analytics de performance
- Vue consolidée multi-propriétaires
- Comparaisons benchmarks

**Niveau d'accès** : Lecture étendue, écriture sur règles tarifaires et contrats

**Données utilisées** : property, owner, rate_plan, owner_statement, reservation (agrégé)

---

## 6. Owner (Propriétaire)

**Rôle** : Propriétaire des biens loués.

**Responsabilités**
- Suivi de ses propriétés
- Consultation de ses finances
- Approbation de certaines décisions (maintenance majeure, contrats)
- Blocage de disponibilités personnelles

**Besoins**
- Portail propriétaire simple
- Relevés financiers clairs
- Calendrier de ses propriétés
- Notifications importantes

**Niveau d'accès** : Lecture de ses propriétés uniquement, ses finances uniquement, aucune vue cross-owner

**Données utilisées** : property (les siennes), reservation (agrégé), owner_statement, calendar_block, maintenance_ticket (lecture)

---

## 7. Accountant

**Rôle** : Comptable interne ou externe.

**Responsabilités**
- Gestion des paiements voyageurs
- Gestion des paiements prestataires
- Génération des relevés propriétaires
- Réconciliation financière
- Exportation comptable

**Besoins**
- Accès complet aux données financières
- Outils d'export
- Rapports de réconciliation

**Niveau d'accès** : Lecture/écriture finance, pas d'accès opérations ni admin

**Données utilisées** : payment, refund, payout, expense, commission_rule, owner_statement, ledger_entry

---

## 8. Customer Service Agent

**Rôle** : Agent de service client (communication voyageurs).

**Responsabilités**
- Réponse aux messages voyageurs
- Résolution des problèmes de séjour
- Création de réservations manuelles
- Escalade des incidents

**Besoins**
- Boîte de messages unifiée
- Fiche voyageur et réservation rapide
- Templates de réponse

**Niveau d'accès** : Lecture réservations et voyageurs, écriture messages, création réservations

**Données utilisées** : reservation, guest, conversation, message, message_template

---

## 9. Housekeeping Supervisor

**Rôle** : Responsable des équipes de ménage.

**Responsabilités**
- Planification des interventions
- Affectation des équipes
- Suivi des checklists
- Validation des inspections

**Besoins**
- Planning ménage par propriété
- Tableau d'affectation
- Vue statut en temps réel

**Niveau d'accès** : Lecture/écriture housekeeping et inspection, lecture calendrier

**Données utilisées** : housekeeping_job, checklist, assignment, inspection, property (lecture)

---

## 10. Cleaner (Agent de ménage)

**Rôle** : Personnel d'entretien.

**Responsabilités**
- Réalisation du ménage selon checklist
- Upload photos de preuve
- Signalement de problèmes

**Besoins**
- Vue simple de ses missions du jour
- Checklist mobile
- Upload photo facile

**Niveau d'accès** : Accès limité à ses missions assignées uniquement

**Données utilisées** : housekeeping_job (les siennes), checklist, checklist_item

---

## 11. Inspector

**Rôle** : Inspecteur qualité.

**Responsabilités**
- Inspection des propriétés après ménage
- Documentation des findings
- Validation "propriété prête"
- Escalade si défauts critiques

**Besoins**
- Formulaire d'inspection mobile
- Upload photos
- Historique des inspections

**Niveau d'accès** : Lecture/écriture inspection, lecture propriétés assignées

**Données utilisées** : inspection, inspection_finding, property (lecture), housekeeping_job (lecture)

---

## 12. Driver (Chauffeur)

**Rôle** : Chauffeur de transport du personnel.

**Responsabilités**
- Transport des équipes de ménage
- Confirmation des prises en charge
- Mise à jour du statut en temps réel

**Besoins**
- Missions du jour
- Navigation
- Confirmation livraison

**Niveau d'accès** : Accès limité à ses trajets assignés

**Données utilisées** : transport_trip (les siens), transport_stop, assignment

---

## 13. Maintenance Technician

**Rôle** : Technicien de maintenance.

**Responsabilités**
- Exécution des bons de travail
- Diagnostic des problèmes
- Upload photos avant/après
- Signalement de problèmes complémentaires

**Besoins**
- Bons de travail assignés
- Fiche propriété
- Upload photos

**Niveau d'accès** : Accès limité à ses bons de travail assignés

**Données utilisées** : work_order (les siens), maintenance_ticket (lecture), property (lecture limitée)

---

## 14. Vendor (Prestataire externe)

**Rôle** : Prestataire de services externe (plombier, électricien, etc.).

**Responsabilités**
- Soumission de devis
- Exécution de travaux
- Facturation

**Besoins**
- Portail prestataire simple
- Accès à ses devis et bons de travail

**Niveau d'accès** : Portail externe limité, pas d'accès au cœur du PMS

**Données utilisées** : vendor (le sien), work_order (assignés), quote

---

## 15. Guest (Voyageur)

**Rôle** : Client final qui séjourne dans le logement.

**Responsabilités**
- Consultation de sa réservation
- Communication avec l'équipe
- Accès aux instructions d'arrivée et codes

**Besoins**
- Portail voyageur simple
- Code d'accès sécurisé
- Instructions claires

**Niveau d'accès** : Portail public sécurisé par token de réservation uniquement

**Données utilisées** : reservation (la sienne), access_code (le sien), conversation (la sienne)

---

## 16. Auditor

**Rôle** : Auditeur interne ou externe.

**Responsabilités**
- Audit des opérations
- Vérification de la conformité
- Analyse des logs

**Besoins**
- Accès complet aux logs et audits
- Export des données d'audit
- Rapports de conformité

**Niveau d'accès** : Lecture seule sur tous les audit_event du tenant

**Données utilisées** : audit_event, integration_event, approval_request, approval_decision

---

## 17. AI Agent

**Rôle** : Agent IA automatisé (non humain).

**Responsabilités**
- Triage des messages voyageurs
- Dispatch automatique des tâches
- Analyse des revenus
- Détection des anomalies

**Besoins**
- Accès API sécurisé aux outils définis
- Politique d'autorisation stricte
- Toujours passer par le circuit d'approbation humain pour les décisions critiques

**Niveau d'accès** : Service account avec permissions granulaires par agent et par politique

**Données utilisées** : défini par agent_policy — jamais accès direct PostgreSQL

---

## 18. Integration Service Account

**Rôle** : Compte technique pour intégrations externes (n8n, webhooks, canaux OTA).

**Responsabilités**
- Appel des APIs internes PMS
- Synchronisation des réservations
- Push des disponibilités

**Besoins**
- Token d'API sécurisé
- Rate limiting
- Logs d'intégration

**Niveau d'accès** : Permissions définies par scope d'intégration, isolation tenant stricte

**Données utilisées** : integration_event, sync_conflict, reservation, calendar (via API uniquement)
