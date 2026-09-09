// NewReservationPage — React Hook Form + Zod + Supabase INSERT — ADR-010
// Calculs déterministes: base_rent + cleaning_fee + tax (ADR-015)
// Vérification disponibilité en temps réel (calendar_blocks + reservations conflicts)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, CalendarDays, DollarSign, Building2,
  User, CheckCircle2, AlertTriangle, ChevronDown, RefreshCw, Lock, XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TAX_QC = 0.18475;
const TAX_MA = 0.10;

const reservationSchema = z.object({
  unit_id:          z.string().uuid('Sélectionnez une unité'),
  guest_id:         z.string().optional(),
  guest_first_name: z.string().min(1, 'Prénom requis'),
  guest_last_name:  z.string().min(1, 'Nom requis'),
  guest_email:      z.string().email('Email invalide'),
  guest_phone:      z.string().optional(),
  check_in:         z.string().min(1, "Date d'arrivée requise"),
  check_out:        z.string().min(1, 'Date de départ requise'),
  guests_count:     z.number().int().min(1).max(20),
  channel:          z.enum(['direct', 'airbnb', 'booking', 'vrbo', 'manual']),
  internal_notes:   z.string().optional(),
}).refine(d => d.check_in < d.check_out, {
  message: "La date de départ doit être après l'arrivée",
  path: ['check_out'],
});

type ReservationFormData = z.infer<typeof reservationSchema>;

const CHANNEL_OPTIONS = [
  { value: 'direct',  label: 'Réservation directe' },
  { value: 'airbnb',  label: 'Airbnb' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'vrbo',    label: 'Vrbo' },
  { value: 'manual',  label: 'Manuel' },
];

async function fetchUnitsAndGuests() {
  const [unitsRes, guestsRes] = await Promise.all([
    supabase.from('units')
      .select('id, name, base_rate, cleaning_fee, currency, max_guests, status, property_id')
      .eq('tenant_id', TENANT_ID).eq('status', 'active').is('deleted_at', null).order('name'),
    supabase.from('guests')
      .select('id, first_name, last_name, email, phone')
      .eq('tenant_id', TENANT_ID).is('deleted_at', null).order('last_name').limit(100),
  ]);

  const units = unitsRes.data ?? [];
  const guests = guestsRes.data ?? [];
  const propIds = [...new Set(units.map(u => u.property_id))];
  const { data: props } = propIds.length > 0
    ? await supabase.from('properties').select('id, name, city, country').in('id', propIds)
    : { data: [] };

  const propMap: Record<string, { name: string; city: string; country: string }> = {};
  for (const p of props ?? []) propMap[p.id] = { name: p.name, city: p.city, country: p.country };

  return { units, guests, propMap };
}

async function checkAvailability(unitId: string, checkIn: string, checkOut: string): Promise<{
  available: boolean; conflictCount: number; message: string;
}> {
  if (!unitId || !checkIn || !checkOut || checkIn >= checkOut) {
    return { available: false, conflictCount: 0, message: '' };
  }

  // Check calendar_blocks
  const { data: blocks } = await supabase
    .from('calendar_blocks')
    .select('id, start_date, end_date, reason')
    .eq('unit_id', unitId).eq('tenant_id', TENANT_ID)
    .lte('start_date', checkOut).gte('end_date', checkIn);

  if (blocks && blocks.length > 0) {
    return { available: false, conflictCount: blocks.length, message: `Période bloquée (${blocks[0].reason.replace(/_/g, ' ')})` };
  }

  // Check existing reservations
  const { data: conflicts } = await supabase
    .from('reservations')
    .select('id, status, guest_first_name, guest_last_name, check_in, check_out')
    .eq('unit_id', unitId).eq('tenant_id', TENANT_ID).is('deleted_at', null)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('check_in', checkOut).gt('check_out', checkIn);

  if (conflicts && conflicts.length > 0) {
    const c = conflicts[0];
    return {
      available: false,
      conflictCount: conflicts.length,
      message: `Conflit: ${c.guest_first_name} ${c.guest_last_name} (${c.check_in} → ${c.check_out})`,
    };
  }

  return { available: true, conflictCount: 0, message: 'Période disponible ✓' };
}

function calcFinance(unit: { base_rate: number; cleaning_fee: number; currency: string }, nights: number, country: string) {
  const baseRent = Number(unit.base_rate) * nights;
  const cleaningFee = Number(unit.cleaning_fee);
  const taxRate = country === 'Morocco' || country === 'Maroc' ? TAX_MA : TAX_QC;
  const taxAmount = (baseRent + cleaningFee) * taxRate;
  const total = baseRent + cleaningFee + taxAmount;
  return { baseRent, cleaningFee, taxAmount, total, taxRate };
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const NewReservationPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [existingGuestMode, setExistingGuestMode] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; conflictCount: number; message: string } | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['new-reservation-data', TENANT_ID],
    queryFn: fetchUnitsAndGuests,
    staleTime: 60_000,
  });

  const units = data?.units ?? [];
  const guests = data?.guests ?? [];
  const propMap = data?.propMap ?? {};

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { guests_count: 1, channel: 'direct' },
  });

  const watchedUnitId = watch('unit_id');
  const watchedCheckIn = watch('check_in');
  const watchedCheckOut = watch('check_out');

  const selectedUnit = units.find(u => u.id === watchedUnitId);
  const nights = calcNights(watchedCheckIn, watchedCheckOut);
  const selectedProp = selectedUnit ? propMap[selectedUnit.property_id] : null;
  const finance = selectedUnit && nights > 0
    ? calcFinance(selectedUnit, nights, selectedProp?.country ?? 'Canada')
    : null;

  // Real-time availability check (debounced 600ms)
  useEffect(() => {
    if (!watchedUnitId || !watchedCheckIn || !watchedCheckOut || watchedCheckIn >= watchedCheckOut) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setCheckingAvail(true);
    const timer = setTimeout(async () => {
      const result = await checkAvailability(watchedUnitId, watchedCheckIn, watchedCheckOut);
      if (!cancelled) { setAvailability(result); setCheckingAvail(false); }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [watchedUnitId, watchedCheckIn, watchedCheckOut]);

  const handleGuestSelect = (guestId: string) => {
    const g = guests.find(g => g.id === guestId);
    if (g) {
      setValue('guest_first_name', g.first_name);
      setValue('guest_last_name', g.last_name);
      setValue('guest_email', g.email);
      setValue('guest_phone', g.phone ?? '');
    }
  };

  const createReservation = useMutation({
    mutationFn: async (data: ReservationFormData) => {
      if (!finance) throw new Error("Calcul financier impossible — vérifiez les dates et l'unité.");
      if (availability && !availability.available) throw new Error(`Unité non disponible: ${availability.message}`);

      const idempotencyKey = `direct-${data.unit_id}-${data.check_in}-${data.check_out}-${Date.now()}`;

      const { data: res, error } = await supabase.from('reservations').insert({
        tenant_id: TENANT_ID,
        unit_id: data.unit_id,
        guest_id: data.guest_id || null,
        check_in: data.check_in,
        check_out: data.check_out,
        guests_count: data.guests_count,
        status: 'inquiry',
        channel: data.channel,
        guest_first_name: data.guest_first_name,
        guest_last_name: data.guest_last_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone || null,
        base_rent: finance.baseRent,
        cleaning_fee: finance.cleaningFee,
        tax_amount: finance.taxAmount,
        channel_commission: 0,
        total_amount: finance.total,
        currency: selectedUnit?.currency ?? 'CAD',
        internal_notes: data.internal_notes || null,
        idempotency_key: idempotencyKey,
      }).select('id').single();
      if (error) throw error;

      // Append ledger entry (ADR-015 append-only)
      await supabase.from('ledger_entries').insert({
        tenant_id: TENANT_ID,
        reservation_id: res.id,
        entry_type: 'reservation_created',
        direction: 'credit',
        amount: finance.total,
        currency: selectedUnit?.currency ?? 'CAD',
        description: `Réservation ${data.guest_first_name} ${data.guest_last_name} · ${data.check_in} → ${data.check_out}`,
        reference_id: idempotencyKey,
      });

      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reservations', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['calendar', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Réservation créée avec succès ✓');
      navigate(`/reservations/${res.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSubmitDisabled = createReservation.isPending || !finance || (availability !== null && !availability.available);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reservations')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Réservations
          </button>
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <CalendarDays className="w-5 h-5 text-primary" />
            Nouvelle réservation
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            ADR-010 · Statut initial: inquiry · Calculs déterministes ADR-015 · Disponibilité vérifiée en temps réel
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <form onSubmit={handleSubmit(d => createReservation.mutate(d))} className="space-y-6">

            {/* Unit selection */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Unité
              </h2>
              <label className="block text-xs text-muted-foreground mb-1.5">Sélectionner une unité *</label>
              <div className="relative">
                <select {...register('unit_id')}
                  className="w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-10">
                  <option value="">-- Choisir une unité --</option>
                  {units.map(u => {
                    const p = propMap[u.property_id];
                    return (
                      <option key={u.id} value={u.id}>
                        {p?.name ?? '—'} · {u.name} · {Number(u.base_rate).toFixed(0)}/nuit ({u.currency})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.unit_id && <p className="text-xs text-red-400 mt-1">{errors.unit_id.message}</p>}

              {selectedUnit && selectedProp && (
                <div className="mt-4 bg-secondary/20 border border-border rounded-lg p-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground">{selectedProp.name} — {selectedUnit.name}</span>
                    <span className="text-muted-foreground">{selectedProp.city}, {selectedProp.country}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{Number(selectedUnit.base_rate).toFixed(2)} {selectedUnit.currency}/nuit</span>
                    <span>·</span>
                    <span>Ménage: {Number(selectedUnit.cleaning_fee).toFixed(2)} {selectedUnit.currency}</span>
                    <span>·</span>
                    <span>Max {selectedUnit.max_guests} voyageurs</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dates & guests */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Séjour
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Arrivée *</label>
                  <input type="date" {...register('check_in')}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  {errors.check_in && <p className="text-xs text-red-400 mt-1">{errors.check_in.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Départ *</label>
                  <input type="date" {...register('check_out')}
                    min={watchedCheckIn || new Date().toISOString().split('T')[0]}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  {errors.check_out && <p className="text-xs text-red-400 mt-1">{errors.check_out.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nombre de voyageurs *</label>
                  <input type="number" {...register('guests_count', { valueAsNumber: true })} min={1} max={20}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  {errors.guests_count && <p className="text-xs text-red-400 mt-1">{errors.guests_count.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Canal *</label>
                  <div className="relative">
                    <select {...register('channel')}
                      className="w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-10">
                      {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Availability indicator */}
              {nights > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {nights} nuit{nights > 1 ? 's' : ''}
                  {selectedUnit && selectedProp && ` · Taxe ${selectedProp.country === 'Morocco' || selectedProp.country === 'Maroc' ? 'TVA Maroc 10%' : 'QC 18.475%'}`}
                </div>
              )}

              {(checkingAvail || availability) && watchedUnitId && (
                <div className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all',
                  checkingAvail
                    ? 'bg-secondary/40 border-border text-muted-foreground'
                    : availability?.available
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400',
                )}>
                  {checkingAvail ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> Vérification de disponibilité…</>
                  ) : availability?.available ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {availability.message}</>
                  ) : (
                    <><XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {availability.message}</>
                  )}
                </div>
              )}
            </div>

            {/* Guest info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Voyageur
                </h2>
                {guests.length > 0 && (
                  <button type="button" onClick={() => setExistingGuestMode(!existingGuestMode)}
                    className="text-xs text-primary hover:underline">
                    {existingGuestMode ? 'Nouveau voyageur' : 'Voyageur existant'}
                  </button>
                )}
              </div>

              {existingGuestMode && (
                <div className="mb-4">
                  <label className="block text-xs text-muted-foreground mb-1.5">Sélectionner un voyageur existant</label>
                  <div className="relative">
                    <select {...register('guest_id')}
                      onChange={e => { register('guest_id').onChange(e); handleGuestSelect(e.target.value); }}
                      className="w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-10">
                      <option value="">-- Sélectionner --</option>
                      {guests.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name} · {g.email}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'guest_first_name' as const, label: 'Prénom', placeholder: 'Jean', required: true },
                  { key: 'guest_last_name' as const,  label: 'Nom',    placeholder: 'Dupont', required: true },
                ].map(({ key, label, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-xs text-muted-foreground mb-1.5">{label} {required && '*'}</label>
                    <input {...register(key)} placeholder={placeholder}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                    {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]?.message}</p>}
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Email *</label>
                  <input type="email" {...register('guest_email')} placeholder="jean@exemple.com"
                    className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                  {errors.guest_email && <p className="text-xs text-red-400 mt-1">{errors.guest_email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Téléphone</label>
                  <input {...register('guest_phone')} placeholder="+1 514 555 0000"
                    className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs text-muted-foreground mb-1.5">Notes internes</label>
                <textarea {...register('internal_notes')} rows={2} placeholder="Notes privées (non visibles par le voyageur)..."
                  className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>

            {/* Finance summary */}
            {finance && nights > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Récapitulatif financier
                  <span className="text-xs text-muted-foreground font-normal">(ADR-015 · calcul déterministe)</span>
                </h2>
                <div className="space-y-2 text-sm mb-4">
                  {[
                    { label: `Loyer base (${nights} nuit${nights > 1 ? 's' : ''} × ${Number(selectedUnit?.base_rate ?? 0).toFixed(2)} ${selectedUnit?.currency})`, value: finance.baseRent },
                    { label: 'Frais de ménage', value: finance.cleaningFee },
                    { label: `Taxe (${(finance.taxRate * 100).toFixed(3)}%)`, value: finance.taxAmount },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <span className="text-foreground font-medium tabular-nums">{value.toFixed(2)} {selectedUnit?.currency ?? 'CAD'}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{finance.total.toFixed(2)} {selectedUnit?.currency ?? 'CAD'}</span>
                  </div>
                </div>

                {/* Availability gate in finance section */}
                {availability && !availability.available && (
                  <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-xs mb-3">
                    <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-red-400">
                      Cette unité n'est pas disponible pour la période sélectionnée. Choisissez d'autres dates ou une autre unité.
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Statut initial: <strong className="text-blue-400">inquiry</strong> · Machine d'état ADR-010 · Grand livre append-only ADR-015
                  </span>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pb-8">
              <button type="button" onClick={() => navigate('/reservations')}
                className="px-6 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                  !isSubmitDisabled
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}>
                {createReservation.isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Création…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Créer la réservation</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default NewReservationPage;
