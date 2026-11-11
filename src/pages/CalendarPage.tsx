// CalendarPage — Live Supabase data — ADR-009
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Lock, DollarSign, Info, Building2, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';


const STATUS_COLOR: Record<string, string> = {
  available: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  booked: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  blocked: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  pending: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
};

const CHANNEL_COLOR: Record<string, string> = {
  airbnb: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  booking: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  direct: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  vrbo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

const RESERVATION_STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-emerald-400', pending: 'text-yellow-400', checked_in: 'text-blue-400',
  checked_out: 'text-slate-400', cancelled: 'text-red-400',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function fetchCalendarData(tenantId: string, year: number, month: number) {
  const startDate = formatDate(year, month, 1);
  const endDate = formatDate(year, month, getDaysInMonth(year, month));

  const [unitsRes, reservationsRes, blocksRes] = await Promise.all([
    supabase.from('units').select('id, name, property_id, base_rate, status').eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'active'),
    supabase.from('reservations')
      .select('id, unit_id, check_in, check_out, status, channel, guest_first_name, guest_last_name, nights, total_amount, currency')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('check_in', 'is', null)
      .lte('check_in', endDate)
      .gte('check_out', startDate),
    supabase.from('calendar_blocks')
      .select('id, unit_id, start_date, end_date, reason, notes')
      .eq('tenant_id', tenantId)
      .lte('start_date', endDate)
      .gte('end_date', startDate),
  ]);

  const units = unitsRes.data ?? [];
  const reservations = reservationsRes.data ?? [];
  const blocks = blocksRes.data ?? [];

  // Property names
  const propIds = [...new Set(units.map(u => u.property_id))];
  const { data: props } = await supabase.from('properties').select('id, name').in('id', propIds);
  const propMap: Record<string, string> = {};
  for (const p of props ?? []) propMap[p.id] = p.name;

  const availMap: Record<string, Record<string, string>> = {};
  for (const r of reservations) {
    if (!r.check_in || !r.check_out) continue;
    if (!availMap[r.unit_id]) availMap[r.unit_id] = {};
    const ci = new Date(r.check_in);
    const co = new Date(r.check_out);
    for (const d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      availMap[r.unit_id][ds] = ['confirmed', 'checked_in'].includes(r.status) ? 'booked' : 'pending';
    }
  }
  // Override with blocks
  for (const b of blocks) {
    if (!availMap[b.unit_id]) availMap[b.unit_id] = {};
    const bs = new Date(b.start_date);
    const be = new Date(b.end_date);
    for (const d = new Date(bs); d <= be; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      availMap[b.unit_id][ds] = 'blocked';
    }
  }

  return { units, reservations, blocks, availMap, propMap };
}

const CalendarPage = () => {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [selectedCell, setSelectedCell] = useState<{ unitId: string; date: string } | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ['calendar', tenantId, year, month],
    queryFn: () => fetchCalendarData(tenantId, year, month),
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ unitId, date }: { unitId: string; date: string }) => {
      const nextDay = new Date(`${date}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const { error } = await supabase.from('calendar_blocks').insert({
        tenant_id: tenantId,
        unit_id: unitId,
        start_date: date,
        end_date: nextDay.toISOString().slice(0, 10),
        reason: 'other',
        notes: 'Blocage manuel',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', tenantId, year, month] });
      toast.success('Jour bloqué');
      setSelectedCell(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePrev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const handleNext = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date().toISOString().slice(0, 10);

  const units = useMemo(() => {
    if (!data) return [];
    if (propertyFilter === 'all') return data.units;
    return data.units.filter(u => u.property_id === propertyFilter);
  }, [data, propertyFilter]);

  const properties = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    return data.units.filter(u => { if (seen.has(u.property_id)) return false; seen.add(u.property_id); return true; });
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return { booked: 0, blocked: 0, available: 0, reservations: 0 };
    let booked = 0, blocked = 0, available = 0;
    for (const u of units) {
      for (const d of days) {
        const ds = formatDate(year, month, d);
        const s = data.availMap[u.id]?.[ds] ?? 'available';
        if (s === 'booked' || s === 'pending') booked++;
        else if (s === 'blocked') blocked++;
        else available++;
      }
    }
    return { booked, blocked, available, reservations: data.reservations.length };
  }, [data, units, days, year, month]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <CalendarDays className="w-5 h-5 text-primary" />
              Calendrier
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Disponibilités réelles · {monthLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
            <button onClick={handleNext} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Unités affichées', value: units.length, color: 'text-blue-400', icon: Building2 },
            { label: 'Nuits réservées', value: stats.booked, color: 'text-blue-400', icon: BookOpen },
            { label: 'Nuits bloquées', value: stats.blocked, color: 'text-orange-400', icon: Lock },
            { label: 'Réservations ce mois', value: stats.reservations, color: 'text-emerald-400', icon: CalendarDays },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />
              <div>
                <div className={cn('text-2xl font-bold', color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Property filter */}
        {data && properties.length > 1 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Propriété :</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setPropertyFilter('all')}
                className={cn('text-xs px-3 py-1.5 rounded-lg border transition-colors min-h-[36px]',
                  propertyFilter === 'all' ? 'bg-primary/10 text-primary border-primary/25' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                )}>
                Toutes ({data.units.length})
              </button>
              {properties.map(u => (
                <button key={u.property_id} onClick={() => setPropertyFilter(u.property_id)}
                  className={cn('text-xs px-3 py-1.5 rounded-lg border transition-colors min-h-[36px]',
                    propertyFilter === u.property_id ? 'bg-primary/10 text-primary border-primary/25' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                  )}>
                  {data.propMap[u.property_id] ?? u.property_id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'Disponible', cls: 'bg-emerald-500/20 border-emerald-500/30' },
            { label: 'Réservé', cls: 'bg-blue-500/20 border-blue-500/30' },
            { label: 'En attente', cls: 'bg-yellow-500/20 border-yellow-500/30' },
            { label: 'Bloqué', cls: 'bg-orange-500/20 border-orange-500/30' },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn('w-3 h-3 rounded border', cls)} />
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        {isPending ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : units.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
            <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune unité disponible</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="sticky left-0 z-10 bg-secondary/80 backdrop-blur px-3 py-2.5 text-left text-muted-foreground font-medium w-32 min-w-[8rem]">Unité</th>
                  {days.map(d => {
                    const ds = formatDate(year, month, d);
                    const isToday = ds === today;
                    return (
                      <th key={d} className={cn('px-1 py-2.5 text-center font-medium min-w-[28px]', isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground')}>
                        {d}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit.id} className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
                    <td className="sticky left-0 z-10 bg-card backdrop-blur px-3 py-2 border-r border-border/30">
                      <div className="font-medium text-foreground truncate max-w-[7rem]">{unit.name}</div>
                      <div className="text-muted-foreground/60 text-xs font-mono">{data!.propMap[unit.property_id]?.slice(0, 10) ?? ''}</div>
                    </td>
                    {days.map(d => {
                      const ds = formatDate(year, month, d);
                      const status = data!.availMap[unit.id]?.[ds] ?? 'available';
                      const isSelected = selectedCell?.unitId === unit.id && selectedCell?.date === ds;
                      const isToday = ds === today;
                      return (
                        <td key={d} className={cn('px-0.5 py-1 text-center', isToday && 'bg-primary/5')}>
                          <button
                            onClick={() => setSelectedCell(isSelected ? null : { unitId: unit.id, date: ds })}
                            className={cn(
                              'w-6 h-6 rounded border text-xs transition-all',
                              STATUS_COLOR[status] ?? 'bg-secondary border-border',
                              isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                              status === 'available' && 'hover:bg-emerald-500/30',
                            )}
                            title={`${unit.name} — ${ds} — ${status}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected cell action */}
        {selectedCell && data && (
          <div className="bg-card border border-primary/30 rounded-xl p-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {data.units.find(u => u.id === selectedCell.unitId)?.name ?? selectedCell.unitId}
              </p>
              <p className="text-xs text-muted-foreground">{selectedCell.date}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => blockMutation.mutate({ unitId: selectedCell.unitId, date: selectedCell.date })}
                disabled={blockMutation.isPending}
                className="flex items-center gap-1.5 text-xs bg-orange-500/10 border border-orange-500/25 text-orange-400 px-3 py-2 rounded-lg hover:bg-orange-500/20 transition-colors min-h-[36px]"
              >
                <Lock className="w-3.5 h-3.5" /> Bloquer
              </button>
              <button onClick={() => setSelectedCell(null)}
                className="text-xs text-muted-foreground border border-border bg-secondary px-3 py-2 rounded-lg hover:text-foreground transition-colors min-h-[36px]">
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Reservations this month */}
        {data && data.reservations.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Réservations ce mois ({data.reservations.length})
            </h3>
            <div className="space-y-2">
              {data.reservations.map(r => (
                <div key={r.id} className="flex items-center gap-3 text-xs py-2 border-b border-border/30 last:border-0">
                  <span className={cn('font-semibold flex-shrink-0', RESERVATION_STATUS_COLOR[r.status])}>
                    {r.status === 'confirmed' ? '✓' : r.status === 'checked_in' ? '⌂' : r.status === 'cancelled' ? '✕' : '?'}
                  </span>
                  <span className="font-medium text-foreground flex-1 truncate">
                    {r.guest_first_name} {r.guest_last_name}
                  </span>
                  <span className="text-muted-foreground">{r.check_in} → {r.check_out}</span>
                  {r.nights && <span className="text-foreground font-mono">{r.nights}n</span>}
                  {r.channel && (
                    <span className={cn('px-1.5 py-0.5 rounded border flex-shrink-0', CHANNEL_COLOR[r.channel] ?? 'bg-secondary border-border text-muted-foreground')}>
                      {r.channel}
                    </span>
                  )}
                  <span className="text-emerald-400 font-mono flex-shrink-0">
                    {Number(r.total_amount).toFixed(2)} {r.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADR note */}
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-400/80 leading-relaxed">
            <span className="font-semibold text-blue-400">ADR-009 — Contrôle de concurrence :</span>{' '}
            Toutes les mutations passent par une transaction PostgreSQL avec verrou pessimiste sur{' '}
            <span className="font-mono">calendar_availability</span> (SELECT FOR UPDATE).
            Double réservation détectée au niveau DB avant commit. Idempotency key sur les imports OTA.
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
