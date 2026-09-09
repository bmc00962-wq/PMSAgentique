# ADR-015 — Moteur Financier

**Status**: FROZEN 2026-08-10  
**Décideurs**: Architecture Committee  
**Décision**: Moteur financier déterministe · grand livre append-only · NUMERIC(12,4) · jamais de LLM pour les calculs

---

## Contexte

Le PMS doit gérer la comptabilité de locations courte durée multitenant :
- Revenus OTA (net après commission) vs revenus directs
- Frais de ménage, taxes touristiques, TVQ/TPS Canada, TVA Maroc
- Relevés propriétaires mensuels avec fee de gestion configurable
- Paiements propriétaires (virements ou chèques)
- Rapports financiers par propriété, par canal, par période

---

## Décision

### 1. Grand Livre Append-Only

```
Table: ledger_entry
- id UUID PK
- tenant_id UUID NOT NULL → RLS
- reservation_id UUID FK (nullable)
- property_id UUID NOT NULL
- owner_id UUID FK (nullable)
- entry_type ENUM('revenue','cleaning_fee','tax','commission','expense','owner_payout','adjustment')
- label TEXT NOT NULL
- amount NUMERIC(12,4) NOT NULL   ← positif = débit, négatif = crédit
- currency CHAR(3) NOT NULL DEFAULT 'CAD'
- channel channel_type (nullable)
- status ENUM('pending','confirmed','cancelled') DEFAULT 'pending'
- period_month CHAR(7) NOT NULL  -- 'YYYY-MM'
- entry_date DATE NOT NULL
- notes TEXT
- created_at TIMESTAMPTZ DEFAULT now()
- created_by UUID NOT NULL       -- audit
-- AUCUN UPDATE ni DELETE (append-only protégé par ADR-007)
-- Annulation = entrée de sens inverse (ajustement)
```

### 2. Calculs Déterministes (JAMAIS de LLM)

Règle permanente : **aucun calcul financier via LLM**. Formules fixes :

```
gross_revenue = base_rent × nights + cleaning_fee
ota_commission = gross_revenue × channel_commission_rate
  airbnb: 3%  |  booking: 15%  |  vrbo: 5%  |  direct: 0%
tax_amount = gross_revenue × tax_rate
  Canada (QC): TVQ 9.975% + TPS 5% + Hébergement 3.5% = 18.475%
  Maroc: TVA 10% + Taxe séjour 25 MAD/nuit
management_fee = base_rent × tenant_config.management_fee_pct (default 20%)
net_owner_payout = gross_revenue - ota_commission - tax_amount - management_fee - expenses
```

Tous les taux sont stockés dans `tenant_config` — jamais codés en dur dans le frontend.

### 3. Relevés Propriétaires

```
Table: owner_statement
- id UUID PK
- tenant_id UUID NOT NULL → RLS
- owner_id UUID NOT NULL
- period_month CHAR(7) NOT NULL
- lines JSONB NOT NULL  -- lignes déterministes
- gross_revenue NUMERIC(12,4) NOT NULL
- total_deductions NUMERIC(12,4) NOT NULL
- management_fee_pct NUMERIC(5,4) NOT NULL  -- stocké au moment de génération
- net_payout NUMERIC(12,4) NOT NULL
- currency CHAR(3) NOT NULL
- status ENUM('draft','sent','acknowledged') DEFAULT 'draft'
- sent_at TIMESTAMPTZ
- created_at TIMESTAMPTZ DEFAULT now()
-- UNIQUE (tenant_id, owner_id, period_month)
-- Immutable une fois sent ou acknowledged
```

Génération déclenchée par **n8n W-11** le 1er du mois à 06:00 UTC.  
Révision par le gestionnaire obligatoire avant envoi (`canUserPerform('finance.statements.send')`).

### 4. Autorisation

```
Permissions requises:
- finance.read              → voir dashboard, ledger, KPIs
- finance.ledger.read       → accès détail grand livre
- finance.statements.read   → voir les relevés
- finance.statements.send   → envoyer un relevé propriétaire
- finance.payout.create     → créer un paiement propriétaire
- finance.export            → export CSV/PDF

Rôles autorisés: property_manager, financial_manager, platform_super_admin
Propriétaires: voient seulement leurs propres relevés (RLS owner_id)
```

### 5. Rapports

- **Dashboard** : KPIs du mois courant (gross, net, occupancy, ADR, RevPAN)
- **BarChart** : revenus mensuels × 6 derniers mois par canal (recharts)
- **Grand Livre** : table avec filtres période/propriété/type/statut
- **Relevés** : liste par propriétaire + détail PDF (Edge Function)
- **Export** : CSV grand livre via `canUserPerform('finance.export')` → Edge Function

---

## Conséquences

**Bénéfices** :
- Audit trail complet et immuable (ADR-007 respecté)
- Calculs reproductibles et vérifiables
- Isolation multi-tenant parfaite par RLS
- Génération automatique des relevés par n8n

**Contraintes** :
- Les annulations requièrent une écriture inverse (jamais de DELETE)
- Taux taxes/commissions dans tenant_config, pas dans le code
- Export PDF des relevés nécessite une Edge Function (jsPDF ou Puppeteer)

---

## Alternatives Rejetées

| Alternative | Raison du rejet |
|-------------|-----------------|
| LLM pour calculs financiers | RÈGLE PERMANENTE — interdit |
| UPDATE sur ledger_entry | Viole ADR-007 append-only |
| Stockage HTML des relevés | XSS + problèmes de stockage |
| Calculs frontend uniquement | Pas d'audit trail · recalcul impossible |

---

## Workflows n8n Associés

- **W-11** : Génération automatique relevés propriétaires (1er du mois)
- **W-12** : Envoi relevés par email avec PDF attaché
- **W-13** : Rapprochement bancaire (V1)

---

## Références

- ADR-007 : RLS Strategy (append-only protégé)
- ADR-010 : Charges déterministes réservation (base du calcul financier)
- DATA_MODEL.md : Tables `ledger_entry`, `owner_statement`, `tenant_config`
- PERMANENT_RULES.md : LLM interdit pour calculs financiers et décisions comptables
