// NewUnitPage — React Hook Form + Zod + Supabase INSERT — ADR-009
// Accessible depuis PropertyDetailPage; property_id passé en query param ou URL param
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Chrome as Home, DollarSign, Users, Hash, Layers, Save, Loader as Loader2, BedDouble } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const unitSchema = z.object({
  name:        z.string().min(1, 'Nom requis').max(120),
  unit_type:   z.enum(['apartment', 'studio', 'chalet', 'villa', 'house', 'room', 'other']),
  property_id: z.string().uuid('Sélectionnez une propriété'),
  bedrooms:    z.coerce.number().int().min(0).max(20),
  bathrooms:   z.coerce.number().min(0).max(20),
  max_guests:  z.coerce.number().int().min(1).max(50),
  floor:       z.coerce.number().int().optional().nullable(),
  area_sqm:    z.coerce.number().min(0).optional().nullable(),
  base_rate:   z.coerce.number().min(0, 'Tarif requis'),
  cleaning_fee:z.coerce.number().min(0),
  currency:    z.enum(['CAD', 'MAD', 'EUR', 'USD']),
  status:      z.enum(['active', 'inactive', 'maintenance']),
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

const CURRENCIES = [
  { value: 'CAD', label: '🇨🇦 CAD — Dollar canadien' },
  { value: 'MAD', label: '🇲🇦 MAD — Dirham marocain' },
  { value: 'EUR', label: '🇪🇺 EUR — Euro' },
  { value: 'USD', label: '🇺🇸 USD — Dollar américain' },
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

const NewUnitPage = () => {
  const navigate = useNavigate();
  const { propertyId: paramPropertyId } = useParams<{ propertyId?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Property ID from param or query string
  const preselectedPropertyId = paramPropertyId ?? searchParams.get('property_id') ?? '';

  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  // Load properties for dropdown
  const { data: properties = [], isLoading: propsLoading } = useQuery({
    queryKey: ['properties-list-unit', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, city')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const selectedProperty = properties.find(p => p.id === preselectedPropertyId);

  const {
    register, handleSubmit, watch,
    formState: { errors, isDirty, isValid },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_type:    'apartment',
      property_id:  preselectedPropertyId,
      bedrooms:     1,
      bathrooms:    1,
      max_guests:   2,
      base_rate:    0,
      cleaning_fee: 0,
      currency:     'CAD',
      status:       'active',
    },
    mode: 'onChange',
  });

  const currency = watch('currency');
  const baseRate = watch('base_rate');
  const cleaningFee = watch('cleaning_fee');

  const createUnit = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const { data: unit, error } = await supabase
        .from('units')
        .insert({
          tenant_id:    tenantId,
          property_id:  data.property_id,
          name:         data.name.trim(),
          unit_type:    data.unit_type,
          bedrooms:     data.bedrooms,
          bathrooms:    data.bathrooms,
          max_guests:   data.max_guests,
          floor:        data.floor || null,
          area_sqm:     data.area_sqm || null,
          base_rate:    data.base_rate,
          cleaning_fee: data.cleaning_fee,
          currency:     data.currency,
          status:       data.status,
        })
        .select('id')
        .single();
      if (error) throw error;
      return unit;
    },
    onSuccess: (unit) => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['property-detail', preselectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['units', tenantId] });
      toast.success('Unité créée avec succès ✓');
      // Navigate back to property if we know it
      if (preselectedPropertyId) {
        navigate(`/properties/${preselectedPropertyId}`);
      } else {
        navigate('/properties');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (propsLoading) {
    return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/properties')} className="hover:text-foreground transition-colors">
            Propriétés
          </button>
          {selectedProperty && (
            <>
              <span>/</span>
              <button onClick={() => navigate(`/properties/${preselectedPropertyId}`)} className="hover:text-foreground transition-colors">
                {selectedProperty.name}
              </button>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">Nouvelle unité</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nouvelle unité</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedProperty
                ? `Ajouter une unité à ${selectedProperty.name} · ${selectedProperty.city}`
                : 'Créer une nouvelle unité locative'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => createUnit.mutate(d))} className="space-y-6">

          {/* Informations générales */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400" /> Informations générales
            </h2>
            <Field label="Nom de l'unité" required error={errors.name?.message} hint="Ex: App. 3½, Suite Jasmin, Chalet Nord…">
              <input {...register('name')} placeholder="App. 3½" className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type d'unité" required error={errors.unit_type?.message}>
                <select {...register('unit_type')} className={selectCls}>
                  {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Statut" error={errors.status?.message}>
                <select {...register('status')} className={selectCls}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </Field>
            </div>
            <Field label="Propriété" required error={errors.property_id?.message}>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select {...register('property_id')} className={selectCls + ' pl-9'}>
                  <option value="">— Sélectionner une propriété —</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>
                  ))}
                </select>
              </div>
            </Field>
          </section>

          {/* Capacité */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-purple-400" /> Capacité
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Chambres" required error={errors.bedrooms?.message}>
                <input type="number" min={0} max={20} {...register('bedrooms')} className={inputCls + ' text-center'} />
              </Field>
              <Field label="Salles de bain" required error={errors.bathrooms?.message}>
                <input type="number" min={0} max={20} step="0.5" {...register('bathrooms')} className={inputCls + ' text-center'} />
              </Field>
              <Field label="Max voyageurs" required error={errors.max_guests?.message}>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" min={1} max={50} {...register('max_guests')} className={inputCls + ' pl-9 text-center'} />
                </div>
              </Field>
              <Field label="Étage" error={errors.floor?.message}>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" min={0} max={100} {...register('floor')} placeholder="0" className={inputCls + ' pl-9 text-center'} />
                </div>
              </Field>
            </div>
            <Field label="Surface (m²)" error={errors.area_sqm?.message}>
              <div className="relative max-w-[160px]">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="number" min={0} step="0.1" {...register('area_sqm')} placeholder="45" className={inputCls + ' pl-9'} />
              </div>
            </Field>
          </section>

          {/* Tarification */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Tarification
            </h2>
            <Field label="Devise" required error={errors.currency?.message}>
              <select {...register('currency')} className={selectCls}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={`Tarif / nuit (${currency})`} required error={errors.base_rate?.message}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" min={0} step="0.01" {...register('base_rate')} placeholder="120.00" className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label={`Frais ménage (${currency})`} error={errors.cleaning_fee?.message}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="number" min={0} step="0.01" {...register('cleaning_fee')} placeholder="75.00" className={inputCls + ' pl-9'} />
                </div>
              </Field>
            </div>

            {/* Summary preview */}
            {(Number(baseRate) > 0 || Number(cleaningFee) > 0) && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-400 mb-2">Aperçu tarification</p>
                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div>
                    <p className="text-emerald-400 font-bold font-mono">{Number(baseRate).toFixed(2)} {currency}</p>
                    <p className="text-muted-foreground">/ nuit</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-bold font-mono">{Number(cleaningFee).toFixed(2)} {currency}</p>
                    <p className="text-muted-foreground">ménage</p>
                  </div>
                  <div>
                    <p className="text-purple-400 font-bold font-mono">{(Number(baseRate) * 7 + Number(cleaningFee)).toFixed(2)} {currency}</p>
                    <p className="text-muted-foreground">semaine est.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => preselectedPropertyId ? navigate(`/properties/${preselectedPropertyId}`) : navigate('/properties')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={createUnit.isPending || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createUnit.isPending && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {createUnit.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                : <><Save className="w-4 h-4" /> Créer l'unité</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewUnitPage;
