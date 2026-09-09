// NewMaintenancePage — React Hook Form + Zod + Supabase INSERT — ADR-014
// Formulaire création ticket maintenance: unit dropdown, property, title, category, priority, description
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Wrench, Building2, AlertTriangle,
  FileText, DollarSign, Save, Loader2, Info, Home,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const maintenanceSchema = z.object({
  unit_id:        z.string().uuid('Sélectionnez une unité'),
  property_id:    z.string().uuid('Propriété requise'),
  title:          z.string().min(3, 'Titre requis (min 3 caractères)').max(200),
  description:    z.string().min(5, 'Description requise (min 5 caractères)').max(2000),
  category:       z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'cleaning', 'general', 'security']),
  priority:       z.enum(['low', 'normal', 'high', 'urgent', 'emergency']),
  source:         z.enum(['manual', 'guest_report', 'housekeeping_escalation', 'inspection', 'agent']),
  estimated_cost: z.coerce.number().min(0).optional(),
  requires_approval: z.boolean(),
});
type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

const CATEGORIES = [
  { value: 'plumbing',    label: 'Plomberie',       color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'electrical',  label: 'Électricité',     color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { value: 'hvac',        label: 'Climatisation',   color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'appliance',   label: 'Électroménager',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'structural',  label: 'Structure',       color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'pest',        label: 'Nuisibles',       color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'cleaning',    label: 'Nettoyage',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'general',     label: 'Général',         color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'security',    label: 'Sécurité',        color: 'text-red-400 bg-red-500/10 border-red-500/20' },
];

const PRIORITIES = [
  { value: 'low',       label: 'Basse',      color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',     desc: 'Pas urgent, planifier' },
  { value: 'normal',    label: 'Normale',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',        desc: '< 72 h' },
  { value: 'high',      label: 'Haute',      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',     desc: '< 24 h' },
  { value: 'urgent',    label: 'Urgent',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',  desc: '< 4 h' },
  { value: 'emergency', label: 'Urgence',    color: 'text-red-400 bg-red-500/10 border-red-500/20',           desc: 'Immédiat' },
];

const SOURCES = [
  { value: 'manual',                    label: 'Équipe interne' },
  { value: 'guest_report',              label: 'Signalement voyageur' },
  { value: 'housekeeping_escalation',   label: 'Escalade ménage' },
  { value: 'inspection',                label: 'Inspection' },
  { value: 'agent',                     label: 'Agent automatique' },
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

const NewMaintenancePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const preselectedUnitId = searchParams.get('unit_id') ?? '';
  const preselectedPropertyId = searchParams.get('property_id') ?? '';

  // Load properties + units for dropdowns
  const { data: propertiesWithUnits = [], isLoading } = useQuery({
    queryKey: ['properties-units-maint', TENANT_ID],
    queryFn: async () => {
      const { data: props, error: pErr } = await supabase
        .from('properties')
        .select('id, name, city')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');
      if (pErr) throw pErr;

      const { data: units, error: uErr } = await supabase
        .from('units')
        .select('id, name, property_id, unit_type')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');
      if (uErr) throw uErr;

      return (props ?? []).map(p => ({
        ...p,
        units: (units ?? []).filter(u => u.property_id === p.id),
      }));
    },
    staleTime: 60_000,
  });

  const allUnits = propertiesWithUnits.flatMap(p => p.units.map(u => ({ ...u, property_name: p.name, property_id: p.id })));

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isValid },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      unit_id:           preselectedUnitId,
      property_id:       preselectedPropertyId,
      title:             '',
      description:       '',
      category:          'general',
      priority:          'normal',
      source:            'manual',
      estimated_cost:    undefined,
      requires_approval: false,
    },
    mode: 'onChange',
  });

  const selectedUnitId = watch('unit_id');
  const selectedUnit = allUnits.find(u => u.id === selectedUnitId);
  const selectedCategory = watch('category');
  const selectedPriority = watch('priority');
  const requiresApproval = watch('requires_approval');

  // Auto-fill property_id when unit changes
  const handleUnitChange = (unitId: string) => {
    setValue('unit_id', unitId, { shouldValidate: true });
    const unit = allUnits.find(u => u.id === unitId);
    if (unit) {
      setValue('property_id', unit.property_id, { shouldValidate: true });
    }
  };

  const createTicket = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const { data: ticket, error } = await supabase
        .from('maintenance_tickets')
        .insert({
          tenant_id:         TENANT_ID,
          unit_id:           data.unit_id,
          property_id:       data.property_id,
          title:             data.title.trim(),
          description:       data.description.trim(),
          category:          data.category,
          priority:          data.priority,
          source:            data.source,
          status:            'open',
          estimated_cost:    data.estimated_cost || null,
          requires_approval: data.requires_approval,
          currency:          'CAD',
        })
        .select('id')
        .single();
      if (error) throw error;
      return ticket;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Ticket de maintenance créé ✓');
      navigate(`/maintenance/${ticket.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  }

  const priorityInfo = PRIORITIES.find(p => p.value === selectedPriority);
  const categoryInfo = CATEGORIES.find(c => c.value === selectedCategory);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/maintenance')} className="hover:text-foreground transition-colors">Maintenance</button>
          <span>/</span>
          <span className="text-foreground">Nouveau ticket</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nouveau ticket de maintenance</h1>
            <p className="text-xs text-muted-foreground mt-1">Signaler un incident ou planifier une intervention technique</p>
          </div>
        </div>

        {/* ADR note */}
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400/80">
            <span className="font-semibold text-blue-400">ADR-014 ·</span> Les tickets urgents/emergency génèrent automatiquement
            une alerte dans le panneau de notifications. Si le coût dépasse le seuil d'approbation, une demande sera créée.
          </p>
        </div>

        <form onSubmit={handleSubmit(d => createTicket.mutate(d))} className="space-y-6">

          {/* Unité */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400" /> Localisation
            </h2>
            <Field label="Unité concernée" required error={errors.unit_id?.message}>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedUnitId}
                  onChange={e => handleUnitChange(e.target.value)}
                  className={selectCls + ' pl-9'}
                >
                  <option value="">— Sélectionner une unité —</option>
                  {propertiesWithUnits.map(p => (
                    <optgroup key={p.id} label={`${p.name}${p.city ? ` · ${p.city}` : ''}`}>
                      {p.units.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.unit_type})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </Field>
            {selectedUnit && (
              <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-400">
                  <strong>{selectedUnit.name}</strong> · {selectedUnit.property_name}
                </p>
              </div>
            )}
            <input type="hidden" {...register('property_id')} />
          </section>

          {/* Description */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" /> Description de l'incident
            </h2>
            <Field label="Titre" required error={errors.title?.message}
              hint="Résumé court et précis du problème">
              <input
                {...register('title')}
                placeholder="Ex: Robinet cuisine qui goutte, Radiateur SdB en panne…"
                className={inputCls}
              />
            </Field>
            <Field label="Description détaillée" required error={errors.description?.message}
              hint="Décrivez le problème, l'impact, les observations visuelles…">
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Détails de l'incident, symptômes observés, urgence pour les voyageurs…"
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Source" error={errors.source?.message}>
                <select {...register('source')} className={selectCls}>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Catégorie */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-400" /> Catégorie
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <label key={cat.value} className="cursor-pointer">
                    <input type="radio" value={cat.value} {...register('category')} className="sr-only peer" />
                    <div className={cn(
                      'flex items-center justify-center text-xs font-medium py-2.5 px-3 rounded-xl border-2 transition-all text-center min-h-[40px]',
                      isSelected
                        ? cn('border-current', cat.color)
                        : 'border-border text-muted-foreground hover:border-border/70 bg-secondary/20',
                    )}>
                      {cat.label}
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
          </section>

          {/* Priorité */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Priorité
            </h2>
            <div className="space-y-2">
              {PRIORITIES.map(p => {
                const isSelected = selectedPriority === p.value;
                return (
                  <label key={p.value} className="cursor-pointer block">
                    <input type="radio" value={p.value} {...register('priority')} className="sr-only peer" />
                    <div className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all',
                      isSelected ? cn('border-current', p.color) : 'border-border bg-secondary/20 hover:border-border/70',
                    )}>
                      <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', p.color.split(' ')[0])} />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-foreground">{p.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.desc}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Coût estimé */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Coût estimé (optionnel)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Estimation (CAD)" error={errors.estimated_cost?.message}
                hint="Laissez vide si inconnu — technicien à évaluer">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="number" min={0} step="0.01"
                    {...register('estimated_cost')}
                    placeholder="0.00"
                    className={inputCls + ' pl-9'}
                  />
                </div>
              </Field>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('requires_approval')}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Nécessite une approbation</p>
                    <p className="text-xs text-muted-foreground">Créer une demande d'approbation (ADR-020)</p>
                  </div>
                </label>
              </div>
            </div>
            {requiresApproval && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400">
                  Une demande d'approbation sera générée pour validation avant intervention (ADR-020).
                </p>
              </div>
            )}
          </section>

          {/* Preview */}
          {watch('title') && selectedUnit && (
            <div className={cn('rounded-xl px-5 py-4 border', categoryInfo?.color.split(' ').slice(1).join(' ') ?? 'bg-secondary border-border')}>
              <p className={cn('text-xs font-semibold mb-2', categoryInfo?.color.split(' ')[0] ?? 'text-foreground')}>
                Aperçu du ticket
              </p>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className={cn('px-2 py-0.5 rounded-full border font-medium', priorityInfo?.color ?? '')}>{priorityInfo?.label}</span>
                <span className={cn('px-2 py-0.5 rounded-full border font-medium', categoryInfo?.color ?? '')}>{categoryInfo?.label}</span>
                <span className="text-muted-foreground">{selectedUnit.name} · {selectedUnit.property_name}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-2">{watch('title')}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/maintenance')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createTicket.isPending && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}
            >
              {createTicket.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                : <><Save className="w-4 h-4" /> Créer le ticket</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewMaintenancePage;
