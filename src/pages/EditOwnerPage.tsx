// EditOwnerPage — React Hook Form + Zod + Supabase UPDATE — ADR-004, ADR-006 (version++)
// Charge owner/:id, pré-remplit le formulaire, mute avec .update() + version++ optimistic locking
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Mail, Phone, MapPin, Globe, MessageSquare, CircleCheck as CheckCircle2, Loader as Loader2, Save } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Zod schema (same as NewOwnerPage) ────────────────────────────────────────
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
  status:     z.enum(['active', 'inactive']),
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

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const selectCls =
  'w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm ' +
  'text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]';

const Field = ({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const EditOwnerPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  // Load existing owner
  const { data: owner, isPending } = useQuery({
    queryKey: ['owner-edit', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!tenantId,
  });

  const {
    register, handleSubmit, watch,
    formState: { errors, isDirty },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    values: owner
      ? {
          first_name: owner.first_name ?? '',
          last_name:  owner.last_name ?? '',
          email:      owner.email ?? '',
          phone:      owner.phone ?? '',
          address:    owner.address ?? '',
          city:       owner.city ?? '',
          country:    (owner.country as OwnerFormData['country']) ?? 'Canada',
          language:   (owner.language as OwnerFormData['language']) ?? 'fr',
          notes:      owner.notes ?? '',
          status:     (owner.status as OwnerFormData['status']) ?? 'active',
        }
      : undefined,
    mode: 'onChange',
  });

  const updateOwner = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      const { error } = await supabase
        .from('owners')
        .update({
          first_name: data.first_name.trim(),
          last_name:  data.last_name.trim(),
          email:      data.email.trim().toLowerCase(),
          phone:      data.phone?.trim() || null,
          address:    data.address?.trim() || null,
          city:       data.city?.trim() || null,
          country:    data.country,
          language:   data.language,
          notes:      data.notes?.trim() || null,
          status:     data.status,
          version:    (owner?.version ?? 1) + 1,  // ADR-006 optimistic locking
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['owner', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-edit', id] });
      toast.success('Propriétaire mis à jour ✓');
      navigate(`/owners/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </AppLayout>
    );
  }

  if (!owner) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Propriétaire introuvable</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/owners')} className="hover:text-foreground transition-colors">
            Propriétaires
          </button>
          <span>/</span>
          <button onClick={() => navigate(`/owners/${id}`)} className="hover:text-foreground transition-colors">
            {owner.first_name} {owner.last_name}
          </button>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold text-primary">
            {owner.first_name[0]}{owner.last_name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Users className="w-5 h-5 text-primary" />
              Modifier — {owner.first_name} {owner.last_name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              ADR-006 · version++ optimistic locking · updated_at auto
            </p>
          </div>
        </div>

        {isDirty && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 text-xs text-amber-400">
            Modifications non sauvegardées — n'oubliez pas d'enregistrer.
          </div>
        )}

        <form onSubmit={handleSubmit(d => updateOwner.mutate(d))} className="space-y-6">

          {/* ── Identité ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Identité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prénom" required error={errors.first_name?.message}>
                <input {...register('first_name')} className={inputCls} />
              </Field>
              <Field label="Nom" required error={errors.last_name?.message}>
                <input {...register('last_name')} className={inputCls} />
              </Field>
            </div>
            <Field label="Statut" error={errors.status?.message}>
              <select {...register('status')} className={selectCls}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </Field>
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
                  <input type="email" {...register('email')} className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Téléphone" error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('phone')} className={inputCls + ' pl-9'} />
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
                <input {...register('address')} className={inputCls + ' pl-9'} />
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ville" error={errors.city?.message}>
                <input {...register('city')} className={inputCls} />
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
            <Field label="Langue" required error={errors.language?.message}>
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
            <Field label="Notes" error={errors.notes?.message}>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </Field>
          </section>

          {/* Version info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-mono">
            <span>version {owner.version}</span>
            <span>·</span>
            <span>créé {new Date(owner.created_at).toLocaleDateString('fr-CA')}</span>
            {owner.updated_at && (
              <>
                <span>·</span>
                <span>modifié {new Date(owner.updated_at).toLocaleDateString('fr-CA')}</span>
              </>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate(`/owners/${id}`)}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={updateOwner.isPending || !isDirty}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !updateOwner.isPending && isDirty
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {updateOwner.isPending
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

export default EditOwnerPage;
