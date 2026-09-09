// FinancePage — Live Supabase data — ADR-015
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, BookOpen, FileText, ArrowRight, DollarSign, BarChart2, Percent } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  base_rent: 'Loyer base', cleaning_fee: 'Frais ménage', tax: 'Taxes',
  channel_commission: 'Commission OTA', management_fee: 'Frais gestion',
  damage_deposit: 'Caution', damage_deduction: 'Déduction dommages',
  refund: 'Remboursement', adjustment: 'Ajustement', payout: 'Virement', reversal: 'Annulation',
};

const ENTRY_TYPE_COLOR: Record<string, string> = {
  base_rent: 'text-emerald-400', cleaning_fee: 'text-blue-400', tax: 'text-yellow-400',
  channel_commission: 'text-orange-400', management_fee: 'text-purple-400',
  refund: 'text-red-400', payout: 'text-cyan-400', reversal: 'text-slate-400',
};

async function fetchFinanceData() {
  const [ledgerRes, reservationsRes] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('id, entry_type, direction, amount, currency, description, reservation_id, created_at')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false }),
    supabase
      .from('reservations')
      .select('id, status, total_amount, base_rent, cleaning_fee, tax_amount, channel_commission, currency, check_in, check_out, guest_first_name, guest_last_name')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null),
  ]);

  const ledger = ledgerRes.data ?? [];
  const reservations = reservationsRes.data ?? [];

  const totalCredits = ledger.filter(e => e.direction === 'credit').reduce((s, e) => s + Number(e.amount), 0);
  const totalDebits = ledger.filter(e => e.direction === 'debit').reduce((s, e) => s + Number(e.amount), 0);
  const netRevenue = totalCredits - totalDebits;

  const confirmedRes = reservations.filter(r => ['confirmed','checked_in','checked_out'].includes(r.status));
  const totalReservationRevenue = confirmedRes.reduce((s, r) => s + Number(r.base_rent), 0);
  const totalTax = confirmedRes.reduce((s, r) => s + Number(r.tax_amount), 0);
  const totalCleaning = confirmedRes.reduce((s, r) => s + Number(r.cleaning_fee), 0);
  const totalCommissions = confirmedRes.reduce((s, r) => s + Number(r.channel_commission), 0);

  // Group by entry_type
  const byType: Record<string, { credits: number; debits: number }> = {};
  for (const e of ledger) {
    if (!byType[e.entry_type]) byType[e.entry_type] = { credits: 0, debits: 0 };
    if (e.direction === 'credit') byType[e.entry_type].credits += Number(e.amount);
    else byType[e.entry_type].debits += Number(e.amount);
  }

  return { ledger, totalCredits, totalDebits, netRevenue, totalReservationRevenue, totalTax, totalCleaning, totalCommissions, byType, reservations };
}

const FinancePage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['finance', TENANT_ID],
    queryFn: fetchFinanceData,
    staleTime: 30_000,
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  const d = data!;
  const recentEntries = d.ledger.slice(0, 10);

  const kpis = [
    { label: 'Total crédits', value: `${d.totalCredits.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`, color: 'text-emerald-400', Icon: TrendingUp },
    { label: 'Total débits', value: `${d.totalDebits.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`, color: 'text-red-400', Icon: BarChart2 },
    { label: 'Revenu net', value: `${d.netRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`, color: 'text-blue-400', Icon: DollarSign },
    { label: 'Taxes collectées', value: `${d.totalTax.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`, color: 'text-yellow-400', Icon: Percent },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Moteur Financier
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Grand livre · relevés propriétaires · calculs déterministes (ADR-015)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/finance/ledger')}
              className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
              <BookOpen className="w-3.5 h-3.5" /> Grand Livre
            </button>
            <button onClick={() => navigate('/finance/statements')}
              className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
              <FileText className="w-3.5 h-3.5" /> Relevés
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, color, Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />
              <div>
                <div className={cn('text-xl font-bold font-mono', color)}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Breakdown cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Commissions OTA', val: d.totalCommissions, color: 'text-orange-400' },
            { label: 'Taxes hébergement', val: d.totalTax, color: 'text-yellow-400' },
            { label: 'Frais ménage', val: d.totalCleaning, color: 'text-blue-400' },
            { label: 'Loyers base', val: d.totalReservationRevenue, color: 'text-emerald-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className={cn('text-lg font-bold font-mono', color)}>{val.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Entry type breakdown + Recent entries */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* By type */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Par type d'écriture</h2>
            <div className="space-y-3">
              {Object.entries(d.byType).map(([type, { credits, debits }]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{ENTRY_TYPE_LABELS[type] ?? type}</div>
                    <div className="flex gap-2 text-xs mt-0.5">
                      {credits > 0 && <span className="text-emerald-400">+{credits.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>}
                      {debits > 0 && <span className="text-red-400">-{debits.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</span>}
                    </div>
                  </div>
                  <span className={cn('text-xs font-medium', ENTRY_TYPE_COLOR[type] ?? 'text-muted-foreground')}>
                    {ENTRY_TYPE_LABELS[type] ?? type}
                  </span>
                </div>
              ))}
              {Object.keys(d.byType).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Aucune écriture</p>
              )}
            </div>
          </div>

          {/* Recent entries */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Écritures récentes</h2>
              <button onClick={() => navigate('/finance/ledger')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune écriture dans le grand livre</p>
              ) : recentEntries.map(e => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{ENTRY_TYPE_LABELS[e.entry_type] ?? e.entry_type} · {new Date(e.created_at).toLocaleDateString('fr-CA')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-bold font-mono', e.direction === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                      {e.direction === 'credit' ? '+' : '-'}{Number(e.amount).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {e.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ADR note */}
        <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground">
          <span className="text-orange-400 font-mono font-semibold">ADR-015 FROZEN</span> — Grand livre append-only · NUMERIC(12,4) · Calculs déterministes (jamais LLM) · Taxes QC 18.475% · TVA Maroc 10% · Annulations = écriture inverse
        </div>
      </div>
    </AppLayout>
  );
};

export default FinancePage;
