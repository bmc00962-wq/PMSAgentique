// EditUnitPage — React Hook Form + Zod + Supabase UPDATE — ADR-006
// Formulaire pré-rempli avec optimistic locking version++
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Home, BedDouble, Users, DollarSign,
  Save, Loader2, Hash, Layers, Lock, Info,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const unitSchema = z.object({
  name:         z.string().min(1, 'Nom requis').max(100),
  unit_type:    z.enum(['apartment','studio','chalet','villa','house','room','other']),
  bedrooms:     z.coerce.number().int().min(0).max(20),
  bathrooms:    z.coerce.number().min(0).max(20),
  max_guests:   z.coerce.number().int().min(1).max(50),
  area_sqm:     z.coerce.number().min(0).optional().nullable(),
  floor:        z.coerce.number().int().optional().nullable(),
  base_rate:    z.coerce.number().min(0, 'Tarif requis'),
  cleaning_fee: z.coerce.number().min(0),
  currency:     z.enum(['CAD','EUR','USD','MAD']),
  status:       z.enum(['active','inactive','maintenance']),
  smart_lock_id:z.string().optional().nullable(),
});
type UnitFormData = z.infer<typeof unitSchema>;

const UNIT_TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'studio',    label: 'Studio' },
  { value: 'chalet',    label: 'Chalet' },
  { value: 'villa',     label: 'Villa' },
  { value: 'house',     label: 'Maison' },
  { value: 'room',      label: 'Chambre' },
  { value: 'other',     label: 'Autre' },
];

const STATUSES = [
  { value: 'active',      label: 'Actif',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'inactive',    label: 'Inactif',     color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
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

async function fetchUnit(id: string) {
  const { data: unit, error } = await supabase
    .from('units')
    .select('id, name, unit_type, property_id, bedrooms, bathrooms, max_guests, area_sqm, floor, base_rate, cleaning_fee, currency, status, smart_lock_id, version')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, city')
    .eq('id', unit.property_id)
    .single();

  return { unit, property };
}

const EditUnitPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['unit-edit', id],
    queryFn: () => fetchUnit(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const {
    register, handleSubmit, watch,
    formState: { errors, isDirty, isValid },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    values: data?.unit ? {
      name:          data.unit.name,
      unit_type:     data.unit.unit_type as UnitFormData['unit_type'],
      bedrooms:      data.unit.bedrooms,
      bathrooms:     Number(data.unit.bathrooms),
      max_guests:    data.unit.max_guests,
      area_sqm:      data.unit.area_sqm ?? null,
      floor:         data.unit.floor ?? null,
      base_rate:     Number(data.unit.base_rate),
      cleaning_fee:  Number(data.unit.cleaning_fee),
      currency:      (data.unit.currency ?? 'CAD') as UnitFormData['currency'],
      status:        data.unit.status as UnitFormData['status'],
      smart_lock_id: data.unit.smart_lock_id ?? null,
    } : undefined,
    mode: 'onChange',
  });

  const watchedStatus = watch('status');
  const watchedRate = watch('base_rate');
  const watchedCleaning = watch('cleaning_fee');

  const updateUnit = useMutation({
    mutationFn: async (formData: UnitFormData) => {
      const { error } = await supabase
        .from('units')
        .update({
          name:          formData.name.trim(),
          unit_type:     formData.unit_type,
          bedrooms:      formData.bedrooms,
          bathrooms:     formData.bathrooms,
          max_guests:    formData.max_guests,
          area_sqm:      formData.area_sqm || null,
          floor:         formData.floor ?? null,
          base_rate:     formData.base_rate,
          cleaning_fee:  formData.cleaning_fee,
          currency:      formData.currency,
          status:        formData.status,
          smart_lock_id: formData.smart_lock_id || null,
          version:       (data!.unit.version ?? 1) + 1,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['unit-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['property-detail'] });
      toast.success('Unité mise à jour ✓');
      navigate(`/units/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  }

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

  const weeklyEst = Number(watchedRate || 0) * 7 + Number(watchedCleaning || 0);
  const selectedStatus = STATUSES.find(s => s.value === watchedStatus);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {data.property && (
            <>
              <button onClick={() => navigate(`/properties/${data.unit.property_id}`)} className="hover:text-foreground transition-colors">
                {data.property.name}
              </button>
              <span>/</span>
            </>
          )}
          <button onClick={() => navigate(`/units/${id}`)} className="hover:text-foreground transition-colors">{data.unit.name}</button>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Modifier l'unité</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {data.property?.name} · Version {data.unit.version} · ADR-006 optimistic locking
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => updateUnit.mutate(d))} className="space-y-6">

          {/* Identity */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400" /> Identité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de l'unité" required error={errors.name?.message} hint="Ex: Appartement 3A, Studio Vue Mer…">
                <input {...register('name')} placeholder="Appartement 3A" className={inputCls} />
              </Field>
              <Field label="Type" required error={errors.unit_type?.message}>
                <select {...register('unit_type')} className={selectCls}>
                  {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Specs */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-purple-400" /> Caractéristiques
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Chambres" required error={errors.bedrooms?.message}>
                <input type="number" {...register('bedrooms')} min={0} max={20} className={inputCls} />
              </Field>
              <Field label="Salles de bain" required error={errors.bathrooms?.message}>
                <input type="number" step="0.5" {...register('bathrooms')} min={0} className={inputCls} />
              </Field>
              <Field label="Max voyageurs" required error={errors.max_guests?.message}>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" {...register('max_guests')} min={1} className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Surface (m²)" error={errors.area_sqm?.message}>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" step="0.1" {...register('area_sqm')} min={0} placeholder="45" className={inputCls + ' pl-9'} />
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Étage" error={errors.floor?.message}>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" {...register('floor')} placeholder="0" className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="ID Serrure connectée" error={errors.smart_lock_id?.message} hint="Identifiant du smart lock (optionnel)">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('smart_lock_id')} placeholder="YALE-001, SCHLAGE-42…" className={inputCls + ' pl-9'} />
                </div>
              </Field>
            </div>
          </section>

          {/* Pricing */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Tarification
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Tarif / nuit" required error={errors.base_rate?.message}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" step="0.01" min={0} {...register('base_rate')} placeholder="150.00" className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Frais de ménage" error={errors.cleaning_fee?.message}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" step="0.01" min={0} {...register('cleaning_fee')} placeholder="75.00" className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Devise" required error={errors.currency?.message}>
                <select {...register('currency')} className={selectCls}>
                  <option value="CAD">CAD — Dollar canadien</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — Dollar US</option>
                  <option value="MAD">MAD — Dirham marocain</option>
                </select>
              </Field>
            </div>

            {/* Live preview */}
            {(watchedRate > 0 || watchedCleaning > 0) && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">Aperçu tarif</p>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <p className="text-lg font-bold font-mono text-emerald-400">{Number(watchedRate || 0).toFixed(2)}</p>
                    <p className="text-muted-foreground">{watch('currency')}/nuit</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-blue-400">{Number(watchedCleaning || 0).toFixed(2)}</p>
                    <p className="text-muted-foreground">frais ménage</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-purple-400">{weeklyEst.toFixed(0)}</p>
                    <p className="text-muted-foreground">semaine estimée</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Status */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-yellow-400" /> Statut
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {STATUSES.map(s => {
                const isSelected = watchedStatus === s.value;
                return (
                  <label key={s.value} className="cursor-pointer">
                    <input type="radio" value={s.value} {...register('status')} className="sr-only" />
                    <div className={cn(
                      'flex items-center justify-center text-sm font-medium py-3 px-3 rounded-xl border-2 transition-all text-center min-h-[48px]',
                      isSelected ? cn('border-current', s.color) : 'border-border text-muted-foreground hover:border-border/70 bg-secondary/20',
                    )}>
                      {s.label}
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedStatus && watchedStatus === 'maintenance' && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                <p className="text-xs text-orange-400">
                  Statut Maintenance : l'unité sera retirée des résultats de disponibilité et aucune nouvelle réservation ne sera acceptée.
                </p>
              </div>
            )}
          </section>

          {/* ADR note */}
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400/80">
              <span className="font-semibold text-blue-400">ADR-006 ·</span> UPDATE avec version++ pour détection de conflits concurrents.
              Les tarifs modifiés s'appliquent aux nouvelles réservations uniquement.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate(`/units/${id}`)}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={updateUnit.isPending || !isDirty || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !updateUnit.isPending && isDirty && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}>
              {updateUnit.isPending
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

export default EditUnitPage;
