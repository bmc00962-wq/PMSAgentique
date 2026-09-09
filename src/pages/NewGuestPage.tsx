// NewGuestPage — React Hook Form + Zod + Supabase INSERT — ADR-012
// Crée un profil voyageur RGPD-conforme et redirige vers /guests/:id
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, Mail, Phone,
  Globe, MessageSquare, CheckCircle2, Loader2, Flag,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── Zod schema — ADR-012 (RGPD-conforme) ─────────────────────────────────────
const guestSchema = z.object({
  first_name:  z.string().min(1, 'Prénom requis').max(60),
  last_name:   z.string().min(1, 'Nom requis').max(60),
  email:       z.string().email('Email invalide'),
  phone:       z.string().optional(),
  nationality: z.string().length(2, 'Code ISO 2 lettres').optional().or(z.literal('')),
  language:    z.enum(['fr', 'en', 'ar']),
  notes:       z.string().max(500).optional(),
});

type GuestFormData = z.infer<typeof guestSchema>;

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

const NATIONALITY_OPTIONS = [
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'MA', label: '🇲🇦 Maroc' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'US', label: '🇺🇸 États-Unis' },
  { code: 'GB', label: '🇬🇧 Royaume-Uni' },
  { code: 'DE', label: '🇩🇪 Allemagne' },
  { code: 'ES', label: '🇪🇸 Espagne' },
  { code: 'IT', label: '🇮🇹 Italie' },
  { code: 'BE', label: '🇧🇪 Belgique' },
  { code: 'CH', label: '🇨🇭 Suisse' },
];

const Field = ({
  label, required, error, children,
}: {
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

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const selectCls =
  'w-full appearance-none bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm ' +
  'text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]';

// ── Component ─────────────────────────────────────────────────────────────────
const NewGuestPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: { language: 'fr', nationality: '' },
    mode: 'onChange',
  });

  const watchedFirst = watch('first_name') ?? '';
  const watchedLast  = watch('last_name') ?? '';
  const initials = `${watchedFirst[0] ?? '?'}${watchedLast[0] ?? '?'}`.toUpperCase();

  const createGuest = useMutation({
    mutationFn: async (data: GuestFormData) => {
      const { data: guest, error } = await supabase
        .from('guests')
        .insert({
          tenant_id:   TENANT_ID,
          first_name:  data.first_name.trim(),
          last_name:   data.last_name.trim(),
          email:       data.email.trim().toLowerCase(),
          phone:       data.phone?.trim() || null,
          nationality: data.nationality || null,
          language:    data.language,
          notes:       data.notes?.trim() || null,
          total_stays: 0,
        })
        .select('id')
        .single();
      if (error) throw error;
      return guest;
    },
    onSuccess: (guest) => {
      queryClient.invalidateQueries({ queryKey: ['guests', TENANT_ID] });
      toast.success('Profil voyageur créé ✓');
      navigate(`/guests/${guest.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/guests')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voyageurs
        </button>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold text-primary">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Users className="w-5 h-5 text-primary" />
              Nouveau voyageur
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              ADR-012 · Profil RGPD-conforme · PII anonymisation 3 ans · total_stays=0 initial
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => createGuest.mutate(d))} className="space-y-6">

          {/* ── Identité ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Identité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prénom" required error={errors.first_name?.message}>
                <input {...register('first_name')} placeholder="Marie" className={inputCls} autoFocus />
              </Field>
              <Field label="Nom" required error={errors.last_name?.message}>
                <input {...register('last_name')} placeholder="Dupont" className={inputCls} />
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
                  <input type="email" {...register('email')} placeholder="marie@exemple.com"
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

          {/* ── Origine & Langue ── */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" /> Nationalité & Langue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nationalité" error={errors.nationality?.message}>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select {...register('nationality')} className={selectCls + ' pl-9'}>
                    <option value="">— Non précisée —</option>
                    {NATIONALITY_OPTIONS.map(n => (
                      <option key={n.code} value={n.code}>{n.label}</option>
                    ))}
                  </select>
                </div>
              </Field>

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
            </div>
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
                placeholder="Préférences, allergie, accessibilité… (ne jamais stocker de données bancaires ici)"
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </Field>
          </section>

          {/* RGPD notice */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex items-start gap-2 text-xs">
            <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">
              <strong className="text-blue-400">RGPD · ADR-012 :</strong> Les données personnelles sont chiffrées, conservées 3 ans maximum après la dernière activité, puis anonymisées. Ne pas stocker de numéro de carte ou données bancaires.
            </span>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/guests')}
              className="px-6 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createGuest.isPending}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createGuest.isPending
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {createGuest.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Créer le profil voyageur</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewGuestPage;
