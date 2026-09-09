// NewChannelPage — React Hook Form + Zod + Supabase INSERT — ADR-011
// Crée un nouveau canal OTA: airbnb|booking_com|vrbo|ical|direct|other
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Globe, DollarSign, Clock, Link,
  Save, Loader2, CheckCircle2, Info, RefreshCw,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const channelSchema = z.object({
  name:                   z.string().min(1, 'Nom requis').max(100),
  channel_type:           z.enum(['airbnb', 'booking_com', 'vrbo', 'ical', 'direct', 'other']),
  status:                 z.enum(['active', 'inactive']),
  commission_pct:         z.coerce.number().min(0).max(100),
  sync_frequency_minutes: z.coerce.number().int().min(5).max(1440),
  ical_url:               z.string().url('URL iCal invalide').optional().or(z.literal('')),
  api_key_ref:            z.string().max(255).optional(),
});
type ChannelFormData = z.infer<typeof channelSchema>;

const CHANNEL_TYPES = [
  { value: 'airbnb',      label: 'Airbnb',          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',    desc: '3–4% commission typique' },
  { value: 'booking_com', label: 'Booking.com',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',   desc: '10–18% commission' },
  { value: 'vrbo',        label: 'Vrbo / HomeAway',  color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',   desc: '5–8% commission' },
  { value: 'ical',        label: 'iCal (sync URL)',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', desc: 'Google Agenda, Outlook, etc.' },
  { value: 'direct',      label: 'Réservation directe', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', desc: '0% commission' },
  { value: 'other',       label: 'Autre',            color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', desc: 'Canal personnalisé' },
];

const SYNC_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 h',    value: 60 },
  { label: '4 h',    value: 240 },
  { label: '24 h',   value: 1440 },
];

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const selectCls =
  'w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm ' +
  'text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]';

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

const NewChannelPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isValid },
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      channel_type:           'airbnb',
      status:                 'active',
      commission_pct:         3,
      sync_frequency_minutes: 60,
      ical_url:               '',
      api_key_ref:            '',
    },
    mode: 'onChange',
  });

  const selectedType = watch('channel_type');
  const commissionPct = watch('commission_pct');
  const syncFreq = watch('sync_frequency_minutes');

  const createChannel = useMutation({
    mutationFn: async (data: ChannelFormData) => {
      const { error } = await supabase
        .from('channels')
        .insert({
          tenant_id:              TENANT_ID,
          name:                   data.name.trim(),
          channel_type:           data.channel_type,
          status:                 data.status,
          commission_pct:         data.commission_pct,
          sync_frequency_minutes: data.sync_frequency_minutes,
          ical_url:               data.ical_url?.trim() || null,
          api_key_ref:            data.api_key_ref?.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', TENANT_ID] });
      toast.success('Canal OTA créé avec succès ✓');
      navigate('/channels');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedTypeInfo = CHANNEL_TYPES.find(t => t.value === selectedType);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/channels')} className="hover:text-foreground transition-colors">Canaux OTA</button>
          <span>/</span>
          <span className="text-foreground">Nouveau canal</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Connecter un canal OTA</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Airbnb, Booking.com, Vrbo, iCal ou réservation directe
            </p>
          </div>
        </div>

        {/* ADR note */}
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400/80">
            <span className="font-semibold text-blue-400">ADR-011 ·</span> Chaque canal génère des channel_listings par unité.
            La synchronisation calendrier s'effectue via iCal ou API webhook selon le type.
          </p>
        </div>

        <form onSubmit={handleSubmit(d => createChannel.mutate(d))} className="space-y-6">

          {/* Type de canal */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Type de canal
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHANNEL_TYPES.map(ct => {
                const isSelected = selectedType === ct.value;
                return (
                  <label key={ct.value} className="cursor-pointer">
                    <input type="radio" value={ct.value} {...register('channel_type')} className="sr-only peer" />
                    <div className={cn(
                      'flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 transition-all min-h-[72px]',
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-secondary/20 hover:border-border/70',
                    )}>
                      <div className={cn('text-xs font-semibold', ct.color.split(' ')[0])}>{ct.label}</div>
                      <p className="text-xs text-muted-foreground/70 leading-tight">{ct.desc}</p>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-auto" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Informations */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Informations générales
            </h2>
            <Field label="Nom du canal" required error={errors.name?.message}
              hint={`Ex: ${selectedTypeInfo?.label ?? 'Canal'} Canada, Direct website…`}>
              <input {...register('name')} placeholder={`${selectedTypeInfo?.label ?? 'Canal'} — Mon marché`} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Statut initial" error={errors.status?.message}>
                <select {...register('status')} className={selectCls}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Tarification & Commission */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Commission & Synchronisation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Commission (%)" required error={errors.commission_pct?.message}
                hint="Taux appliqué sur les revenus bruts">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="number" min={0} max={100} step="0.01"
                    {...register('commission_pct')}
                    className={inputCls + ' pl-9'}
                    placeholder="3.00"
                  />
                </div>
                {Number(commissionPct) > 0 && (
                  <p className="text-xs text-amber-400">Impact: {Number(commissionPct).toFixed(1)}% déduit par réservation</p>
                )}
              </Field>
              <Field label="Fréquence de sync" required error={errors.sync_frequency_minutes?.message}>
                <div className="space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {SYNC_PRESETS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setValue('sync_frequency_minutes', p.value, { shouldDirty: true, shouldValidate: true })}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                          syncFreq === p.value
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30',
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="number" min={5} max={1440}
                      {...register('sync_frequency_minutes')}
                      className={inputCls + ' pl-9'}
                    />
                  </div>
                </div>
              </Field>
            </div>
          </section>

          {/* iCal / API (conditionnel) */}
          {(selectedType === 'ical' || selectedType === 'booking_com' || selectedType === 'vrbo') && (
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Link className="w-4 h-4 text-purple-400" />
                {selectedType === 'ical' ? 'URL iCal' : 'Configuration API'}
              </h2>
              {(selectedType === 'ical') && (
                <Field label="URL iCal (HTTPS)" error={errors.ical_url?.message}
                  hint="URL publique du calendrier iCal (.ics) à synchroniser">
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      {...register('ical_url')}
                      placeholder="https://calendar.google.com/calendar/ical/…"
                      className={inputCls + ' pl-9'}
                    />
                  </div>
                </Field>
              )}
              {(selectedType === 'booking_com' || selectedType === 'vrbo') && (
                <Field label="Référence clé API (optionnel)" error={errors.api_key_ref?.message}
                  hint="Identifiant de la clé API stockée dans les secrets du tenant">
                  <input {...register('api_key_ref')} placeholder="booking_com_api_key" className={inputCls} />
                </Field>
              )}
            </section>
          )}

          {/* Summary */}
          {watch('name') && (
            <div className={cn('rounded-xl px-5 py-4 border', selectedTypeInfo?.color.split(' ').slice(1).join(' ') ?? 'bg-secondary border-border')}>
              <p className={cn('text-xs font-semibold mb-2', selectedTypeInfo?.color.split(' ')[0] ?? 'text-foreground')}>
                Récapitulatif
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs text-center">
                <div>
                  <p className="font-semibold text-foreground">{watch('name')}</p>
                  <p className="text-muted-foreground">Nom</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{commissionPct}%</p>
                  <p className="text-muted-foreground">Commission</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">/{syncFreq} min</p>
                  <p className="text-muted-foreground">Sync</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/channels')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={createChannel.isPending || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createChannel.isPending && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {createChannel.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</>
                : <><Save className="w-4 h-4" /> Connecter le canal</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewChannelPage;
