// CalendarUnitPage — Disponibilité unité — ADR-009
// Vue mensuelle: calendar_availability + réservations overlay
// Actions: bloquer période (calendar_blocks) · modifier tarif par date (calendar_availability)
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Home, Lock,
  DollarSign, Plus, X, Loader2, Info, Calendar,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const STATUS_COLOR: Record<string, string> = {
  available:    'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  booked:       'bg-blue-500/20 border-blue-500/30 text-blue-400',
  blocked:      'bg-red-500/20 border-red-500/30 text-red-400',
  maintenance:  'bg-orange-500/20 border-orange-500/30 text-orange-400',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function fetchCalendarData(unitId: string, year: number, month: number) {
  const firstDay = formatDate(year, month, 1);
  const lastDay = formatDate(year, month, getDaysInMonth(year, month));

  const [unitRes, availRes, resRes, blocksRes] = await Promise.all([
    supabase.from('units').select('id, name, base_rate, currency, status, property_id').eq('id', unitId).single(),
    supabase.from('calendar_availability')
      .select('date, status, base_rate, min_stay, note, reservation_id')
      .eq('unit_id', unitId)
      .eq('tenant_id', TENANT_ID)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase.from('reservations')
      .select('id, check_in, check_out, status, guest_first_name, guest_last_name')
      .eq('unit_id', unitId)
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled")')
      .or(`check_in.lte.${lastDay},check_out.gte.${firstDay}`),
    supabase.from('calendar_blocks')
      .select('id, start_date, end_date, reason, note')
      .eq('unit_id', unitId)
      .eq('tenant_id', TENANT_ID)
      .or(`start_date.lte.${lastDay},end_date.gte.${firstDay}`),
  ]);

  const availability: Record<string, { status: string; base_rate: number; note?: string }> = {};
  for (const a of availRes.data ?? []) {
    availability[a.date] = { status: a.status, base_rate: Number(a.base_rate), note: a.note ?? undefined };
  }

  // Build reservation dates set
  const reservationDates: Record<string, { id: string; guestName: string; status: string }> = {};
  for (const r of resRes.data ?? []) {
    if (!r.check_in || !r.check_out) continue;
    const ci = new Date(r.check_in);
    const co = new Date(r.check_out);
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (key >= firstDay && key <= lastDay) {
        reservationDates[key] = {
          id: r.id,
          guestName: `${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''}`.trim(),
          status: r.status,
        };
      }
    }
  }

  // Build block dates
  const blockDates: Record<string, { id: string; reason: string; note?: string }> = {};
  for (const b of blocksRes.data ?? []) {
    const bs = new Date(b.start_date);
    const be = new Date(b.end_date);
    for (let d = new Date(bs); d <= be; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (key >= firstDay && key <= lastDay) {
        blockDates[key] = { id: b.id, reason: b.reason, note: b.note ?? undefined };
      }
    }
  }

  // Fetch property name
  const { data: propData } = unitRes.data?.property_id
    ? await supabase.from('properties').select('name').eq('id', unitRes.data.property_id).single()
    : { data: null };

  return {
    unit: unitRes.data,
    propertyName: propData?.name ?? '',
    availability,
    reservationDates,
    blockDates,
    rawBlocks: blocksRes.data ?? [],
  };
}

const CalendarUnitPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);

  // Block form state
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('owner_block');
  const [blockNote, setBlockNote] = useState('');

  // Rate form state
  const [rateDate, setRateDate] = useState('');
  const [rateValue, setRateValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-unit', id, year, month],
    queryFn: () => fetchCalendarData(id!, year, month),
    enabled: !!id,
    staleTime: 30_000,
  });

  const addBlock = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('calendar_blocks').insert({
        tenant_id: TENANT_ID,
        unit_id: id!,
        start_date: blockStart,
        end_date: blockEnd,
        reason: blockReason,
        note: blockNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-unit', id] });
      toast.success('Période bloquée ✓');
      setShowBlockForm(false);
      setBlockStart(''); setBlockEnd(''); setBlockNote('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('calendar_availability')
        .upsert({
          tenant_id: TENANT_ID,
          unit_id: id!,
          date: rateDate,
          base_rate: Number(rateValue),
          status: data?.availability[rateDate]?.status ?? 'available',
          min_stay: 1,
        }, { onConflict: 'unit_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-unit', id] });
      toast.success(`Tarif mis à jour pour ${rateDate} ✓`);
      setShowRateForm(false);
      setRateDate(''); setRateValue('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.unit) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Unité introuvable</p>
          <button onClick={() => navigate('/properties')} className="text-primary text-sm hover:underline">← Propriétés</button>
        </div>
      </AppLayout>
    );
  }

  const { unit: u, propertyName, availability, reservationDates, blockDates } = data;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

  const selectedDateInfo = selectedDate ? {
    avail: availability[selectedDate],
    reservation: reservationDates[selectedDate],
    block: blockDates[selectedDate],
  } : null;

  // Stats for the month
  const availCount = Object.values(availability).filter(a => a.status === 'available').length;
  const bookedCount = Object.keys(reservationDates).length;
  const blockedCount = Object.keys(blockDates).length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/properties')} className="hover:text-foreground">{propertyName || 'Propriétés'}</button>
          <span>/</span>
          <button onClick={() => navigate(`/units/${id}`)} className="hover:text-foreground">{u.name}</button>
          <span>/</span>
          <span className="text-foreground">Calendrier</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{u.name} — Calendrier</h1>
              <p className="text-xs text-muted-foreground">{propertyName} · {Number(u.base_rate).toFixed(2)} {u.currency}/nuit (base)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowRateForm(f => !f); setShowBlockForm(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 border border-border bg-secondary rounded-xl font-medium hover:border-primary/30 transition-colors min-h-[40px]">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Tarif par date
            </button>
            <button
              onClick={() => { setShowBlockForm(f => !f); setShowRateForm(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-colors min-h-[40px]">
              <Lock className="w-3.5 h-3.5" /> Bloquer période
            </button>
          </div>
        </div>

        {/* Inline forms */}
        {showBlockForm && (
          <div className="bg-card border border-red-500/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Bloquer une période
              </h3>
              <button onClick={() => setShowBlockForm(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Début <span className="text-red-400">*</span></label>
                <input type="date" value={blockStart} onChange={e => setBlockStart(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Fin <span className="text-red-400">*</span></label>
                <input type="date" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} min={blockStart}
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Raison</label>
                <select value={blockReason} onChange={e => setBlockReason(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="owner_block">Blocage propriétaire</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="renovation">Rénovation</option>
                  <option value="personal_use">Usage personnel</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Note (optionnel)</label>
                <input value={blockNote} onChange={e => setBlockNote(e.target.value)} placeholder="Contexte…"
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <button
              onClick={() => addBlock.mutate()}
              disabled={addBlock.isPending || !blockStart || !blockEnd}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors min-h-[44px]">
              {addBlock.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Confirmer le blocage
            </button>
          </div>
        )}

        {showRateForm && (
          <div className="bg-card border border-emerald-500/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Modifier tarif par date
              </h3>
              <button onClick={() => setShowRateForm(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Date <span className="text-red-400">*</span></label>
                <input type="date" value={rateDate} onChange={e => setRateDate(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nouveau tarif ({u.currency}/nuit) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" min={0} step="0.01" value={rateValue} onChange={e => setRateValue(e.target.value)} placeholder={u.base_rate.toString()}
                    className="w-full bg-secondary/40 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
            <button
              onClick={() => updateRate.mutate()}
              disabled={updateRate.isPending || !rateDate || !rateValue}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[44px]">
              {updateRate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Mettre à jour le tarif
            </button>
          </div>
        )}

        {/* Legend + stats */}
        <div className="flex items-center gap-6 flex-wrap text-xs">
          {[
            { color: 'bg-emerald-500/30', label: `Disponible (${availCount})` },
            { color: 'bg-blue-500/30', label: `Réservé (${bookedCount})` },
            { color: 'bg-red-500/30', label: `Bloqué (${blockedCount})` },
            { color: 'bg-slate-500/20', label: 'Inconnu' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded-sm', color)} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h2 className="text-sm font-semibold text-foreground capitalize">{monthLabel}</h2>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center py-2 text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 border-b border-r border-border/30 bg-secondary/10" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(year, month, day);
              const avail = availability[dateStr];
              const res = reservationDates[dateStr];
              const block = blockDates[dateStr];
              const isToday = dateStr === now.toISOString().slice(0, 10);
              const isPast = dateStr < now.toISOString().slice(0, 10);
              const isSelected = selectedDate === dateStr;

              let cellBg = 'bg-card';
              let dotColor = '';
              if (block) { cellBg = 'bg-red-500/10'; dotColor = 'bg-red-400'; }
              else if (res) { cellBg = 'bg-blue-500/10'; dotColor = 'bg-blue-400'; }
              else if (avail?.status === 'available') { cellBg = 'bg-emerald-500/5'; dotColor = 'bg-emerald-400'; }
              else if (avail?.status === 'booked') { cellBg = 'bg-blue-500/10'; dotColor = 'bg-blue-400'; }

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    'h-16 border-b border-r border-border/30 p-1.5 text-left transition-all hover:ring-1 hover:ring-primary/30 focus:outline-none',
                    cellBg,
                    isPast && 'opacity-50',
                    isSelected && 'ring-2 ring-primary/50',
                  )}>
                  <div className={cn(
                    'text-xs font-semibold mb-1',
                    isToday ? 'w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px]' : 'text-foreground',
                  )}>
                    {day}
                  </div>
                  {dotColor && <div className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />}
                  {avail?.base_rate && avail.base_rate !== Number(u.base_rate) && (
                    <div className="text-[9px] text-emerald-400 font-mono mt-0.5">{avail.base_rate}$</div>
                  )}
                  {res && <div className="text-[9px] text-blue-400 truncate mt-0.5">{res.guestName.split(' ')[0]}</div>}
                  {block && <div className="text-[9px] text-red-400 truncate mt-0.5">🔒</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date detail */}
        {selectedDate && selectedDateInfo && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CA', { dateStyle: 'full' })}
            </h3>
            {selectedDateInfo.block && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm">
                <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Bloqué — {selectedDateInfo.block.reason.replace(/_/g, ' ')}</p>
                  {selectedDateInfo.block.note && <p className="text-xs text-muted-foreground mt-0.5">{selectedDateInfo.block.note}</p>}
                </div>
              </div>
            )}
            {selectedDateInfo.reservation && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm">
                <Home className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-blue-400 font-medium">Réservé — {selectedDateInfo.reservation.guestName}</p>
                </div>
                <button onClick={() => navigate(`/reservations/${selectedDateInfo.reservation!.id}`)}
                  className="text-xs text-primary hover:underline flex-shrink-0">Voir →</button>
              </div>
            )}
            {!selectedDateInfo.block && !selectedDateInfo.reservation && (
              <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-emerald-400 font-medium">Disponible</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tarif: {selectedDateInfo.avail?.base_rate ?? Number(u.base_rate).toFixed(2)} {u.currency}/nuit
                  </p>
                </div>
                <button
                  onClick={() => { setRateDate(selectedDate); setRateValue(String(selectedDateInfo.avail?.base_rate ?? u.base_rate)); setShowRateForm(true); setSelectedDate(null); }}
                  className="text-xs text-primary hover:underline flex-shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ADR note */}
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400/80">
            <span className="font-semibold text-blue-400">ADR-009 ·</span> calendar_availability (status/tarif par date) + calendar_blocks (blocages).
            Réservations superposées en lecture depuis reservations.check_in/check_out.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarUnitPage;
