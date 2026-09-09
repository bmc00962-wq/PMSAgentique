// Finance module types — PROMPT 15
// Rule: NUMERIC(12,4) in DB → number in TS · append-only ledger · NO LLM for calculations

export type EntryType =
  | 'revenue' | 'cleaning_fee' | 'tax' | 'commission'
  | 'expense' | 'owner_payout' | 'adjustment';

export type EntryStatus = 'pending' | 'confirmed' | 'cancelled';
export type StatementStatus = 'draft' | 'sent' | 'acknowledged';
export type ChannelKey = 'airbnb' | 'booking' | 'vrbo' | 'direct' | 'ical';

export interface LedgerEntry {
  id: string;
  tenant_id: string;
  reservation_id?: string;
  property_id: string;
  property_name: string;
  unit_name?: string;
  owner_id?: string;
  entry_type: EntryType;
  label: string;
  amount: number;           // positive = debit (revenue), negative = credit (expense/payout)
  currency: 'CAD' | 'EUR' | 'MAD';
  channel?: ChannelKey;
  status: EntryStatus;
  period_month: string;     // 'YYYY-MM'
  entry_date: string;       // ISO date
  notes?: string;
  created_at: string;
}

export interface MonthlyChannelRevenue {
  period: string;           // 'YYYY-MM'
  airbnb: number;
  booking: number;
  vrbo: number;
  direct: number;
  total: number;
}

export interface PropertyRevenueSummary {
  property_id: string;
  property_name: string;
  gross_revenue: number;
  commissions: number;
  cleaning_fees: number;
  taxes: number;
  net_revenue: number;
  nights: number;
  occupancy_pct: number;
}

export interface OwnerStatementLine {
  label: string;
  amount: number;
  entry_type: EntryType | 'total';
}

export interface OwnerStatement {
  id: string;
  tenant_id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  period_month: string;
  property_names: string[];
  lines: OwnerStatementLine[];
  gross_revenue: number;
  total_deductions: number;
  management_fee_pct: number;
  net_payout: number;
  currency: 'CAD' | 'EUR' | 'MAD';
  status: StatementStatus;
  sent_at?: string;
  created_at: string;
}

export interface FinanceSummary {
  period_month: string;
  gross_revenue: number;
  net_revenue: number;
  total_commissions: number;
  total_taxes: number;
  total_cleaning: number;
  total_expenses: number;
  pending_payouts: number;
  confirmed_entries: number;
  pending_entries: number;
  occupancy_rate: number;
  avg_daily_rate: number;
  revenue_per_available_night: number;
}
