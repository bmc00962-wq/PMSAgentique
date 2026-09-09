// NewHousekeepingJobPage — React Hook Form + Zod + Supabase INSERT — ADR-013
// Création job de ménage: type, unité, date, heure, priorité, assigné, notes
// Génération checklist automatique selon le type de job
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Calendar, Clock, ChevronDown,
  Save, Loader2, User, AlertTriangle, Building2, Info,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const jobSchema = z.object({
  unit_id:        z.string().uuid('Sélectionnez une unité'),
  job_type:       z.enum(['checkout_clean', 'checkin_prep', 'mid_stay', 'deep_clean', 'inspection', 'turnover']),
  scheduled_date: z.string().min(1, 'Date requise'),
  scheduled_time: z.string().optional(),
  priority:       z.enum(['urgent', 'high', 'normal', 'low']),
  assigned_to:    z.string().optional(),
  notes:          z.string().max(1000).optional(),
  reservation_id: z.string().optional(),
});
type JobFormData = z.infer<typeof jobSchema>;

const JOB_TYPES = [
  { value: 'checkout_clean', label: 'Ménage départ',      desc: 'Nettoyage complet après départ voyageur', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'checkin_prep',   label: 'Préparation arrivée', desc: 'Préparation logement avant arrivée',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'mid_stay',       label: 'Ménage en séjour',   desc: 'Entretien pendant le séjour',              color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'deep_clean',     label: 'Grand ménage',       desc: 'Nettoyage approfondi complet',             color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'inspection',     label: 'Inspection',         desc: 'Vérification état du logement',            color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { value: 'turnover',       label: 'Turnover',           desc: 'Départ et arrivée le même jour',           color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
];

const PRIORITIES = [
  { value: 'urgent', label: '🔴 Urgent',  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'high',   label: '🟠 Élevée',  color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'normal', label: '🟡 Normale', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { value: 'low',    label: '⚪ Faible',  color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
];

// Default checklist items per job type
const CHECKLIST_TEMPLATES: Record<string, { label: string; category: string }[]> = {
  checkout_clean: [
    { label: 'Vider les poubelles', category: 'kitchen' },
    { label: 'Nettoyer cuisine (plans de travail, évier, plaques)', category: 'kitchen' },
    { label: 'Nettoyer salle de bain (lavabo, douche, WC)', category: 'bathroom' },
    { label: 'Passer l\'aspirateur dans toutes les pièces', category: 'general' },
    { label: 'Nettoyer les sols', category: 'general' },
    { label: 'Changer la literie et les serviettes', category: 'bedroom' },
    { label: 'Vérifier les équipements (TV, WiFi, prises)', category: 'general' },
    { label: 'Réapprovisionner consommables (gel douche, PQ, café)', category: 'general' },
  ],
  checkin_prep: [
    { label: 'Vérifier propreté générale', category: 'general' },
    { label: 'Préparer kit de bienvenue', category: 'general' },
    { label: 'Vérifier linge de lit propre et en place', category: 'bedroom' },
    { label: 'Vérifier serviettes', category: 'bathroom' },
    { label: 'Tester code d\'accès', category: 'general' },
    { label: 'Vérifier chauffage/climatisation', category: 'general' },
  ],
  deep_clean: [
    { label: 'Nettoyer intérieur réfrigérateur', category: 'kitchen' },
    { label: 'Nettoyer intérieur four/micro-ondes', category: 'kitchen' },
    { label: 'Détartrer douche et robinetterie', category: 'bathroom' },
    { label: 'Nettoyer fenêtres', category: 'general' },
    { label: 'Dépoussiérer mobilier et luminaires', category: 'general' },
    { label: 'Nettoyer balcon/terrasse', category: 'general' },
    { label: 'Passer aspirateur sous les meubles', category: 'general' },
  ],
  inspection: [
    { label: 'Vérifier état général du logement', category: 'general' },
    { label: 'Inventaire équipements', category: 'general' },
    { label: 'Vérifier absence de dégâts', category: 'general' },
    { label: 'Tester appareils électroménagers', category: 'kitchen' },
    { label: 'Vérifier plomberie', category: 'bathroom' },
  ],
  turnover: [
    { label: 'Vider poubelles', category: 'general' },
    { label: 'Nettoyer cuisine', category: 'kitchen' },
    { label: 'Nettoyer salle de bain', category: 'bathroom' },
    { label: 'Changer literie', category: 'bedroom' },
    { label: 'Passer aspirateur', category: 'general' },
    { label: 'Préparer kit bienvenue', category: 'general' },
  ],
  mid_stay: [
    { label: 'Vider poubelles si demandé', category: 'general' },
    { label: 'Changer serviettes si demandé', category: 'bathroom' },
    { label: 'Réapprovisionner consommables', category: 'general' },
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

const NewHousekeepingJobPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Load units + properties
  const { data: formData, isLoading: formLoading } = useQuery({
    queryKey: ['hk-form-data', TENANT_ID],
    queryFn: async () => {
      const [unitsRes, usersRes, reservationsRes] = await Promise.all([
        supabase.from('units')
          .select('id, name, property_id')
          .eq('tenant_id', TENANT_ID)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('name'),
        supabase.from('user_profiles')
          .select('id, username, email')
          .limit(20),
        supabase.from('reservations')
          .select('id, guest_first_name, guest_last_name, check_in, check_out, unit_id, status')
          .eq('tenant_id', TENANT_ID)
          .in('status', ['confirmed', 'checked_in'])
          .gte('check_out', new Date().toISOString().slice(0, 10))
          .order('check_out')
          .limit(20),
      ]);

      const propIds = [...new Set((unitsRes.data ?? []).map(u => u.property_id))];
      const { data: props } = await supabase.from('properties').select('id, name').in('id', propIds);
      const propMap: Record<string, string> = {};
      for (const p of props ?? []) propMap[p.id] = p.name;

      return {
        units: (unitsRes.data ?? []).map(u => ({ ...u, property_name: propMap[u.property_id] ?? '—' })),
        users: usersRes.data ?? [],
        reservations: reservationsRes.data ?? [],
      };
    },
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, watch,
    formState: { errors, isValid },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      job_type: 'checkout_clean',
      priority: 'normal',
      scheduled_date: new Date().toISOString().slice(0, 10),
    },
    mode: 'onChange',
  });

  const watchedType     = watch('job_type');
  const watchedPriority = watch('priority');

  const createJob = useMutation({
    mutationFn: async (data: JobFormData) => {
      // Insert housekeeping job
      const { data: job, error } = await supabase
        .from('housekeeping_jobs')
        .insert({
          tenant_id:       TENANT_ID,
          unit_id:         data.unit_id,
          reservation_id:  data.reservation_id || null,
          job_type:        data.job_type,
          status:          'pending',
          scheduled_date:  data.scheduled_date,
          scheduled_time:  data.scheduled_time || null,
          priority:        data.priority,
          assigned_to:     data.assigned_to || null,
          notes:           data.notes?.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Auto-generate checklist items
      const checklistItems = CHECKLIST_TEMPLATES[data.job_type] ?? [];
      if (checklistItems.length > 0) {
        await supabase.from('housekeeping_checklist_items').insert(
          checklistItems.map((item, idx) => ({
            tenant_id:   TENANT_ID,
            job_id:      job.id,
            item_order:  idx,
            label:       item.label,
            category:    item.category,
            is_completed: false,
          }))
        );
      }

      return job;
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-jobs', TENANT_ID] });
      toast.success(`Job de ménage créé avec ${CHECKLIST_TEMPLATES[watchedType]?.length ?? 0} tâches ✓`);
      navigate(`/housekeeping/${job.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedType = JOB_TYPES.find(t => t.value === watchedType);
  const checklist = CHECKLIST_TEMPLATES[watchedType] ?? [];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/housekeeping')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Ménage
          </button>
          <span>/</span>
          <span className="text-foreground">Nouveau job</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nouveau job de ménage</h1>
            <p className="text-xs text-muted-foreground mt-1">
              ADR-013 · Checklist auto-générée · Machine d'état: pending → assigned → in_progress → done
            </p>
          </div>
        </div>

        {formLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
        ) : (
          <form onSubmit={handleSubmit(d => createJob.mutate(d))} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Main form */}
              <div className="lg:col-span-2 space-y-6">

                {/* Type de job */}
                <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" /> Type de job
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {JOB_TYPES.map(jt => {
                      const isSelected = watchedType === jt.value;
                      return (
                        <label key={jt.value} className="cursor-pointer">
                          <input type="radio" value={jt.value} {...register('job_type')} className="sr-only" />
                          <div className={cn(
                            'flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all',
                            isSelected ? cn('border-current', jt.color) : 'border-border bg-secondary/20 hover:border-border/80 text-muted-foreground',
                          )}>
                            <span className="text-xs font-semibold">{jt.label}</span>
                            <span className={cn('text-xs', isSelected ? 'opacity-80' : 'text-muted-foreground/60')}>{jt.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>

                {/* Unité & Planification */}
                <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" /> Unité & Planification
                  </h2>
                  <Field label="Unité" required error={errors.unit_id?.message}>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select {...register('unit_id')} className={inputCls + ' pl-9 appearance-none'}>
                        <option value="">— Sélectionner une unité —</option>
                        {(formData?.units ?? []).map(u => (
                          <option key={u.id} value={u.id}>{u.property_name} · {u.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Date prévue" required error={errors.scheduled_date?.message}>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input type="date" {...register('scheduled_date')} className={inputCls + ' pl-9'} />
                      </div>
                    </Field>
                    <Field label="Heure prévue (optionnel)">
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input type="time" {...register('scheduled_time')} className={inputCls + ' pl-9'} />
                      </div>
                    </Field>
                  </div>

                  {/* Reservation link */}
                  {(formData?.reservations?.length ?? 0) > 0 && (
                    <Field label="Réservation liée (optionnel)"
                      hint="Lier ce job à une réservation pour le suivi check-in/check-out">
                      <div className="relative">
                        <select {...register('reservation_id')} className={inputCls + ' appearance-none'}>
                          <option value="">— Aucune réservation liée —</option>
                          {(formData?.reservations ?? []).map(r => (
                            <option key={r.id} value={r.id}>
                              {r.guest_first_name} {r.guest_last_name} · {r.check_in} → {r.check_out}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </Field>
                  )}
                </section>

                {/* Priorité & Assignation */}
                <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> Priorité & Assignation
                  </h2>

                  <Field label="Priorité" required>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRIORITIES.map(p => {
                        const isSelected = watchedPriority === p.value;
                        return (
                          <label key={p.value} className="cursor-pointer">
                            <input type="radio" value={p.value} {...register('priority')} className="sr-only" />
                            <div className={cn(
                              'text-center text-xs font-medium py-2.5 rounded-xl border-2 transition-all min-h-[44px] flex items-center justify-center',
                              isSelected ? cn('border-current', p.color) : 'border-border bg-secondary/20 text-muted-foreground hover:border-border/80',
                            )}>
                              {p.label}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Assigner à (optionnel)"
                    hint="Technicien de ménage responsable">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select {...register('assigned_to')} className={inputCls + ' pl-9 appearance-none'}>
                        <option value="">— Non assigné —</option>
                        {(formData?.users ?? []).map(u => (
                          <option key={u.id} value={u.id}>{u.username ?? u.email}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </Field>
                </section>

                {/* Notes */}
                <section className="bg-card border border-border rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-muted-foreground" /> Notes internes (optionnel)
                  </h2>
                  <textarea {...register('notes')} rows={3}
                    placeholder="Instructions particulières, accès difficile, équipement spécial requis…"
                    className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                </section>
              </div>

              {/* Right: Checklist preview */}
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4 sticky top-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Checklist auto
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-normal normal-case">
                      {checklist.length} tâche{checklist.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  {selectedType && (
                    <div className={cn('text-xs px-3 py-2 rounded-lg border mb-3', selectedType.color)}>
                      {selectedType.label} — {selectedType.desc}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20">
                        <div className="w-4 h-4 rounded border border-border flex-shrink-0 mt-0.5 bg-secondary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-tight">{item.label}</p>
                          <p className="text-xs text-muted-foreground/50 capitalize">{item.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {checklist.length === 0 && (
                    <p className="text-xs text-muted-foreground/60 text-center py-4">
                      Aucune checklist pour ce type
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pb-8">
              <button type="button" onClick={() => navigate('/housekeeping')}
                className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
                <ArrowLeft className="w-4 h-4" /> Annuler
              </button>
              <button
                type="submit"
                disabled={createJob.isPending || !isValid}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                  !createJob.isPending && isValid
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}>
                {createJob.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                  : <><Save className="w-4 h-4" /> Créer le job ({checklist.length} tâches)</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default NewHousekeepingJobPage;
