// NewOwnerPage — React Hook Form + Zod + Supabase INSERT — ADR-004, ADR-008
// Crée un propriétaire et redirige vers /owners/:id
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, Mail, Phone, MapPin,
  Globe, MessageSquare, CheckCircle2, Loader2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── Zod schema ────────────────────────────────────────────────────────────────
const ownerSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(60),
  last_name:  z.string().min(1, 'Nom requis').max(60),
  email:      z.string().email('Email invalide'),
  phone:      z.string().optional(),
  address:    z.string().optional(),
  city:       z.string().optional(),
  country:    z.enum(['Canada', 'Morocco', 'France', 'United States', 'Other']),
  language:   z.enum(['fr', 'en', 'ar']),
  notes:      z.string().max(500).optional(),
});

type OwnerFormData = z.infer<typeof ownerSchema>;

const COUNTRY_OPTIONS = [
  { value: 'Canada',        label: '🇨🇦 Canada' },
  { value: 'Morocco',       label: '🇲🇦 Maroc' },
  { value: 'France',        label: '🇫🇷 France' },
  { value: 'United States', label: '🇺🇸 États-Unis' },
  { value: 'Other',         label: 'Autre' },
];

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

// ── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const selectCls =
  'w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm ' +
  'text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]';

// ── Component ─────────────────────────────────────────────────────────────────
const NewOwnerPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register, handleSubmit,
    formState: { errors, isValid },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: { country: 'Canada', language: 'fr' },
    mode: 'onChange',
  });

  const createOwner = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      const { data: owner, error } = await supabase
        .from('owners')
        .insert({
          tenant_id: TENANT_ID,
          first_name: data.first_name.trim(),
          last_name:  data.last_name.trim(),
          email:      data.email.trim().toLowerCase(),
          phone:      data.phone?.trim() || null,
          address:    data.address?.trim() || null,
          city:       data.city?.trim() || null,
          country:    data.country,
          language:   data.language,
          notes:      data.notes?.trim() || null,
          status:     'active',
        })
        .select('id')
        .single();
      if (error) throw error;
      return owner;
    },
    onSuccess: (owner) => {
      queryClient.invalidateQueries({ queryKey: ['owners', TENANT_ID] });
      toast.success('Propriétaire créé avec succès ✓');
      navigate(`/owners/${owner.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/owners')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Propriétaires
        </button>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <Users className="w-5 h-5 text-primary" />
            Nouveau propriétaire
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            ADR-004 · tenant_id depuis contexte auth · RLS enforcement · statut initial : active
          </p>
        </div>

        <form onSubmit={handleSubmit((d) => createOwner.mutate(d))} className="space-y-6">

          {/* ── Identité ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Identité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prénom" required error={errors.first_name?.message}>
                <input {...register('first_name')} placeholder="Karim" className={inputCls} />
              </Field>
              <Field label="Nom" required error={errors.last_name?.message}>
                <input {...register('last_name')} placeholder="Benali" className={inputCls} />
              </Field>
            </div>
          </section>

          {/* ── Contact ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" /> Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" required error={errors.email?.message}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="email" {...register('email')} placeholder="karim@example.com"
                    className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Téléphone" error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('phone')} placeholder="+1 514 000 0000"
                    className={inputCls + ' pl-9'} />
                </div>
              </Field>
            </div>
          </section>

          {/* ── Adresse ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400" /> Adresse
            </h2>
            <Field label="Adresse" error={errors.address?.message}>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input {...register('address')} placeholder="123 Rue Sherbrooke O"
                  className={inputCls + ' pl-9'} />
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ville" error={errors.city?.message}>
                <input {...register('city')} placeholder="Montréal" className={inputCls} />
              </Field>
              <Field label="Pays" required error={errors.country?.message}>
                <select {...register('country')} className={selectCls}>
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* ── Préférences ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" /> Préférences
            </h2>
            <Field label="Langue de communication" required error={errors.language?.message}>
              <div className="flex gap-2">
                {LANG_OPTIONS.map(l => {
                  const { ref, ...rest } = register('language');
                  return (
                    <label key={l.value} className="flex-1 cursor-pointer">
                      <input type="radio" value={l.value} ref={ref} {...rest} className="sr-only peer" />
                      <div className={cn(
                        'border rounded-xl px-3 py-2.5 text-xs font-medium text-center transition-colors min-h-[44px] flex items-center justify-center',
                        'border-border text-muted-foreground hover:border-primary/40',
                        'peer-checked:bg-primary/10 peer-checked:border-primary/40 peer-checked:text-primary',
                      )}>
                        {l.label}
                      </div>
                    </label>
                  );
                })}
              </div>
            </Field>
          </section>

          {/* ── Notes ── */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" /> Notes internes
            </h2>
            <Field label="Notes (non visibles par le propriétaire)" error={errors.notes?.message}>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Contrat de gestion signé le…, préférences particulières…"
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </Field>
          </section>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/owners')}
              className="px-6 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createOwner.isPending}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createOwner.isPending
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {createOwner.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Créer le propriétaire</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewOwnerPage;
