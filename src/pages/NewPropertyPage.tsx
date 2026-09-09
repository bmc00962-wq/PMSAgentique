// NewPropertyPage — React Hook Form + Zod + Supabase INSERT — ADR-004, ADR-008
// Formulaire 2 étapes : Propriété → Première unité
// Step 1 insère dans properties, step 2 insère dans units, redirige vers /properties/:id
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, MapPin, Users, DollarSign,
  ChevronRight, CheckCircle2, Loader2, ChevronDown, Home, Search,
} from 'lucide-react';
import { MOROCCAN_CITIES_SORTED } from '@/constants/moroccanCities';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── Step 1 schema — Property ──────────────────────────────────────────────────
const propertySchema = z.object({
  name:          z.string().min(1, 'Nom requis').max(120),
  property_type: z.enum(['apartment', 'villa', 'chalet', 'riad', 'studio', 'house', 'other']),
  address:       z.string().min(1, 'Adresse requise'),
  city:          z.string().min(1, 'Ville requise'),
  country:       z.enum(['Canada', 'Morocco', 'France', 'United States', 'Other']),
  owner_id:      z.string().uuid('Sélectionnez un propriétaire'),
  description:   z.string().max(1000).optional(),
});
type PropertyFormData = z.infer<typeof propertySchema>;

// ── Step 2 schema — First unit ────────────────────────────────────────────────
const unitSchema = z.object({
  name:         z.string().min(1, 'Nom requis').max(80),
  unit_type:    z.enum(['apartment', 'studio', 'chalet', 'villa', 'room', 'other']),
  bedrooms:     z.number().int().min(0).max(20),
  bathrooms:    z.number().min(0).max(10),
  max_guests:   z.number().int().min(1).max(30),
  base_rate:    z.number().min(0, 'Tarif requis'),
  cleaning_fee: z.number().min(0),
  currency:     z.enum(['CAD', 'MAD', 'EUR', 'USD']),
});
type UnitFormData = z.infer<typeof unitSchema>;

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'villa',     label: 'Villa' },
  { value: 'chalet',    label: 'Chalet' },
  { value: 'riad',      label: 'Riad' },
  { value: 'studio',    label: 'Studio' },
  { value: 'house',     label: 'Maison' },
  { value: 'other',     label: 'Autre' },
];

const UNIT_TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'studio',    label: 'Studio' },
  { value: 'chalet',    label: 'Chalet' },
  { value: 'villa',     label: 'Villa' },
  { value: 'room',      label: 'Chambre' },
  { value: 'other',     label: 'Autre' },
];

const COUNTRY_OPTIONS = [
  { value: 'Canada',        label: '🇨🇦 Canada',       currency: 'CAD' },
  { value: 'Morocco',       label: '🇲🇦 Maroc',         currency: 'MAD' },
  { value: 'France',        label: '🇫🇷 France',        currency: 'EUR' },
  { value: 'United States', label: '🇺🇸 États-Unis',    currency: 'USD' },
  { value: 'Other',         label: 'Autre',              currency: 'EUR' },
];

const CURRENCIES = ['CAD', 'MAD', 'EUR', 'USD'];

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';
const selectCls =
  'w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm ' +
  'text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px] pr-10';

const Field = ({
  label, required, error, children,
}: {
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
const NewPropertyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyFormData | null>(null);

  // Load owners for dropdown
  const { data: owners = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['owners-list', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, first_name, last_name, city')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Step 1 form
  const {
    register: reg1, handleSubmit: submit1, watch: watch1,
    formState: { errors: errors1 },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: { property_type: 'apartment', country: 'Canada' },
    mode: 'onChange',
  });

  const watchedCountry = watch1('country');
  const suggestedCurrency = COUNTRY_OPTIONS.find(c => c.value === watchedCountry)?.currency ?? 'CAD';

  // Step 2 form
  const {
    register: reg2, handleSubmit: submit2,
    formState: { errors: errors2 }, setValue: setVal2, watch: watch2,
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_type: 'apartment', bedrooms: 1, bathrooms: 1,
      max_guests: 2, base_rate: 0, cleaning_fee: 0, currency: 'CAD',
    },
    mode: 'onChange',
  });

  // Create property (step 1 submit)
  const createProperty = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const { data: property, error } = await supabase
        .from('properties')
        .insert({
          tenant_id:     TENANT_ID,
          owner_id:      data.owner_id,
          name:          data.name.trim(),
          property_type: data.property_type,
          address:       data.address.trim(),
          city:          data.city.trim(),
          country:       data.country,
          description:   data.description?.trim() || null,
          status:        'active',
        })
        .select('id')
        .single();
      if (error) throw error;
      return property;
    },
    onSuccess: (property, data) => {
      setCreatedPropertyId(property.id);
      setPropertyData(data);
      // Pre-set currency based on country
      setVal2('currency', (COUNTRY_OPTIONS.find(c => c.value === data.country)?.currency ?? 'CAD') as 'CAD' | 'MAD' | 'EUR' | 'USD');
      toast.success('Propriété créée — Ajoutez maintenant la première unité');
      setStep(2);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Create unit (step 2 submit)
  const createUnit = useMutation({
    mutationFn: async (data: UnitFormData) => {
      if (!createdPropertyId) throw new Error('Property ID manquant');
      const { data: unit, error } = await supabase
        .from('units')
        .insert({
          tenant_id:    TENANT_ID,
          property_id:  createdPropertyId,
          name:         data.name.trim(),
          unit_type:    data.unit_type,
          bedrooms:     data.bedrooms,
          bathrooms:    data.bathrooms,
          max_guests:   data.max_guests,
          base_rate:    data.base_rate,
          cleaning_fee: data.cleaning_fee,
          currency:     data.currency,
          status:       'active',
        })
        .select('id')
        .single();
      if (error) throw error;
      return unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['owners', TENANT_ID] });
      toast.success('Propriété et unité créées ✓');
      navigate(`/properties/${createdPropertyId}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Skip unit step
  const skipUnit = () => {
    queryClient.invalidateQueries({ queryKey: ['properties', TENANT_ID] });
    navigate(`/properties/${createdPropertyId}`);
  };

  const watchedRate = watch2('base_rate') ?? 0;
  const watchedFee  = watch2('cleaning_fee') ?? 0;
  const watchedCur  = watch2('currency') ?? 'CAD';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/properties')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Propriétés
        </button>

        {/* Title + stepper */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Nouvelle propriété</h1>
            <p className="text-xs text-muted-foreground mt-1">ADR-004 · Multitenancy · RLS enforcement</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[
            { n: 1, label: 'Propriété' },
            { n: 2, label: 'Première unité' },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors',
                step === n ? 'bg-primary text-primary-foreground' :
                step > n ? 'bg-emerald-500 text-white' :
                'bg-secondary border border-border text-muted-foreground',
              )}>
                {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              <span className={cn('text-xs font-medium', step === n ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
              {i === 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" />}
            </div>
          ))}
        </div>

        {/* ══ STEP 1 — Property form ══ */}
        {step === 1 && (
          <form onSubmit={submit1((d) => createProperty.mutate(d))} className="space-y-6">

            {/* Informations générales */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Informations générales
              </h2>
              <Field label="Nom de la propriété" required error={errors1.name?.message}>
                <input {...reg1('name')} placeholder="Le Plateau Moderne" className={inputCls} autoFocus />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Type" required error={errors1.property_type?.message}>
                  <div className="relative">
                    <select {...reg1('property_type')} className={selectCls}>
                      {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </Field>
                <Field label="Propriétaire" required error={errors1.owner_id?.message}>
                  {ownersLoading ? (
                    <div className="flex items-center gap-2 py-3"><LoadingSpinner size="sm" /><span className="text-xs text-muted-foreground">Chargement…</span></div>
                  ) : (
                    <div className="relative">
                      <select {...reg1('owner_id')} className={selectCls}>
                        <option value="">— Sélectionner —</option>
                        {owners.map(o => (
                          <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.city ? ` · ${o.city}` : ''}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  )}
                </Field>
              </div>
            </section>

            {/* Adresse */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" /> Adresse
              </h2>
              <Field label="Adresse" required error={errors1.address?.message}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...reg1('address')} placeholder="1420 Rue Rachel E" className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ville" required error={errors1.city?.message}>
                  {watchedCountry === 'Morocco' ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        {...reg1('city')}
                        list="moroccan-cities-new"
                        placeholder="Rechercher une ville…"
                        autoComplete="off"
                        className={inputCls + ' pl-9'}
                      />
                      <datalist id="moroccan-cities-new">
                        {MOROCCAN_CITIES_SORTED.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <input {...reg1('city')} placeholder="Montréal" className={inputCls} />
                  )}
                </Field>
                <Field label="Pays" required error={errors1.country?.message}>
                  <div className="relative">
                    <select {...reg1('country')} className={selectCls}>
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
                <Home className="w-4 h-4 text-muted-foreground" /> Description (optionnel)
              </h2>
              <Field label="Description publique" error={errors1.description?.message}>
                <textarea
                  {...reg1('description')}
                  rows={3}
                  placeholder="Décrivez la propriété pour les voyageurs et OTA (Airbnb, Booking.com…)"
                  className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </Field>
            </section>

            <div className="flex gap-3 pb-8">
              <button type="button" onClick={() => navigate('/properties')}
                className="px-6 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
                Annuler
              </button>
              <button type="submit" disabled={createProperty.isPending}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                  !createProperty.isPending
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}>
                {createProperty.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                  : <>Étape suivante — Ajouter une unité <ChevronRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </form>
        )}

        {/* ══ STEP 2 — Unit form ══ */}
        {step === 2 && propertyData && (
          <>
            {/* Property summary */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-emerald-400">{propertyData.name}</span>
                <span className="text-muted-foreground ml-2">
                  {PROPERTY_TYPES.find(t => t.value === propertyData.property_type)?.label}
                  {propertyData.city ? ` · ${propertyData.city}` : ''}
                  {` · ${COUNTRY_OPTIONS.find(c => c.value === propertyData.country)?.label ?? propertyData.country}`}
                </span>
              </div>
            </div>

            <form onSubmit={submit2((d) => createUnit.mutate(d))} className="space-y-6">

              {/* Unit info */}
              <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Home className="w-4 h-4 text-purple-400" /> Première unité
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom de l'unité" required error={errors2.name?.message}>
                    <input {...reg2('name')} placeholder="Appartement A, Suite 1…" className={inputCls} autoFocus />
                  </Field>
                  <Field label="Type" required error={errors2.unit_type?.message}>
                    <div className="relative">
                      <select {...reg2('unit_type')} className={selectCls}>
                        {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Chambres" required error={errors2.bedrooms?.message}>
                    <input type="number" {...reg2('bedrooms', { valueAsNumber: true })} min={0} max={20} className={inputCls} />
                  </Field>
                  <Field label="Salles de bain" required error={errors2.bathrooms?.message}>
                    <input type="number" step="0.5" {...reg2('bathrooms', { valueAsNumber: true })} min={0} max={10} className={inputCls} />
                  </Field>
                  <Field label="Max voyageurs" required error={errors2.max_guests?.message}>
                    <input type="number" {...reg2('max_guests', { valueAsNumber: true })} min={1} max={30} className={inputCls} />
                  </Field>
                </div>
              </section>

              {/* Tarification */}
              <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Tarification
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Tarif / nuit" required error={errors2.base_rate?.message}>
                    <input type="number" step="0.01" {...reg2('base_rate', { valueAsNumber: true })} min={0}
                      placeholder="120" className={inputCls} />
                  </Field>
                  <Field label="Frais de ménage" error={errors2.cleaning_fee?.message}>
                    <input type="number" step="0.01" {...reg2('cleaning_fee', { valueAsNumber: true })} min={0}
                      placeholder="75" className={inputCls} />
                  </Field>
                  <Field label="Devise" required error={errors2.currency?.message}>
                    <div className="relative">
                      <select {...reg2('currency')} className={selectCls}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </Field>
                </div>

                {/* Preview */}
                {watchedRate > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-4 text-xs">
                    <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-emerald-400 font-semibold">
                        {watchedRate.toFixed(2)} {watchedCur} / nuit
                      </span>
                      {watchedFee > 0 && (
                        <span className="text-muted-foreground ml-2">
                          + {watchedFee.toFixed(2)} {watchedCur} ménage
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <div className="flex gap-3 pb-8">
                <button type="button" onClick={skipUnit}
                  className="px-6 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
                  Passer (ajouter plus tard)
                </button>
                <button type="submit" disabled={createUnit.isPending}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                    !createUnit.isPending
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed',
                  )}>
                  {createUnit.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Créer propriété + unité</>
                  }
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default NewPropertyPage;
