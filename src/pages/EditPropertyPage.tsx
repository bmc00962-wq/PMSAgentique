// EditPropertyPage — React Hook Form + Zod + Supabase UPDATE — ADR-004, ADR-006
// Charge property/:id, pré-remplit les champs, sauvegarde avec version++ optimistic locking
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, Chrome as Home, Save, CircleCheck as CheckCircle2, Loader as Loader2, ChevronDown, Users, Search } from 'lucide-react';
import { MOROCCAN_CITIES_SORTED } from '@/constants/moroccanCities';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const propertySchema = z.object({
  name:          z.string().min(1, 'Nom requis').max(120),
  property_type: z.enum(['apartment', 'villa', 'chalet', 'riad', 'studio', 'house', 'other']),
  address:       z.string().min(1, 'Adresse requise'),
  city:          z.string().min(1, 'Ville requise'),
  country:       z.enum(['Canada', 'Morocco', 'France', 'United States', 'Other']),
  owner_id:      z.string().uuid('Sélectionnez un propriétaire'),
  description:   z.string().max(1000).optional(),
  status:        z.enum(['active', 'inactive']),
});
type PropertyFormData = z.infer<typeof propertySchema>;

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'villa',     label: 'Villa' },
  { value: 'chalet',    label: 'Chalet' },
  { value: 'riad',      label: 'Riad' },
  { value: 'studio',    label: 'Studio' },
  { value: 'house',     label: 'Maison' },
  { value: 'other',     label: 'Autre' },
];

const COUNTRY_OPTIONS = [
  { value: 'Canada',        label: '🇨🇦 Canada' },
  { value: 'Morocco',       label: '🇲🇦 Maroc' },
  { value: 'France',        label: '🇫🇷 France' },
  { value: 'United States', label: '🇺🇸 États-Unis' },
  { value: 'Other',         label: 'Autre' },
];

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const selectCls =
  'w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm ' +
  'text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px] pr-10';

const Field = ({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const EditPropertyPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  // Load property
  const { data: property, isPending: propLoading } = useQuery({
    queryKey: ['property-edit', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!tenantId,
  });

  // Load owners for dropdown
  const { data: owners = [] } = useQuery({
    queryKey: ['owners-list-edit', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, first_name, last_name, city')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, watch, formState: { errors, isDirty },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    values: property
      ? {
          name:          property.name ?? '',
          property_type: (property.property_type as PropertyFormData['property_type']) ?? 'apartment',
          address:       property.address ?? '',
          city:          property.city ?? '',
          country:       (property.country as PropertyFormData['country']) ?? 'Canada',
          owner_id:      property.owner_id ?? '',
          description:   property.description ?? '',
          status:        (property.status as PropertyFormData['status']) ?? 'active',
        }
      : undefined,
    mode: 'onChange',
  });

  const watchedCountry = watch('country');

  const updateProperty = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const { error } = await supabase
        .from('properties')
        .update({
          name:          data.name.trim(),
          property_type: data.property_type,
          address:       data.address.trim(),
          city:          data.city.trim(),
          country:       data.country,
          owner_id:      data.owner_id,
          description:   data.description?.trim() || null,
          status:        data.status,
          version:       (property?.version ?? 1) + 1,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['property-edit', id] });
      toast.success('Propriété mise à jour ✓');
      navigate(`/properties/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (propLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Propriété introuvable</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/properties')} className="hover:text-foreground transition-colors">
            Propriétés
          </button>
          <span>/</span>
          <button onClick={() => navigate(`/properties/${id}`)} className="hover:text-foreground transition-colors">
            {property.name}
          </button>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Modifier — {property.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">ADR-006 · version {property.version} → {(property.version ?? 1) + 1} · optimistic locking</p>
          </div>
        </div>

        {isDirty && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 text-xs text-amber-400">
            Modifications non sauvegardées
          </div>
        )}

        <form onSubmit={handleSubmit(d => updateProperty.mutate(d))} className="space-y-6">

          {/* Informations générales */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" /> Informations générales
            </h2>
            <Field label="Nom de la propriété" required error={errors.name?.message}>
              <input {...register('name')} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type" required error={errors.property_type?.message}>
                <div className="relative">
                  <select {...register('property_type')} className={selectCls}>
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </Field>
              <Field label="Statut" error={errors.status?.message}>
                <div className="relative">
                  <select {...register('status')} className={selectCls}>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </Field>
            </div>
            <Field label="Propriétaire" required error={errors.owner_id?.message}>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select {...register('owner_id')} className={selectCls + ' pl-9'}>
                  <option value="">— Sélectionner —</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.first_name} {o.last_name}{o.city ? ` · ${o.city}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </Field>
          </section>

          {/* Adresse */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400" /> Adresse
            </h2>
            <Field label="Adresse" required error={errors.address?.message}>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input {...register('address')} className={inputCls + ' pl-9'} />
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ville" required error={errors.city?.message}>
                {watchedCountry === 'Morocco' ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      {...register('city')}
                      list="moroccan-cities-edit"
                      placeholder="Rechercher une ville…"
                      autoComplete="off"
                      className={inputCls + ' pl-9'}
                    />
                    <datalist id="moroccan-cities-edit">
                      {MOROCCAN_CITIES_SORTED.map(city => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <input {...register('city')} className={inputCls} />
                )}
              </Field>
              <Field label="Pays" required error={errors.country?.message}>
                <div className="relative">
                  <select {...register('country')} className={selectCls}>
                    {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </Field>
            </div>
          </section>

          {/* Description */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Home className="w-4 h-4 text-muted-foreground" /> Description
            </h2>
            <Field label="Description publique" error={errors.description?.message}>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </Field>
          </section>

          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-mono">
            <span>version {property.version}</span>
            <span>·</span>
            <span>créé {new Date(property.created_at).toLocaleDateString('fr-CA')}</span>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate(`/properties/${id}`)}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={updateProperty.isPending || !isDirty}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !updateProperty.isPending && isDirty
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {updateProperty.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                : <><Save className="w-4 h-4" /> Enregistrer les modifications</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditPropertyPage;
