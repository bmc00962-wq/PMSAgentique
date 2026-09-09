// NewMessageTemplatePage — React Hook Form + Zod + Supabase INSERT — ADR-012
// Création template de message: channel (email/sms/whatsapp/in_app), langue (fr/en/ar),
// trigger_event (booking_confirmed/check_in_reminder/check_out_reminder/review_request/custom),
// subject, body avec insertion de variables, statut actif/inactif
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, Mail, Smartphone, MessageSquare,
  Save, Loader2, ChevronDown, Info, Plus, X, Hash,
  CheckCircle2, Globe, Zap,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const templateSchema = z.object({
  name:          z.string().min(1, 'Nom requis').max(120),
  channel:       z.enum(['email', 'sms', 'whatsapp', 'in_app']),
  language:      z.enum(['fr', 'en', 'ar']),
  trigger_event: z.enum(['booking_confirmed', 'check_in_reminder', 'check_out_reminder', 'review_request', 'custom']),
  subject:       z.string().max(200).optional(),
  body:          z.string().min(1, 'Corps du message requis').max(5000),
  is_active:     z.boolean(),
});
type TemplateFormData = z.infer<typeof templateSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────
const CHANNELS = [
  { value: 'email',    label: 'Email',     icon: Mail,           desc: 'Message email avec sujet', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'sms',      label: 'SMS',       icon: Smartphone,     desc: 'Message texte court (<160)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'whatsapp', label: 'WhatsApp',  icon: MessageSquare,  desc: 'Message riche WhatsApp Business', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { value: 'in_app',   label: 'In-App',    icon: MessageSquare,  desc: 'Notification dans l\'application', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
];

const TRIGGER_EVENTS = [
  { value: 'booking_confirmed',   label: 'Réservation confirmée',      icon: CheckCircle2, desc: 'Déclenché lors de la confirmation d\'une réservation' },
  { value: 'check_in_reminder',   label: 'Rappel check-in',            icon: Zap,          desc: 'Envoyé 24-48h avant l\'arrivée du voyageur' },
  { value: 'check_out_reminder',  label: 'Rappel check-out',           icon: Zap,          desc: 'Envoyé la veille du départ' },
  { value: 'review_request',      label: 'Demande d\'avis',            icon: Globe,        desc: 'Envoyé 24h après le départ du voyageur' },
  { value: 'custom',              label: 'Déclenchement manuel',       icon: Hash,         desc: 'Template envoyé manuellement depuis la messagerie' },
];

const LANGUAGES = [
  { value: 'fr', label: '🇫🇷 Français', dir: 'ltr' },
  { value: 'en', label: '🇬🇧 English',  dir: 'ltr' },
  { value: 'ar', label: '🇲🇦 العربية',  dir: 'rtl' },
];

// Variables disponibles selon le trigger
const TEMPLATE_VARIABLES: Record<string, { key: string; desc: string }[]> = {
  booking_confirmed: [
    { key: '{{guest_name}}',      desc: 'Prénom + nom du voyageur' },
    { key: '{{check_in_date}}',   desc: 'Date d\'arrivée' },
    { key: '{{check_out_date}}',  desc: 'Date de départ' },
    { key: '{{property_name}}',   desc: 'Nom de la propriété' },
    { key: '{{unit_name}}',       desc: 'Nom de l\'unité' },
    { key: '{{total_amount}}',    desc: 'Montant total de la réservation' },
    { key: '{{currency}}',        desc: 'Devise (CAD, MAD, EUR…)' },
    { key: '{{booking_id}}',      desc: 'Identifiant de la réservation' },
  ],
  check_in_reminder: [
    { key: '{{guest_name}}',      desc: 'Prénom + nom du voyageur' },
    { key: '{{check_in_date}}',   desc: 'Date d\'arrivée' },
    { key: '{{check_in_time}}',   desc: 'Heure d\'arrivée' },
    { key: '{{property_address}}', desc: 'Adresse de la propriété' },
    { key: '{{access_code}}',     desc: 'Code d\'accès smart lock' },
    { key: '{{wifi_password}}',   desc: 'Mot de passe WiFi' },
  ],
  check_out_reminder: [
    { key: '{{guest_name}}',      desc: 'Prénom + nom du voyageur' },
    { key: '{{check_out_date}}',  desc: 'Date de départ' },
    { key: '{{check_out_time}}',  desc: 'Heure limite de départ' },
    { key: '{{property_name}}',   desc: 'Nom de la propriété' },
  ],
  review_request: [
    { key: '{{guest_name}}',      desc: 'Prénom + nom du voyageur' },
    { key: '{{property_name}}',   desc: 'Nom de la propriété' },
    { key: '{{review_link}}',     desc: 'Lien vers le formulaire d\'avis' },
    { key: '{{stay_dates}}',      desc: 'Dates du séjour' },
  ],
  custom: [
    { key: '{{guest_name}}',      desc: 'Prénom + nom du voyageur' },
    { key: '{{property_name}}',   desc: 'Nom de la propriété' },
    { key: '{{unit_name}}',       desc: 'Nom de l\'unité' },
    { key: '{{check_in_date}}',   desc: 'Date d\'arrivée' },
    { key: '{{check_out_date}}',  desc: 'Date de départ' },
  ],
};

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

// ── Component ─────────────────────────────────────────────────────────────────
const NewMessageTemplatePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customVars, setCustomVars] = useState<string[]>([]);
  const [newVarInput, setNewVarInput] = useState('');
  const [bodyRef, setBodyRef] = useState<HTMLTextAreaElement | null>(null);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isValid },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      channel: 'email',
      language: 'fr',
      trigger_event: 'booking_confirmed',
      is_active: true,
    },
    mode: 'onChange',
  });

  const watchedChannel   = watch('channel');
  const watchedTrigger   = watch('trigger_event');
  const watchedLanguage  = watch('language');
  const watchedIsActive  = watch('is_active');
  const watchedBody      = watch('body') ?? '';
  const watchedSubject   = watch('subject') ?? '';

  const needsSubject = watchedChannel === 'email';
  const isRTL        = watchedLanguage === 'ar';

  const availableVars = TEMPLATE_VARIABLES[watchedTrigger] ?? TEMPLATE_VARIABLES.custom;
  const allVars = [...availableVars, ...customVars.map(v => ({ key: `{{${v}}}`, desc: 'Variable personnalisée' }))];

  // Insert variable at cursor position in body
  const insertVariable = (varKey: string) => {
    if (!bodyRef) {
      setValue('body', watchedBody + varKey);
      return;
    }
    const start = bodyRef.selectionStart ?? watchedBody.length;
    const end   = bodyRef.selectionEnd ?? watchedBody.length;
    const newBody = watchedBody.slice(0, start) + varKey + watchedBody.slice(end);
    setValue('body', newBody, { shouldValidate: true });
    // Restore cursor position after React re-render
    setTimeout(() => {
      bodyRef.selectionStart = start + varKey.length;
      bodyRef.selectionEnd   = start + varKey.length;
      bodyRef.focus();
    }, 10);
  };

  const addCustomVar = () => {
    const v = newVarInput.trim().replace(/[{}]/g, '').replace(/\s+/g, '_');
    if (v && !customVars.includes(v) && !availableVars.find(av => av.key === `{{${v}}}`)) {
      setCustomVars(prev => [...prev, v]);
      setNewVarInput('');
    }
  };

  const createTemplate = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const { data: tpl, error } = await supabase
        .from('message_templates')
        .insert({
          tenant_id:     TENANT_ID,
          name:          data.name.trim(),
          channel:       data.channel,
          language:      data.language,
          trigger_event: data.trigger_event,
          subject:       needsSubject ? (data.subject?.trim() || null) : null,
          body:          data.body.trim(),
          variables:     allVars.map(v => v.key),
          is_active:     data.is_active,
        })
        .select('id')
        .single();
      if (error) throw error;
      return tpl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates', TENANT_ID] });
      toast.success('Template créé avec succès ✓');
      navigate('/communications');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedChannel = CHANNELS.find(c => c.value === watchedChannel);
  const selectedTrigger = TRIGGER_EVENTS.find(t => t.value === watchedTrigger);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/communications')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Communications
          </button>
          <span>/</span>
          <span className="text-foreground">Nouveau template</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nouveau template</h1>
            <p className="text-xs text-muted-foreground mt-1">
              ADR-012 · Messages append-only · Variables dynamiques · Multi-langue (fr/en/ar)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => createTemplate.mutate(d))} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Main form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Identity */}
              <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Identité du template
                </h2>
                <Field label="Nom du template" required error={errors.name?.message}
                  hint="Ex: Confirmation réservation FR, Rappel check-in EN…">
                  <input {...register('name')} placeholder="Confirmation réservation — Français" className={inputCls} autoFocus />
                </Field>

                {/* Channel selector */}
                <Field label="Canal" required>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CHANNELS.map(ch => {
                      const isSelected = watchedChannel === ch.value;
                      const Icon = ch.icon;
                      return (
                        <label key={ch.value} className="cursor-pointer">
                          <input type="radio" value={ch.value} {...register('channel')} className="sr-only" />
                          <div className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all min-h-[72px]',
                            isSelected ? cn('border-current', ch.color) : 'border-border text-muted-foreground hover:border-border/80 bg-secondary/20',
                          )}>
                            <Icon className="w-4 h-4" />
                            <span className="text-xs font-medium">{ch.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {selectedChannel && (
                    <p className="text-xs text-muted-foreground/70 mt-1">{selectedChannel.desc}</p>
                  )}
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Language */}
                  <Field label="Langue" required>
                    <div className="relative">
                      <select {...register('language')} className={inputCls + ' appearance-none'}>
                        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </Field>

                  {/* Active toggle */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Statut</label>
                    <button
                      type="button"
                      onClick={() => setValue('is_active', !watchedIsActive)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px]',
                        watchedIsActive
                          ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                          : 'border-slate-500/30 bg-secondary/20 text-slate-400',
                      )}>
                      <div className={cn(
                        'w-9 h-5 rounded-full transition-all relative flex-shrink-0',
                        watchedIsActive ? 'bg-emerald-500' : 'bg-slate-500/40',
                      )}>
                        <div className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                          watchedIsActive ? 'left-[calc(100%-18px)]' : 'left-0.5',
                        )} />
                      </div>
                      {watchedIsActive ? 'Actif — disponible pour envoi' : 'Inactif — archivé'}
                    </button>
                  </div>
                </div>
              </section>

              {/* Trigger event */}
              <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" /> Événement déclencheur
                </h2>
                <div className="space-y-2">
                  {TRIGGER_EVENTS.map(te => {
                    const isSelected = watchedTrigger === te.value;
                    const Icon = te.icon;
                    return (
                      <label key={te.value} className="cursor-pointer block">
                        <input type="radio" value={te.value} {...register('trigger_event')} className="sr-only" />
                        <div className={cn(
                          'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all',
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20 hover:border-border/80',
                        )}>
                          <Icon className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>{te.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{te.desc}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>

              {/* Content */}
              <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" /> Contenu du message
                </h2>

                {/* Subject — email only */}
                {needsSubject && (
                  <Field label="Objet de l'email" hint="Supporte les variables: {{guest_name}}, {{property_name}}…">
                    <input {...register('subject')}
                      placeholder="Votre réservation chez {{property_name}} est confirmée !"
                      className={inputCls} />
                  </Field>
                )}

                <Field label="Corps du message" required error={errors.body?.message}
                  hint={`Cliquez sur une variable à gauche pour l'insérer au curseur${isRTL ? ' • RTL activé' : ''}`}>
                  <textarea
                    {...register('body')}
                    ref={el => setBodyRef(el)}
                    rows={10}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    placeholder={
                      isRTL
                        ? 'مرحباً {{guest_name}}،\n\nنتشرف بإعلامكم بتأكيد حجزكم...'
                        : watchedChannel === 'sms'
                        ? 'Bonjour {{guest_name}}, votre réservation chez {{property_name}} est confirmée pour le {{check_in_date}}. Code accès: {{access_code}}'
                        : 'Bonjour {{guest_name}},\n\nNous avons le plaisir de confirmer votre réservation chez {{property_name}} du {{check_in_date}} au {{check_out_date}}.\n\nÀ bientôt !'
                    }
                    className={cn(
                      'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground',
                      'placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors',
                      isRTL && 'text-right',
                    )}
                  />
                  {/* SMS character counter */}
                  {watchedChannel === 'sms' && (
                    <p className={cn('text-xs text-right', watchedBody.length > 160 ? 'text-orange-400' : 'text-muted-foreground/60')}>
                      {watchedBody.length} / 160 caractères
                      {watchedBody.length > 160 && ` · ${Math.ceil(watchedBody.length / 160)} SMS`}
                    </p>
                  )}
                </Field>
              </section>

            </div>

            {/* Right: Variable panel + Preview */}
            <div className="space-y-5">

              {/* Variables */}
              <div className="bg-card border border-border rounded-xl p-4 sticky top-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" /> Variables disponibles
                  <span className="text-primary/60 font-normal normal-case">
                    {selectedTrigger?.label}
                  </span>
                </h3>
                <div className="space-y-1.5 mb-4">
                  {allVars.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="w-full text-left flex items-start gap-2 p-2.5 rounded-lg hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group"
                    >
                      <code className="text-xs text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        {v.key}
                      </code>
                      <span className="text-xs text-muted-foreground leading-tight">{v.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Add custom variable */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground/70 mb-2">Variable personnalisée</p>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">{'{{'}  </span>
                      <input
                        value={newVarInput}
                        onChange={e => setNewVarInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomVar())}
                        placeholder="ma_variable"
                        className="w-full bg-secondary/40 border border-border rounded-lg pl-7 pr-2 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCustomVar}
                      disabled={!newVarInput.trim()}
                      className="px-2 py-2 bg-secondary border border-border rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {customVars.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {customVars.map(v => (
                        <div key={v} className="flex items-center gap-1 bg-secondary border border-border rounded-full px-2 py-0.5 text-xs">
                          <code className="text-primary font-mono">{`{{${v}}}`}</code>
                          <button type="button" onClick={() => setCustomVars(prev => prev.filter(cv => cv !== v))}>
                            <X className="w-3 h-3 text-muted-foreground hover:text-red-400 transition-colors" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {(watchedBody || watchedSubject) && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Aperçu</h3>
                  <div className={cn(
                    'rounded-xl p-3 border text-xs',
                    selectedChannel?.color.split(' ').slice(1).join(' ') ?? 'bg-secondary border-border',
                  )}>
                    {watchedSubject && (
                      <p className="font-semibold text-foreground mb-2 text-sm">{watchedSubject}</p>
                    )}
                    <p className={cn(
                      'text-foreground/80 whitespace-pre-wrap leading-relaxed',
                      isRTL && 'text-right',
                    )}>
                      {watchedBody.slice(0, 300)}{watchedBody.length > 300 ? '…' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ADR note */}
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400/80">
              <span className="font-semibold text-blue-400">ADR-012 ·</span> Les variables <code className="bg-blue-500/10 px-1 rounded">{'{{clé}}'}</code> sont
              remplacées côté serveur (Edge Function) au moment de l'envoi. Les templates sont versionnés (version++).
              LLM = brouillon uniquement, jamais auto-envoyé.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <button type="button" onClick={() => navigate('/communications')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={createTemplate.isPending || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createTemplate.isPending && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}>
              {createTemplate.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                : <><Save className="w-4 h-4" /> Créer le template</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewMessageTemplatePage;
