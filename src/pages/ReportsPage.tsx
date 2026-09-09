// ReportsPage — Live Supabase data — ADR-021
// Tabs: Tableau de bord, Revenus/Propriétaire, Relevés, Opérations
// Export: CSV + Print PDF (window.print) A4
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Building2, Users, Home, DollarSign, Wrench,
  Sparkles, BarChart2, Globe, Shield, Star, XCircle, Printer,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

type TabId = 'tenant' | 'owners' | 'revenue_by_owner' | 'operations';

const KpiCard = ({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color: string; bg: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
      <Icon className={cn('w-4 h-4', color)} />
    </div>
    <div>
      <div className={cn('text-xl font-bold leading-none', color)}>{value}</div>
      <div className="text-xs text-foreground font-medium mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  </div>
);

const CHART_TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--foreground))',
};

async function fetchTenantMetrics() {
  const [resRes, unitsRes, propsRes, hkRes, maintRes, ownersRes, ledgerRes] = await Promise.all([
    supabase.from('reservations').select('id, status, channel, total_amount, base_rent, tax_amount, cleaning_fee, check_in, check_out, nights').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('units').select('id, status').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('properties').select('id, name').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('housekeeping_jobs').select('id, status').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('maintenance_tickets').select('id, status, actual_cost, currency').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('owners').select('id, first_name, last_name').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('ledger_entries').select('id, entry_type, direction, amount, currency, created_at').eq('tenant_id', TENANT_ID),
  ]);

  const reservations = resRes.data ?? [];
  const units        = unitsRes.data ?? [];
  const properties   = propsRes.data ?? [];
  const hkJobs       = hkRes.data ?? [];
  const tickets      = maintRes.data ?? [];
  const owners       = ownersRes.data ?? [];
  const ledger       = ledgerRes.data ?? [];

  const confirmed     = reservations.filter(r => ['confirmed','checked_in','checked_out'].includes(r.status));
  const totalRevenue  = confirmed.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalBaseRent = confirmed.reduce((s, r) => s + Number(r.base_rent), 0);
  const totalNights   = confirmed.reduce((s, r) => s + (r.nights ?? 0), 0);
  const adr           = totalNights > 0 ? totalBaseRent / totalNights : 0;
  const activeUnits   = units.filter(u => u.status === 'active').length;
  const availableNights = activeUnits * 30;
  const occupancy     = availableNights > 0 ? Math.min((totalNights / availableNights) * 100, 100) : 0;
  const revpar        = availableNights > 0 ? totalBaseRent / availableNights : 0;

  const channelColors: Record<string, string> = { airbnb: '#FF5A5F', booking: '#003580', direct: '#10b981', vrbo: '#4f46e5' };
  const channelMap: Record<string, { revenue: number; count: number }> = {};
  for (const r of confirmed) {
    const ch = r.channel ?? 'direct';
    if (!channelMap[ch]) channelMap[ch] = { revenue: 0, count: 0 };
    channelMap[ch].revenue += Number(r.total_amount);
    channelMap[ch].count   += 1;
  }
  const channelBreakdown = Object.entries(channelMap).map(([channel, v]) => ({
    channel, revenue: Math.round(v.revenue), reservations: v.count,
    pct: totalRevenue > 0 ? Math.round((v.revenue / totalRevenue) * 100) : 0,
    color: channelColors[channel] ?? '#6b7280',
  }));

  const byMonth: Record<string, { month: string; credits: number; debits: number }> = {};
  for (const e of ledger) {
    const m = e.created_at.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { month: m, credits: 0, debits: 0 };
    if (e.direction === 'credit') byMonth[m].credits += Number(e.amount);
    else byMonth[m].debits += Number(e.amount);
  }
  const monthlyRevenue = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

  return {
    reservations, confirmed: confirmed.length, pending: reservations.filter(r => r.status === 'pending').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length, totalRevenue, adr, occupancy, revpar,
    units: units.length, activeUnits, properties: properties.length, owners,
    hkDone: hkJobs.filter(j => j.status === 'done').length, hkPending: hkJobs.filter(j => j.status === 'pending').length,
    maintOpen: tickets.filter(t => t.status === 'open' || t.status === 'assigned').length,
    maintDone: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    channelBreakdown, monthlyRevenue, totalNights,
  };
}

async function fetchOwnerMetrics() {
  const [statementsRes, ownersRes] = await Promise.all([
    supabase.from('owner_statements').select('id, owner_id, period_start, period_end, total_revenue, total_fees, management_fee, cleaning_fees, maintenance_costs, net_payout, currency, status').eq('tenant_id', TENANT_ID),
    supabase.from('owners').select('id, first_name, last_name').eq('tenant_id', TENANT_ID).is('deleted_at', null),
  ]);
  const statements = statementsRes.data ?? [];
  const owners = ownersRes.data ?? [];
  const ownerMap: Record<string, string> = {};
  for (const o of owners) ownerMap[o.id] = `${o.first_name} ${o.last_name}`;
  return statements.map(s => ({ ...s, owner_name: ownerMap[s.owner_id] ?? '—' }));
}

// ── TenantTab ─────────────────────────────────────────────────────────────────
const TenantTab = () => {
  const { data, isLoading } = useQuery({ queryKey: ['tenant-metrics', TENANT_ID], queryFn: fetchTenantMetrics, staleTime: 60_000 });
  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  const d = data!;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Taux d'occupation" value={`${d.occupancy.toFixed(1)}%`} sub={`${d.totalNights} nuits réservées`} icon={Home} color="text-blue-400" bg="bg-blue-500/10" />
        <KpiCard label="ADR" value={`${d.adr.toFixed(0)} CAD`} sub="Prix moy. par nuit" icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
        <KpiCard label="RevPAR" value={`${d.revpar.toFixed(0)} CAD`} sub="Rev. par nuit disponible" icon={TrendingUp} color="text-amber-400" bg="bg-amber-500/10" />
        <KpiCard label="Revenus bruts" value={`${d.totalRevenue.toFixed(0)} CAD`} sub={`${d.confirmed} confirmées`} icon={Star} color="text-purple-400" bg="bg-purple-500/10" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Propriétés" value={d.properties} sub={`${d.activeUnits}/${d.units} unités actives`} icon={Building2} color="text-blue-400" bg="bg-blue-500/10" />
        <KpiCard label="En attente" value={d.pending} sub="Réservations" icon={TrendingUp} color="text-yellow-400" bg="bg-yellow-500/10" />
        <KpiCard label="Ménages terminés" value={d.hkDone} sub={`${d.hkPending} en attente`} icon={Sparkles} color="text-cyan-400" bg="bg-cyan-500/10" />
        <KpiCard label="Annulées" value={d.cancelled} sub="Réservations" icon={XCircle} color="text-rose-400" bg="bg-rose-500/10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenus par Canal</h3>
          {d.channelBreakdown.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={d.channelBreakdown} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="channel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v} CAD`, 'Revenus']} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {d.channelBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1.5">
                {d.channelBreakdown.map(c => (
                  <div key={c.channel} className="flex items-center gap-3 text-xs">
                    <Globe className="w-3 h-3 flex-shrink-0" style={{ color: c.color }} />
                    <span className="text-foreground font-medium w-20">{c.channel}</span>
                    <span className="text-muted-foreground">{c.reservations} rés.</span>
                    <span className="ml-auto font-mono font-semibold text-foreground">{c.revenue.toLocaleString('fr-CA')} CAD</span>
                    <span className="text-muted-foreground w-10 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Écritures Grand Livre (mensuel)</h3>
          {d.monthlyRevenue.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Aucune écriture</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.monthlyRevenue} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="credGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)} CAD`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="credits" fill="url(#credGrad)" stroke="#10b981" strokeWidth={2} name="Crédits" dot={false} />
                <Line type="monotone" dataKey="debits" stroke="#ef4444" strokeWidth={2} name="Débits" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Revenue by Owner Tab ─────────────────────────────────────────────────────
type RevPeriod = '1m' | '3m' | '6m' | '12m';

function getMonthsBack(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

async function fetchRevenueByOwner() {
  const [ownersRes, propertiesRes, unitsRes, reservationsRes] = await Promise.all([
    supabase.from('owners').select('id, first_name, last_name').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('properties').select('id, name, owner_id').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('units').select('id, property_id').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('reservations')
      .select('id, unit_id, status, base_rent, cleaning_fee, tax_amount, channel_commission, total_amount, currency, check_in, created_at')
      .eq('tenant_id', TENANT_ID).is('deleted_at', null)
      .in('status', ['confirmed', 'checked_in', 'checked_out']),
  ]);

  const owners = ownersRes.data ?? [];
  const properties = propertiesRes.data ?? [];
  const units = unitsRes.data ?? [];
  const reservations = reservationsRes.data ?? [];

  const unitPropMap: Record<string, string> = {};
  for (const u of units) unitPropMap[u.id] = u.property_id;
  const propOwnerMap: Record<string, string> = {};
  for (const p of properties) propOwnerMap[p.id] = p.owner_id;

  const ownerData: Record<string, {
    ownerId: string; ownerName: string;
    baseRent: number; cleaningFee: number; taxes: number; commission: number;
    total: number; count: number; byMonth: Record<string, number>;
  }> = {};

  for (const o of owners) {
    ownerData[o.id] = {
      ownerId: o.id, ownerName: `${o.first_name} ${o.last_name}`,
      baseRent: 0, cleaningFee: 0, taxes: 0, commission: 0, total: 0, count: 0, byMonth: {},
    };
  }

  for (const r of reservations) {
    const propId  = unitPropMap[r.unit_id];
    const ownerId = propOwnerMap[propId];
    if (!ownerId || !ownerData[ownerId]) continue;
    const month = (r.check_in ?? r.created_at ?? '').slice(0, 7);
    ownerData[ownerId].baseRent    += Number(r.base_rent);
    ownerData[ownerId].cleaningFee += Number(r.cleaning_fee);
    ownerData[ownerId].taxes       += Number(r.tax_amount);
    ownerData[ownerId].commission  += Number(r.channel_commission);
    ownerData[ownerId].total       += Number(r.total_amount);
    ownerData[ownerId].count       += 1;
    if (month) ownerData[ownerId].byMonth[month] = (ownerData[ownerId].byMonth[month] ?? 0) + Number(r.total_amount);
  }

  return Object.values(ownerData);
}

const OWNER_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const RevenueByOwnerTab = () => {
  const [period, setPeriod] = useState<RevPeriod>('6m');
  const periodMonths = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[period];
  const cutoff = getMonthsBack(periodMonths);

  const monthLabels: { key: string; label: string }[] = [];
  for (let i = periodMonths - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthLabels.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' }),
    });
  }

  const { data: ownerRevenue = [], isLoading } = useQuery({
    queryKey: ['revenue-by-owner', TENANT_ID], queryFn: fetchRevenueByOwner, staleTime: 60_000,
  });

  const filteredOwners = ownerRevenue.map(o => ({
    ...o,
    filteredTotal: Object.entries(o.byMonth).filter(([m]) => m >= cutoff).reduce((s, [, v]) => s + v, 0),
  })).filter(o => o.total > 0).sort((a, b) => b.filteredTotal - a.filteredTotal);

  const totalAll = filteredOwners.reduce((s, o) => s + o.filteredTotal, 0);

  const chartData = monthLabels.map(({ key, label }) => {
    const entry: Record<string, string | number> = { label };
    for (const o of filteredOwners) entry[o.ownerName] = Math.round(o.byMonth[key] ?? 0);
    return entry;
  });

  // CSV Export
  const exportCSV = () => {
    const rows = [
      ['Propriétaire', 'Loyer base', 'Ménage', 'Taxes', 'Commission', 'Total', 'Réservations'],
      ...filteredOwners.map(o => [
        o.ownerName, o.baseRent.toFixed(2), o.cleaningFee.toFixed(2),
        o.taxes.toFixed(2), o.commission.toFixed(2), o.filteredTotal.toFixed(2), String(o.count),
      ]),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `revenus-proprietaires-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Print PDF (window.print with A4 styles)
  const printPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Rapport Revenus Propriétaires — ${period}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
          h1 { font-size: 18px; color: #1a1a1a; margin-bottom: 4px; }
          .sub { font-size: 11px; color: #666; margin-bottom: 20px; }
          .kpi-row { display: flex; gap: 16px; margin-bottom: 20px; }
          .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; flex: 1; }
          .kpi-val { font-size: 18px; font-weight: bold; color: #059669; }
          .kpi-lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 11px; color: #374151; border: 1px solid #e5e7eb; }
          td { padding: 8px 12px; font-size: 11px; border: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .total-row { font-weight: bold; background: #ecfdf5 !important; }
          .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>Rapport — Revenus par Propriétaire</h1>
        <p class="sub">
          Période : ${period} · Généré le ${new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' })} · 
          Source : Supabase live · ADR-021
        </p>
        <div class="kpi-row">
          <div class="kpi">
            <div class="kpi-val">${totalAll.toFixed(2)} CAD</div>
            <div class="kpi-lbl">Revenus totaux (${period})</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">${filteredOwners.length}</div>
            <div class="kpi-lbl">Propriétaires actifs</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">${filteredOwners.reduce((s, o) => s + o.count, 0)}</div>
            <div class="kpi-lbl">Réservations confirmées</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">${filteredOwners.length > 0 ? (totalAll / filteredOwners.length).toFixed(0) : '0'} CAD</div>
            <div class="kpi-lbl">Revenu moyen / propriétaire</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Propriétaire</th>
              <th>Loyer base</th>
              <th>Ménage</th>
              <th>Taxes</th>
              <th>Commission</th>
              <th>Total brut</th>
              <th>Réservations</th>
              <th>Part %</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOwners.map(o => {
              const pct = totalAll > 0 ? ((o.filteredTotal / totalAll) * 100).toFixed(1) : '0.0';
              return `<tr>
                <td><strong>${o.ownerName}</strong></td>
                <td>${o.baseRent.toFixed(2)}</td>
                <td>${o.cleaningFee.toFixed(2)}</td>
                <td>${o.taxes.toFixed(2)}</td>
                <td>${o.commission.toFixed(2)}</td>
                <td><strong>${o.filteredTotal.toFixed(2)} CAD</strong></td>
                <td>${o.count}</td>
                <td>${pct}%</td>
              </tr>`;
            }).join('')}
            <tr class="total-row">
              <td><strong>TOTAL</strong></td>
              <td><strong>${filteredOwners.reduce((s, o) => s + o.baseRent, 0).toFixed(2)}</strong></td>
              <td><strong>${filteredOwners.reduce((s, o) => s + o.cleaningFee, 0).toFixed(2)}</strong></td>
              <td><strong>${filteredOwners.reduce((s, o) => s + o.taxes, 0).toFixed(2)}</strong></td>
              <td><strong>${filteredOwners.reduce((s, o) => s + o.commission, 0).toFixed(2)}</strong></td>
              <td><strong>${totalAll.toFixed(2)} CAD</strong></td>
              <td><strong>${filteredOwners.reduce((s, o) => s + o.count, 0)}</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
        <p class="footer">
          Ce rapport est généré automatiquement depuis les données Supabase. ADR-021 · ADR-015 · 
          Calculs déterministes · Isolation RLS ADR-007.
          Ne pas distribuer sans validation du responsable financier.
        </p>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Veuillez autoriser les fenêtres pop-up pour imprimer.'); return; }
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Période :</span>
          {(['1m', '3m', '6m', '12m'] as RevPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px]',
                period === p ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary')}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-border bg-secondary rounded-xl hover:border-primary/30 transition-colors min-h-[36px]">
            <DollarSign className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={printPDF}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-border bg-secondary rounded-xl hover:border-primary/30 transition-colors min-h-[36px]">
            <Printer className="w-3.5 h-3.5" /> Imprimer PDF
          </button>
        </div>
      </div>

      {filteredOwners.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune réservation confirmée sur cette période</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total revenus" value={`${totalAll.toFixed(0)} CAD`} sub={`${filteredOwners.reduce((s, o) => s + o.count, 0)} réservations`} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KpiCard label="Propriétaires actifs" value={filteredOwners.length} sub={`sur ${ownerRevenue.length} total`} icon={Users} color="text-blue-400" bg="bg-blue-500/10" />
            <KpiCard label="Revenu moyen" value={filteredOwners.length > 0 ? `${(totalAll / filteredOwners.length).toFixed(0)} CAD` : '—'} sub="par propriétaire" icon={TrendingUp} color="text-amber-400" bg="bg-amber-500/10" />
            <KpiCard label="Meilleur mois" value={
              monthLabels.reduce((best, { key, label }) => {
                const total = filteredOwners.reduce((s, o) => s + (o.byMonth[key] ?? 0), 0);
                return total > best.val ? { label, val: total } : best;
              }, { label: '—', val: 0 }).label
            } sub="revenus cumulés" icon={Star} color="text-purple-400" bg="bg-purple-500/10" />
          </div>

          {chartData.length > 0 && chartData.some(d => Object.values(d).some(v => typeof v === 'number' && v > 0)) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Revenus par propriétaire ({period})</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} width={40} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v.toLocaleString('fr-CA')} CAD`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {filteredOwners.map((o, i) => (
                    <Bar key={o.ownerId} dataKey={o.ownerName} stackId="a" fill={OWNER_COLORS[i % OWNER_COLORS.length]}
                      radius={i === filteredOwners.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-3">
            {filteredOwners.map((o, i) => {
              const pct = totalAll > 0 ? (o.filteredTotal / totalAll) * 100 : 0;
              const color = OWNER_COLORS[i % OWNER_COLORS.length];
              return (
                <div key={o.ownerId} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>
                        {o.ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{o.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{o.count} réservation{o.count !== 1 ? 's' : ''} confirmée{o.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold font-mono text-foreground">{o.filteredTotal.toFixed(0)} CAD</p>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% du total</p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mb-4">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    {[
                      { l: 'Loyer base', v: o.baseRent, c: 'text-emerald-400' },
                      { l: 'Ménage', v: o.cleaningFee, c: 'text-blue-400' },
                      { l: 'Taxes', v: o.taxes, c: 'text-yellow-400' },
                      { l: 'Commission', v: o.commission, c: 'text-orange-400' },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="text-center bg-secondary/30 rounded-lg p-2">
                        <p className={cn('font-bold font-mono', c)}>{v.toFixed(0)}</p>
                        <p className="text-muted-foreground">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ── OwnersTab ─────────────────────────────────────────────────────────────────
const OwnersTab = () => {
  const { data: statements = [], isLoading } = useQuery({ queryKey: ['owner-metrics', TENANT_ID], queryFn: fetchOwnerMetrics, staleTime: 60_000 });
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

  const ownerNames = [...new Set(statements.map(s => s.owner_id))];
  const activeOwner = selectedOwner ?? ownerNames[0] ?? null;
  const ownerStatements = statements.filter(s => s.owner_id === activeOwner);

  const totalRevenue = ownerStatements.reduce((s, st) => s + Number(st.total_revenue), 0);
  const totalNet     = ownerStatements.reduce((s, st) => s + Number(st.net_payout), 0);
  const totalFee     = ownerStatements.reduce((s, st) => s + Number(st.management_fee), 0);

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  if (statements.length === 0) {
    return (
      <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
        <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Aucun relevé propriétaire disponible</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Générez des relevés depuis Finance → Relevés</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Propriétaire :</span>
        <div className="flex gap-2 flex-wrap">
          {ownerNames.map(oid => {
            const name = statements.find(s => s.owner_id === oid)?.owner_name ?? oid;
            return (
              <button key={oid} onClick={() => setSelectedOwner(oid)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors min-h-[36px]',
                  activeOwner === oid ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary')}>
                {name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Revenus bruts" value={`${totalRevenue.toFixed(2)} CAD`} sub={`${ownerStatements.length} relevés`} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
        <KpiCard label="Commission gestion" value={`${totalFee.toFixed(2)} CAD`} sub="18% du revenu" icon={BarChart2} color="text-blue-400" bg="bg-blue-500/10" />
        <KpiCard label="Revenu net" value={`${totalNet.toFixed(2)} CAD`} sub="Après charges" icon={TrendingUp} color="text-purple-400" bg="bg-purple-500/10" />
        <KpiCard label="Statuts relevés" value={ownerStatements.filter(s => s.status === 'paid').length + ' payés'} sub={ownerStatements.filter(s => s.status === 'draft').length + ' brouillons'} icon={Star} color="text-amber-400" bg="bg-amber-500/10" />
      </div>
      <div className="space-y-3">
        {ownerStatements.map(stmt => (
          <div key={stmt.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{stmt.owner_name}</h3>
                <p className="text-xs text-muted-foreground">{stmt.period_start} → {stmt.period_end}</p>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', {
                draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                sent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              }[stmt.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                {stmt.status}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-xs">
              {[
                { l: 'Revenus', v: stmt.total_revenue, c: 'text-emerald-400' },
                { l: 'Frais gestion', v: stmt.management_fee, c: 'text-orange-400' },
                { l: 'Ménage', v: stmt.cleaning_fees, c: 'text-blue-400' },
                { l: 'Net versé', v: stmt.net_payout, c: 'text-purple-400' },
              ].map(({ l, v, c }) => (
                <div key={l} className="text-center">
                  <p className={cn('text-base font-bold font-mono', c)}>{Number(v).toFixed(0)}</p>
                  <p className="text-muted-foreground">{l} {stmt.currency}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── OperationsTab ─────────────────────────────────────────────────────────────
const OperationsTab = () => {
  const { data, isLoading } = useQuery({ queryKey: ['tenant-metrics', TENANT_ID], queryFn: fetchTenantMetrics, staleTime: 60_000 });
  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  const d = data!;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Jobs ménage terminés" value={d.hkDone} sub={`${d.hkPending} en attente`} icon={Sparkles} color="text-cyan-400" bg="bg-cyan-500/10" />
        <KpiCard label="Tickets ouverts" value={d.maintOpen} sub={`${d.maintDone} résolus`} icon={Wrench} color={d.maintOpen > 2 ? 'text-amber-400' : 'text-blue-400'} bg="bg-blue-500/10" />
        <KpiCard label="Unités actives" value={d.activeUnits} sub={`sur ${d.units} total`} icon={Home} color="text-emerald-400" bg="bg-emerald-500/10" />
        <KpiCard label="Propriétaires" value={d.owners.length} sub="dans le tenant" icon={Users} color="text-purple-400" bg="bg-purple-500/10" />
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Répartition par statut de réservation</h3>
        {d.reservations.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">Aucune réservation</p> : (
          <div className="space-y-2">
            {[
              { status: 'confirmed',   label: 'Confirmées',  color: 'bg-emerald-400' },
              { status: 'checked_in',  label: 'En séjour',   color: 'bg-blue-400' },
              { status: 'checked_out', label: 'Partis',      color: 'bg-slate-400' },
              { status: 'pending',     label: 'En attente',  color: 'bg-yellow-400' },
              { status: 'cancelled',   label: 'Annulées',    color: 'bg-red-400' },
              { status: 'inquiry',     label: 'Demandes',    color: 'bg-purple-400' },
            ].map(({ status, label, color }) => {
              const count = d.reservations.filter(r => r.status === status).length;
              const pct = d.reservations.length > 0 ? (count / d.reservations.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground w-24">{label}</span>
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-foreground font-medium w-8 text-right">{count}</span>
                  <span className="text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground">
        <span className="text-orange-400 font-mono font-semibold">ADR-021 FROZEN</span> — Calculs déterministes (ADR-015) · Lecture seule · Isolation RLS (ADR-007)
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('tenant');

  const TABS = [
    { id: 'tenant' as TabId,           label: 'Tableau de bord',      icon: BarChart2 },
    { id: 'revenue_by_owner' as TabId, label: 'Revenus / Propriétaire', icon: DollarSign },
    { id: 'owners' as TabId,           label: 'Relevés',               icon: Users },
    { id: 'operations' as TabId,       label: 'Opérations',            icon: Shield },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rapports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ADR-021 · Données réelles Supabase · Calculs déterministes ADR-015 · Export CSV + PDF</p>
        </div>
        <div className="flex border-b border-border gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap',
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
        {activeTab === 'tenant'           && <TenantTab />}
        {activeTab === 'revenue_by_owner' && <RevenueByOwnerTab />}
        {activeTab === 'owners'           && <OwnersTab />}
        {activeTab === 'operations'       && <OperationsTab />}
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
