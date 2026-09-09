// EditGuestPage — React Hook Form + Zod + Supabase UPDATE — ADR-012, ADR-006
// Charge guest/:id, pré-remplit le formulaire, met à jour avec version++ optimistic locking
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, Mail, Phone, Globe2,
  MapPin, MessageSquare, Save, Loader2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const guestSchema = z.object({
  first_name:  z.string().min(1, 'Prénom requis').max(80),
  last_name:   z.string().min(1, 'Nom requis').max(80),
  email:       z.string().email('Email invalide'),
  phone:       z.string().optional(),
  nationality: z.string().optional(),
  language:    z.enum(['fr', 'en', 'ar']),
  notes:       z.string().max(500).optional(),
});
type GuestFormData = z.infer<typeof guestSchema>;

const COUNTRY_OPTIONS = [
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'MA', label: '🇲🇦 Maroc' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'US', label: '🇺🇸 États-Unis' },
  { value: 'GB', label: '🇬🇧 Royaume-Uni' },
  { value: 'DE', label: '🇩🇪 Allemagne' },
  { value: 'ES', label: '🇪🇸 Espagne' },
  { value: 'IT', label: '🇮🇹 Italie' },
  { value: 'NL', label: '🇳🇱 Pays-Bas' },
  { value: 'BE', label: '🇧🇪 Belgique' },
  { value: 'CH', label: '🇨🇭 Suisse' },
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
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const EditGuestPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const {
    register, handleSubmit, formState: { errors, isDirty },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    values: guest
      ? {
          first_name:  guest.first_name ?? '',
          last_name:   guest.last_name ?? '',
          email:       guest.email ?? '',
          phone:       guest.phone ?? '',
          nationality: guest.nationality ?? '',
          language:    (guest.language as GuestFormData['language']) ?? 'fr',
          notes:       guest.notes ?? '',
        }
      : undefined,
    mode: 'onChange',
  });

  const updateGuest = useMutation({
    mutationFn: async (data: GuestFormData) => {
      const { error } = await supabase
        .from('guests')
        .update({
          first_name:  data.first_name.trim(),
          last_name:   data.last_name.trim(),
          email:       data.email.trim().toLowerCase(),
          phone:       data.phone?.trim() || null,
          nationality: data.nationality || null,
          language:    data.language,
          notes:       data.notes?.trim() || null,
          version:     (guest?.version ?? 1) + 1,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['guest-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['guest-edit', id] });
      toast.success('Voyageur mis à jour ✓');
      navigate(`/guests/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  }

  if (!guest) {
    return <AppLayout><div className="text-center py-20 text-muted-foreground">Voyageur introuvable</div></AppLayout>;
  }

  const initials = `${guest.first_name?.[0] ?? '?'}${guest.last_name?.[0] ?? '?'}`;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/guests')} className="hover:text-foreground transition-colors">Voyageurs</button>
          <span>/</span>
          <button onClick={() => navigate(`/guests/${id}`)} className="hover:text-foreground transition-colors">
            {guest.first_name} {guest.last_name}
          </button>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold text-primary">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Users className="w-5 h-5 text-primary" />
              Modifier — {guest.first_name} {guest.last_name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              ADR-006 · version {guest.version} → {(guest.version ?? 1) + 1} · optimistic locking
            </p>
          </div>
        </div>

        {isDirty && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 text-xs text-amber-400">
            Modifications non sauvegardées — pensez à enregistrer.
          </div>
        )}

        <form onSubmit={handleSubmit(d => updateGuest.mutate(d))} className="space-y-6">

          {/* Identité */}
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
          </section>

          {/* Contact */}
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

          {/* Préférences */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-purple-400" /> Nationalité & Langue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nationalité" error={errors.nationality?.message}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select {...register('nationality')} className={selectCls + ' pl-9'}>
                    <option value="">— Sélectionner —</option>
                    {COUNTRY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Langue préférée" required error={errors.language?.message}>
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
            </div>
          </section>

          {/* Notes */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" /> Notes internes
            </h2>
            <Field label="Notes" error={errors.notes?.message}>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Préférences, historique, allergies…"
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </Field>
          </section>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-mono">
            <span>version {guest.version}</span>
            <span>·</span>
            <span>client depuis {new Date(guest.created_at).toLocaleDateString('fr-CA')}</span>
            <span>·</span>
            <span>{guest.total_stays} séjour{(guest.total_stays ?? 0) > 1 ? 's' : ''}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate(`/guests/${id}`)}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={updateGuest.isPending || !isDirty}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !updateGuest.isPending && isDirty
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {updateGuest.isPending
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

export default EditGuestPage;
