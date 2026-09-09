// NewTransportPage — React Hook Form + Zod + Supabase INSERT — ADR-014
// Formulaire création trajet: type, réservation liée, chauffeur, lieux, horaire, vol, notes
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Car, Plane, MapPin, Clock, User, Info,
  Save, Loader2, ChevronDown,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const transportSchema = z.object({
  trip_type:         z.enum(['pickup', 'dropoff', 'custom']),
  reservation_id:    z.string().optional().nullable(),
  driver_id:         z.string().optional().nullable(),
  pickup_location:   z.string().min(2, 'Lieu de prise en charge requis').max(300),
  dropoff_location:  z.string().min(2, 'Lieu de dépose requis').max(300),
  scheduled_at:      z.string().min(1, 'Date et heure requises'),
  flight_number:     z.string().optional().nullable(),
  flight_arrival_at: z.string().optional().nullable(),
  guest_count:       z.coerce.number().int().min(1).max(20),
  notes:             z.string().optional().nullable(),
});
type TransportFormData = z.infer<typeof transportSchema>;

const TRIP_TYPES = [
  { value: 'pickup',  label: 'Prise en charge', desc: 'Aller chercher le voyageur',   icon: '→', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'dropoff', label: 'Dépose',           desc: 'Ramener le voyageur',          icon: '←', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'custom',  label: 'Personnalisé',     desc: 'Trajet sur mesure',            icon: '↔', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
];

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const Field = ({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground/60">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

async function fetchFormData() {
  const [reservationsRes, driversRes] = await Promise.all([
    supabase.from('reservations')
      .select('id, guest_first_name, guest_last_name, check_in, check_out, status')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .in('status', ['confirmed', 'checked_in', 'pending'])
      .order('check_in', { ascending: true })
      .limit(50),
    supabase.from('drivers')
      .select('id, first_name, last_name, vehicle_type, vehicle_plate, status')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('first_name'),
  ]);
  return {
    reservations: reservationsRes.data ?? [],
    drivers: driversRes.data ?? [],
  };
}

const NewTransportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const preselectedReservationId = searchParams.get('reservation_id') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['transport-form-data', TENANT_ID],
    queryFn: fetchFormData,
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, watch,
    formState: { errors, isValid },
  } = useForm<TransportFormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      trip_type:      'pickup',
      reservation_id: preselectedReservationId || null,
      driver_id:      null,
      guest_count:    1,
      notes:          null,
    },
    mode: 'onChange',
  });

  const watchedType = watch('trip_type');
  const watchedFlightNumber = watch('flight_number');

  const createTrip = useMutation({
    mutationFn: async (formData: TransportFormData) => {
      const { data: trip, error } = await supabase
        .from('transport_trips')
        .insert({
          tenant_id:         TENANT_ID,
          trip_type:         formData.trip_type,
          reservation_id:    formData.reservation_id || null,
          driver_id:         formData.driver_id || null,
          pickup_location:   formData.pickup_location.trim(),
          dropoff_location:  formData.dropoff_location.trim(),
          scheduled_at:      formData.scheduled_at,
          flight_number:     formData.flight_number || null,
          flight_arrival_at: formData.flight_arrival_at || null,
          guest_count:       formData.guest_count,
          notes:             formData.notes || null,
          status:            'pending',
        })
        .select('id')
        .single();
      if (error) throw error;
      return trip;
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['transport-trips', TENANT_ID] });
      toast.success('Trajet créé avec succès ✓');
      navigate(`/transport/${trip.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  }

  const selectedTypeInfo = TRIP_TYPES.find(t => t.value === watchedType);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/transport')} className="hover:text-foreground transition-colors">Transport</button>
          <span>/</span>
          <span className="text-foreground">Nouveau trajet</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Car className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nouveau trajet</h1>
            <p className="text-xs text-muted-foreground mt-1">Planifier un transfert aéroport ou trajet voyageur — ADR-014</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => createTrip.mutate(d))} className="space-y-6">

          {/* Trip type */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" /> Type de trajet
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {TRIP_TYPES.map(t => {
                const isSelected = watchedType === t.value;
                return (
                  <label key={t.value} className="cursor-pointer">
                    <input type="radio" value={t.value} {...register('trip_type')} className="sr-only" />
                    <div className={cn(
                      'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center min-h-[80px]',
                      isSelected ? cn('border-current', t.color) : 'border-border text-muted-foreground hover:border-border/70 bg-secondary/20',
                    )}>
                      <span className="text-xl mb-1">{t.icon}</span>
                      <span className="text-sm font-semibold">{t.label}</span>
                      <span className="text-xs opacity-70 mt-0.5 hidden sm:block">{t.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Reservation + Driver */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" /> Voyageur & Chauffeur
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Réservation liée" hint="Optionnel — lier à une réservation existante">
                <div className="relative">
                  <select {...register('reservation_id')}
                    className="w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]">
                    <option value="">— Sans réservation —</option>
                    {(data?.reservations ?? []).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.guest_first_name} {r.guest_last_name} · {r.check_in}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </Field>
              <Field label="Chauffeur" hint="Optionnel — assigner un chauffeur">
                <div className="relative">
                  <select {...register('driver_id')}
                    className="w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]">
                    <option value="">— Non assigné —</option>
                    {(data?.drivers ?? []).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                        {d.vehicle_type ? ` · ${d.vehicle_type}` : ''}
                        {d.vehicle_plate ? ` (${d.vehicle_plate})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {(data?.drivers ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground/60">Aucun chauffeur actif dans la base</p>
                )}
              </Field>
            </div>
            <Field label="Nombre de passagers" required error={errors.guest_count?.message}>
              <input type="number" {...register('guest_count')} min={1} max={20} className={inputCls} style={{ maxWidth: 120 }} />
            </Field>
          </section>

          {/* Locations + Schedule */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Lieux & Horaire
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Lieu de prise en charge" required error={errors.pickup_location?.message}
                hint="Adresse, nom d'aéroport ou terminal">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('pickup_location')} placeholder="Aéroport YUL, Terminal 1…" className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Lieu de dépose" required error={errors.dropoff_location?.message}
                hint="Adresse complète ou nom de la propriété">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('dropoff_location')} placeholder="123 Rue Principale, Montréal…" className={inputCls + ' pl-9'} />
                </div>
              </Field>
            </div>
            <Field label="Date et heure planifiées" required error={errors.scheduled_at?.message}>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="datetime-local" {...register('scheduled_at')}
                  min={new Date().toISOString().slice(0, 16)}
                  className={inputCls + ' pl-9'} />
              </div>
            </Field>
          </section>

          {/* Flight info */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-400" /> Informations de vol (optionnel)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Numéro de vol" error={errors.flight_number?.message}
                hint="Ex: AC123, AF456">
                <div className="relative">
                  <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('flight_number')} placeholder="AC123" className={inputCls + ' pl-9 uppercase'} />
                </div>
              </Field>
              {watchedFlightNumber && (
                <Field label="Heure d'arrivée du vol" error={errors.flight_arrival_at?.message}
                  hint="Pour anticiper les retards et ajuster le timing">
                  <input type="datetime-local" {...register('flight_arrival_at')} className={inputCls} />
                </Field>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" /> Notes internes
            </h2>
            <textarea {...register('notes')} rows={3}
              placeholder="Instructions spéciales, numéro de téléphone du voyageur, bagage particulier…"
              className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </section>

          {/* Preview */}
          {watch('pickup_location') && watch('dropoff_location') && (
            <div className={cn('rounded-xl px-5 py-4 border', selectedTypeInfo?.color.split(' ').slice(1).join(' ') ?? 'bg-secondary border-border')}>
              <p className={cn('text-xs font-semibold mb-2', selectedTypeInfo?.color.split(' ')[0] ?? 'text-foreground')}>
                Aperçu du trajet
              </p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-foreground font-medium truncate">{watch('pickup_location')}</span>
                <span className="text-muted-foreground flex-shrink-0">→</span>
                <span className="text-foreground font-medium truncate">{watch('dropoff_location')}</span>
              </div>
              {watch('scheduled_at') && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(watch('scheduled_at')).toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' })}
                  {' · '}{watch('guest_count')} passager{watch('guest_count') > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button type="button" onClick={() => navigate('/transport')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={createTrip.isPending || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createTrip.isPending && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}>
              {createTrip.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                : <><Save className="w-4 h-4" /> Créer le trajet</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewTransportPage;
