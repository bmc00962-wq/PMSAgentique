// EditChannelPage — React Hook Form + Zod + Supabase UPDATE — ADR-011
// Toggle statut active/inactive, commission, sync settings, ical_url, api_key_ref
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Globe, DollarSign, RefreshCw, Key, Link,
  Save, Loader2, Info, ToggleLeft, ToggleRight, Settings,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const channelSchema = z.object({
  name:                   z.string().min(1, 'Nom requis').max(100),
  status:                 z.enum(['active', 'inactive', 'error', 'pending_setup']),
  commission_pct:         z.coerce.number().min(0).max(50),
  sync_frequency_minutes: z.coerce.number().int().min(5).max(1440),
  ical_url:               z.string().url('URL iCal invalide').optional().or(z.literal('')),
  api_key_ref:            z.string().optional().nullable(),
  webhook_secret_ref:     z.string().optional().nullable(),
});
type ChannelFormData = z.infer<typeof channelSchema>;

const CHANNEL_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  airbnb:   { label: 'Airbnb',        color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  booking:  { label: 'Booking.com',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  vrbo:     { label: 'Vrbo',          color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
  expedia:  { label: 'Expedia',       color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
  direct:   { label: 'Direct',        color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ical:     { label: 'iCal',          color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
  manual:   { label: 'Manuel',        color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
};

const SYNC_PRESETS = [
  { minutes: 15,   label: '15 min' },
  { minutes: 30,   label: '30 min' },
  { minutes: 60,   label: '1 heure' },
  { minutes: 180,  label: '3 heures' },
  { minutes: 360,  label: '6 heures' },
  { minutes: 720,  label: '12 heures' },
  { minutes: 1440, label: '24 heures' },
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

async function fetchChannel(id: string) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;
  return data;
}

const EditChannelPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel-edit', id],
    queryFn: () => fetchChannel(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    values: channel ? {
      name:                   channel.name,
      status:                 channel.status as ChannelFormData['status'],
      commission_pct:         Number(channel.commission_pct),
      sync_frequency_minutes: channel.sync_frequency_minutes,
      ical_url:               channel.ical_url ?? '',
      api_key_ref:            channel.api_key_ref ?? null,
      webhook_secret_ref:     channel.webhook_secret_ref ?? null,
    } : undefined,
    mode: 'onChange',
  });

  const watchedStatus = watch('status');
  const watchedFreq = watch('sync_frequency_minutes');
  const watchedCommission = watch('commission_pct');
  const isActive = watchedStatus === 'active';

  const updateChannel = useMutation({
    mutationFn: async (formData: ChannelFormData) => {
      const { error } = await supabase
        .from('channels')
        .update({
          name:                   formData.name.trim(),
          status:                 formData.status,
          commission_pct:         formData.commission_pct,
          sync_frequency_minutes: formData.sync_frequency_minutes,
          ical_url:               formData.ical_url || null,
          api_key_ref:            formData.api_key_ref || null,
          webhook_secret_ref:     formData.webhook_secret_ref || null,
          version:                (channel!.version ?? 1) + 1,
          updated_at:             new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['channels', TENANT_ID] });
      toast.success('Canal mis à jour ✓');
      navigate(`/channels/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Quick toggle status
  const toggleStatus = useMutation({
    mutationFn: async () => {
      const newStatus = channel!.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('channels')
        .update({ status: newStatus, version: (channel!.version ?? 1) + 1, updated_at: new Date().toISOString() })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (ns) => {
      queryClient.invalidateQueries({ queryKey: ['channel-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['channels', TENANT_ID] });
      toast.success(ns === 'active' ? 'Canal activé ✓' : 'Canal désactivé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!channel) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Canal introuvable</p>
          <button onClick={() => navigate('/channels')} className="text-primary text-sm hover:underline">← Canaux OTA</button>
        </div>
      </AppLayout>
    );
  }

  const channelDisplay = CHANNEL_TYPES[channel.channel_type] ?? CHANNEL_TYPES.manual;
  const isICalType = channel.channel_type === 'ical';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/channels')} className="hover:text-foreground transition-colors">Canaux OTA</button>
          <span>/</span>
          <button onClick={() => navigate(`/channels/${id}`)} className="hover:text-foreground transition-colors">{channel.name}</button>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>

        {/* Title + quick toggle */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', channelDisplay.bg)}>
            <Globe className={cn('w-6 h-6', channelDisplay.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Modifier {channel.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {channelDisplay.label} · Version {channel.version} · ADR-011 PMS source de vérité
            </p>
          </div>
          {/* Quick status toggle */}
          <button
            type="button"
            onClick={() => toggleStatus.mutate()}
            disabled={toggleStatus.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all min-h-[44px] disabled:opacity-50',
              channel.status === 'active'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20',
            )}>
            {toggleStatus.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : channel.status === 'active'
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />
            }
            {channel.status === 'active' ? 'Actif' : 'Inactif'}
          </button>
        </div>

        <form onSubmit={handleSubmit(d => updateChannel.mutate(d))} className="space-y-6">

          {/* Identity */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Identité du canal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom du canal" required error={errors.name?.message}>
                <input {...register('name')} placeholder="Mon Airbnb principal" className={inputCls} />
              </Field>
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Type (non modifiable)</p>
                <div className={cn('flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium', channelDisplay.bg)}>
                  <Globe className={cn('w-4 h-4', channelDisplay.color)} />
                  <span className={channelDisplay.color}>{channelDisplay.label}</span>
                </div>
              </div>
            </div>

            {/* Status selector */}
            <Field label="Statut" required error={errors.status?.message}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'active',        label: 'Actif',          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  { value: 'inactive',      label: 'Inactif',        color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
                  { value: 'error',         label: 'Erreur',         color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  { value: 'pending_setup', label: 'Config en cours', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                ].map(s => {
                  const isSelected = watchedStatus === s.value;
                  return (
                    <label key={s.value} className="cursor-pointer">
                      <input type="radio" value={s.value} {...register('status')} className="sr-only" />
                      <div className={cn(
                        'flex items-center justify-center py-3 px-3 rounded-xl border-2 transition-all text-center text-sm font-medium min-h-[44px]',
                        isSelected ? cn('border-current', s.color) : 'border-border text-muted-foreground hover:border-border/70 bg-secondary/20',
                      )}>
                        {s.label}
                      </div>
                    </label>
                  );
                })}
              </div>
            </Field>
          </section>

          {/* Commission + Sync */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" /> Paramètres de synchronisation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Commission (%)" error={errors.commission_pct?.message}
                hint="Pourcentage prélevé par la plateforme">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" step="0.01" min={0} max={50} {...register('commission_pct')} className={inputCls + ' pl-9'} />
                </div>
                {watchedCommission > 0 && (
                  <p className="text-xs text-orange-400 mt-1">
                    Commission: {Number(watchedCommission).toFixed(2)}% — soit {(Number(watchedCommission) / 100 * 1000).toFixed(0)} CAD sur une réservation de 1 000 CAD
                  </p>
                )}
              </Field>
              <Field label="Fréquence de sync" error={errors.sync_frequency_minutes?.message}>
                <div className="relative">
                  <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select {...register('sync_frequency_minutes')} className={inputCls + ' pl-9 appearance-none'}>
                    {SYNC_PRESETS.map(p => (
                      <option key={p.minutes} value={p.minutes}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </section>

          {/* Credentials */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" /> Credentials & URLs
            </h2>

            {isICalType ? (
              <Field label="URL iCal" error={errors.ical_url?.message}
                hint="URL du calendrier iCal fourni par la plateforme (lecture seule)">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('ical_url')} placeholder="https://www.airbnb.com/calendar/ical/…" className={inputCls + ' pl-9'} />
                </div>
              </Field>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Référence clé API" error={errors.api_key_ref?.message}
                  hint="Identifiant interne de la clé API (pas la valeur réelle)">
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input {...register('api_key_ref')} placeholder="airbnb-api-key-prod" className={inputCls + ' pl-9'} />
                  </div>
                </Field>
                <Field label="Référence webhook secret" error={errors.webhook_secret_ref?.message}
                  hint="Référence au secret de validation webhook">
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input {...register('webhook_secret_ref')} placeholder="airbnb-webhook-secret" className={inputCls + ' pl-9'} />
                  </div>
                </Field>
              </div>
            )}

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
              <p className="text-xs text-yellow-400">
                ⚠️ Les clés API réelles ne sont jamais stockées ici. Utilisez des identifiants de référence pointant vers votre gestionnaire de secrets (Vault, AWS SSM, etc.)
              </p>
            </div>
          </section>

          {/* ADR note */}
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400/80">
              <span className="font-semibold text-blue-400">ADR-011 ·</span> PMS est la source de vérité.
              Les modifications de statut n'affectent pas les réservations existantes.
              Version++ pour détection de conflits concurrents (ADR-006).
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button type="button" onClick={() => navigate(`/channels/${id}`)}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={updateChannel.isPending || !isDirty || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !updateChannel.isPending && isDirty && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}>
              {updateChannel.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                : <><Save className="w-4 h-4" /> Enregistrer les modifications</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditChannelPage;
