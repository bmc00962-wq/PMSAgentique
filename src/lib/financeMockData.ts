// DEV ONLY — Finance mock data (PROMPT 15)
// Rule: NUMERIC(12,4) in DB · append-only · NO LLM for calculations
import type {
  LedgerEntry, OwnerStatement, OwnerStatementLine,
  MonthlyChannelRevenue, PropertyRevenueSummary, FinanceSummary
} from '@/types/finance';

const mk = (
  id: string, resvId: string | undefined, propId: string, propName: string,
  type: LedgerEntry['entry_type'], label: string, amount: number,
  currency: LedgerEntry['currency'], period: string, date: string,
  opts: Partial<Pick<LedgerEntry, 'channel' | 'status' | 'owner_id' | 'unit_name' | 'notes'>> = {}
): LedgerEntry => ({
  id, tenant_id: 'tenant-demo', reservation_id: resvId,
  property_id: propId, property_name: propName,
  entry_type: type, label, amount, currency, period_month: period, entry_date: date,
  status: opts.status ?? 'confirmed', channel: opts.channel, owner_id: opts.owner_id,
  unit_name: opts.unit_name, notes: opts.notes,
  created_at: `${date}T08:00:00Z`,
});

export const MOCK_LEDGER: LedgerEntry[] = [
  // ── AOÛT 2026 — Réservations actives ──────────────────────────────────────────
  mk('led-001','res-101','prop-001','Le Loft Mile-End','revenue','Loyer base · Marie Cote (3 nuits)',540,'CAD','2026-08','2026-08-07',{channel:'airbnb',owner_id:'owner-001',unit_name:'Loft A'}),
  mk('led-002','res-101','prop-001','Le Loft Mile-End','cleaning_fee','Frais menage · res-101',85,'CAD','2026-08','2026-08-07',{channel:'airbnb',owner_id:'owner-001'}),
  mk('led-003','res-101','prop-001','Le Loft Mile-End','tax','Taxes hebergement QC · res-101',116,'CAD','2026-08','2026-08-07',{channel:'airbnb'}),
  mk('led-004','res-101','prop-001','Le Loft Mile-End','commission','Commission Airbnb 3% · res-101',-18.75,'CAD','2026-08','2026-08-07',{channel:'airbnb'}),

  mk('led-005','res-102','prop-002','Maison Plateau Familiale','revenue','Loyer base · Lea Bouchard (5 nuits)',1125,'CAD','2026-08','2026-08-04',{channel:'direct',owner_id:'owner-001',unit_name:'Maison entiere'}),
  mk('led-006','res-102','prop-002','Maison Plateau Familiale','cleaning_fee','Frais menage · res-102',120,'CAD','2026-08','2026-08-04',{channel:'direct',owner_id:'owner-001'}),
  mk('led-007','res-102','prop-002','Maison Plateau Familiale','tax','Taxes hebergement QC · res-102',230,'CAD','2026-08','2026-08-04',{channel:'direct'}),

  mk('led-008','res-103','prop-001','Le Loft Mile-End','revenue','Loyer base · Jean Martin (5 nuits)',900,'CAD','2026-08','2026-08-02',{channel:'booking',owner_id:'owner-001',unit_name:'Loft B'}),
  mk('led-009','res-103','prop-001','Le Loft Mile-End','cleaning_fee','Frais menage · res-103',85,'CAD','2026-08','2026-08-02',{channel:'booking',owner_id:'owner-001'}),
  mk('led-010','res-103','prop-001','Le Loft Mile-End','commission','Commission Booking.com 15% · res-103',-147.75,'CAD','2026-08','2026-08-02',{channel:'booking'}),

  mk('led-011','res-104','prop-004','Chalet Mont-Tremblant','revenue','Loyer base · Jean Martin (6 nuits)',2220,'CAD','2026-08','2026-08-06',{channel:'direct',owner_id:'owner-002',unit_name:'Chalet complet'}),
  mk('led-012','res-104','prop-004','Chalet Mont-Tremblant','cleaning_fee','Frais menage · res-104',200,'CAD','2026-08','2026-08-06',{channel:'direct',owner_id:'owner-002'}),
  mk('led-013','res-104','prop-004','Chalet Mont-Tremblant','tax','Taxes hebergement QC · res-104',451,'CAD','2026-08','2026-08-06',{channel:'direct'}),

  mk('led-014','res-105','prop-005','Dar Zitoun Marrakech','revenue','Loyer base · Carlos Gomez (6 nuits)',540,'EUR','2026-08','2026-08-09',{channel:'airbnb',owner_id:'owner-003',unit_name:'Riad complet'}),
  mk('led-015','res-105','prop-005','Dar Zitoun Marrakech','cleaning_fee','Frais menage · res-105',80,'EUR','2026-08','2026-08-09',{channel:'airbnb',owner_id:'owner-003'}),
  mk('led-016','res-105','prop-005','Dar Zitoun Marrakech','tax','TVA 10% + taxe sejour · res-105',62,'EUR','2026-08','2026-08-09',{channel:'airbnb'}),
  mk('led-017','res-105','prop-005','Dar Zitoun Marrakech','commission','Commission Airbnb 3% · res-105',-18.60,'EUR','2026-08','2026-08-09',{channel:'airbnb'}),

  mk('led-018','res-106','prop-006','Villa Hassan II Marrakech','revenue','Loyer base · Amira Hassan (4 nuits)',960,'EUR','2026-08','2026-08-10',{channel:'booking',owner_id:'owner-003',unit_name:'Suite Royale'}),
  mk('led-019','res-106','prop-006','Villa Hassan II Marrakech','cleaning_fee','Frais menage · res-106',150,'EUR','2026-08','2026-08-10',{channel:'booking',owner_id:'owner-003'}),
  mk('led-020','res-106','prop-006','Villa Hassan II Marrakech','commission','Commission Booking.com 15% · res-106',-166.50,'EUR','2026-08','2026-08-10',{channel:'booking'}),

  mk('led-021',undefined,'prop-003','Studio Cote-des-Neiges','expense','Abonnement PMS SaaS aout 2026',-200,'CAD','2026-08','2026-08-01',{status:'confirmed'}),
  mk('led-022',undefined,'prop-001','Le Loft Mile-End','expense','Frais reparation serrure Loft B',-85,'CAD','2026-08','2026-08-08',{status:'confirmed',notes:'Ref mnt-05'}),

  // ── JUILLET 2026 — Clôturé + relevés propriétaires ───────────────────────────
  mk('led-023','res-201','prop-001','Le Loft Mile-End','revenue','Loyer base juillet · Loft A (4 nuits)',720,'CAD','2026-07','2026-07-18',{channel:'airbnb',owner_id:'owner-001'}),
  mk('led-024','res-201','prop-001','Le Loft Mile-End','cleaning_fee','Menage juillet · Loft A',85,'CAD','2026-07','2026-07-18',{channel:'airbnb',owner_id:'owner-001'}),
  mk('led-025','res-202','prop-002','Maison Plateau Familiale','revenue','Loyer base juillet · Famille Tremblay (7n)',1575,'CAD','2026-07','2026-07-10',{channel:'direct',owner_id:'owner-001'}),
  mk('led-026','res-203','prop-004','Chalet Mont-Tremblant','revenue','Loyer base juillet · Groupe amis (5n)',1850,'CAD','2026-07','2026-07-25',{channel:'vrbo',owner_id:'owner-002'}),
  mk('led-027','res-203','prop-004','Chalet Mont-Tremblant','commission','Commission Vrbo 5% · res-203',-92.50,'CAD','2026-07','2026-07-25',{channel:'vrbo'}),
  mk('led-028',undefined,'prop-001','Le Loft Mile-End','owner_payout','Virement proprietaire Pierre Moreau juil 2026',-6560,'CAD','2026-07','2026-07-31',{owner_id:'owner-001',status:'confirmed',notes:'Relevé stmt-001'}),
  mk('led-029',undefined,'prop-004','Chalet Mont-Tremblant','owner_payout','Virement proprietaire Sophie Lariviere juil 2026',-5440,'CAD','2026-07','2026-07-31',{owner_id:'owner-002',status:'confirmed',notes:'Relevé stmt-002'}),
  mk('led-030',undefined,'prop-005','Dar Zitoun Marrakech','owner_payout','Virement proprietaire Karim Mansouri juil 2026',-3360,'EUR','2026-07','2026-07-31',{owner_id:'owner-003',status:'pending',notes:'Relevé stmt-003 — en attente'}),
];

// ── Owner Statements ──────────────────────────────────────────────────────────

const mkLine = (label: string, amount: number, type: OwnerStatementLine['entry_type']): OwnerStatementLine =>
  ({ label, amount, entry_type: type });

export const MOCK_STATEMENTS: OwnerStatement[] = [
  {
    id: 'stmt-001', tenant_id: 'tenant-demo', owner_id: 'owner-001',
    owner_name: 'Pierre Moreau', owner_email: 'pierre.moreau@example.com',
    period_month: '2026-07',
    property_names: ['Le Loft Mile-End', 'Maison Plateau Familiale'],
    lines: [
      mkLine('Loyer brut — Le Loft Mile-End (8 nuits)', 1440, 'revenue'),
      mkLine('Loyer brut — Maison Plateau Familiale (7 nuits)', 1575, 'revenue'),
      mkLine('Frais de ménage (2 biens)', 205, 'cleaning_fee'),
      mkLine('Commissions OTA (Airbnb)', -43.20, 'commission'),
      mkLine('Taxes hébergement QC', -392, 'tax'),
      mkLine('Frais de gestion 20%', -645, 'expense'),
      mkLine('Frais maintenance et réparations', -85, 'expense'),
    ],
    gross_revenue: 3220, total_deductions: -1165.20,
    management_fee_pct: 0.20, net_payout: 6560, currency: 'CAD',
    status: 'sent', sent_at: '2026-08-01T09:00:00Z',
    created_at: '2026-08-01T06:00:00Z',
  },
  {
    id: 'stmt-002', tenant_id: 'tenant-demo', owner_id: 'owner-002',
    owner_name: 'Sophie Lariviere', owner_email: 'sophie.lariviere@example.com',
    period_month: '2026-07',
    property_names: ['Studio Cote-des-Neiges', 'Chalet Mont-Tremblant'],
    lines: [
      mkLine('Loyer brut — Chalet Mont-Tremblant (5 nuits)', 1850, 'revenue'),
      mkLine('Loyer brut — Studio Cote-des-Neiges (6 nuits)', 720, 'revenue'),
      mkLine('Frais de ménage (2 biens)', 230, 'cleaning_fee'),
      mkLine('Commission Vrbo 5%', -92.50, 'commission'),
      mkLine('Taxes hébergement QC', -341, 'tax'),
      mkLine('Frais de gestion 20%', -526, 'expense'),
    ],
    gross_revenue: 2800, total_deductions: -1359.50,
    management_fee_pct: 0.20, net_payout: 5440, currency: 'CAD',
    status: 'acknowledged', sent_at: '2026-08-01T09:15:00Z',
    created_at: '2026-08-01T06:00:00Z',
  },
  {
    id: 'stmt-003', tenant_id: 'tenant-demo', owner_id: 'owner-003',
    owner_name: 'Karim Mansouri', owner_email: 'karim.mansouri@example.com',
    period_month: '2026-07',
    property_names: ['Dar Zitoun Marrakech', 'Villa Hassan II Marrakech'],
    lines: [
      mkLine('Loyer brut — Dar Zitoun Marrakech (10 nuits)', 900, 'revenue'),
      mkLine('Loyer brut — Villa Hassan II (8 nuits)', 1920, 'revenue'),
      mkLine('Frais de ménage (2 biens)', 230, 'cleaning_fee'),
      mkLine('Commission Airbnb 3%', -27, 'commission'),
      mkLine('Commission Booking.com 15%', -288, 'commission'),
      mkLine('TVA 10% Maroc + taxe séjour', -277, 'tax'),
      mkLine('Frais de gestion 20%', -558, 'expense'),
    ],
    gross_revenue: 3050, total_deductions: -1150,
    management_fee_pct: 0.20, net_payout: 3360, currency: 'EUR',
    status: 'draft',
    created_at: '2026-08-01T06:00:00Z',
  },
];

// ── Chart Data — 6 derniers mois ──────────────────────────────────────────────

export const MONTHLY_REVENUE: MonthlyChannelRevenue[] = [
  { period: '2026-03', airbnb: 1800, booking: 1200, vrbo: 900, direct: 600, total: 4500 },
  { period: '2026-04', airbnb: 2400, booking: 1800, vrbo: 1200, direct: 800, total: 6200 },
  { period: '2026-05', airbnb: 3600, booking: 2600, vrbo: 1800, direct: 1200, total: 9200 },
  { period: '2026-06', airbnb: 4200, booking: 3100, vrbo: 2800, direct: 1500, total: 11600 },
  { period: '2026-07', airbnb: 5800, booking: 4200, vrbo: 3600, direct: 2100, total: 15700 },
  { period: '2026-08', airbnb: 2100, booking: 1800, vrbo: 1200, direct: 900, total: 6000 },
];

export const PROPERTY_REVENUE: PropertyRevenueSummary[] = [
  { property_id: 'prop-001', property_name: 'Le Loft Mile-End', gross_revenue: 1625, commissions: 147.75, cleaning_fees: 170, taxes: 299, net_revenue: 1008.25, nights: 8, occupancy_pct: 73 },
  { property_id: 'prop-002', property_name: 'Maison Plateau Familiale', gross_revenue: 1245, commissions: 0, cleaning_fees: 120, taxes: 230, net_revenue: 895, nights: 5, occupancy_pct: 55 },
  { property_id: 'prop-004', property_name: 'Chalet Mont-Tremblant', gross_revenue: 2420, commissions: 0, cleaning_fees: 200, taxes: 451, net_revenue: 1769, nights: 6, occupancy_pct: 86 },
  { property_id: 'prop-005', property_name: 'Dar Zitoun Marrakech', gross_revenue: 620, commissions: 18.60, cleaning_fees: 80, taxes: 62, net_revenue: 459.40, nights: 6, occupancy_pct: 65 },
  { property_id: 'prop-006', property_name: 'Villa Hassan II Marrakech', gross_revenue: 1110, commissions: 166.50, cleaning_fees: 150, taxes: 111, net_revenue: 682.50, nights: 4, occupancy_pct: 80 },
];

export const FINANCE_SUMMARY: FinanceSummary = {
  period_month: '2026-08',
  gross_revenue: 12020, net_revenue: 8650,
  total_commissions: 351.60, total_taxes: 1093, total_cleaning: 635,
  total_expenses: 285, pending_payouts: 3360,
  confirmed_entries: 22, pending_entries: 8,
  occupancy_rate: 71, avg_daily_rate: 189, revenue_per_available_night: 134,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getStatementById = (id: string): OwnerStatement | undefined =>
  MOCK_STATEMENTS.find(s => s.id === id);

export const getLedgerByPeriod = (period: string): LedgerEntry[] =>
  MOCK_LEDGER.filter(e => e.period_month === period);

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  revenue: 'Loyer', cleaning_fee: 'Menage', tax: 'Taxes', commission: 'Commission OTA',
  expense: 'Charge', owner_payout: 'Virement proprietaire', adjustment: 'Ajustement',
};
export const ENTRY_TYPE_COLORS: Record<string, string> = {
  revenue: 'text-emerald-400', cleaning_fee: 'text-blue-400', tax: 'text-yellow-400',
  commission: 'text-orange-400', expense: 'text-rose-400', owner_payout: 'text-purple-400', adjustment: 'text-slate-400',
};
export const ENTRY_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirme', cancelled: 'Annule',
};
export const STATEMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoye', acknowledged: 'Accuse de reception',
};
export const STATEMENT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground border-border',
  sent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  acknowledged: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};
export const CURRENCY_SYMBOL: Record<string, string> = { CAD: 'CA$', EUR: '€', MAD: 'MAD' };
