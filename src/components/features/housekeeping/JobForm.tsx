import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { HousekeepingFormValues } from '@/types/housekeeping';
import { MOCK_HOUSEKEEPERS, JOB_TYPE_LABELS, JOB_PRIORITY_LABELS } from '@/lib/housekeepingMockData';
import { canUserPerform } from '@/lib/auth';

const schema = z.object({
  property_id: z.string().min(1, 'Propriete requise'),
  unit_id: z.string(),
  type: z.enum(['checkout_clean', 'mid_stay_clean', 'deep_clean', 'maintenance_prep', 'inspection']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  scheduled_date: z.string().min(1, 'Date requise'),
  scheduled_start: z.string(),
  estimated_duration: z.number().min(15, 'Min 15 min').max(480, 'Max 8h'),
  housekeeper_id: z.string(),
  notes: z.string(),
});

const PROPERTIES = [
  { id: 'prop-001', name: 'Le Loft Mile-End' },
  { id: 'prop-002', name: 'Maison Plateau Familiale' },
  { id: 'prop-003', name: 'Studio Cote-des-Neiges' },
  { id: 'prop-004', name: 'Chalet Mont-Tremblant' },
  { id: 'prop-005', name: 'Dar Zitoun Marrakech' },
  { id: 'prop-006', name: 'Villa Hassan II Marrakech' },
];

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-foreground/80 mb-1">{label}</label>
    {children}
    {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
  </div>
);

const CLS = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

interface Props { open: boolean; onClose: () => void; }

const JobForm = ({ open, onClose }: Props) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HousekeepingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'checkout_clean', priority: 'normal', estimated_duration: 90, notes: '', housekeeper_id: '', unit_id: '' },
  });

  useEffect(() => {
    if (!open) { reset(); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, reset]);

  const onSubmit = async (data: HousekeepingFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: 'housekeeping.create' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Permission refusee'); return; }
    console.log('[JobForm] submit', data);
    await new Promise(r => setTimeout(r, 500));
    toast.success('Job cree (demo — Supabase requis)');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Nouveau job</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Planifier un job de menage</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs text-amber-400">Mode demo — donnees non persistees (Supabase requis)</p>
          </div>

          <Field label="Propriete *" error={errors.property_id?.message}>
            <select {...register('property_id')} className={CLS}>
              <option value="">Selectionner...</option>
              {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <Field label="Unite" error={errors.unit_id?.message}>
            <input {...register('unit_id')} placeholder="ex: Studio A, Chambre 1..." className={CLS} />
          </Field>

          <Field label="Type de job *" error={errors.type?.message}>
            <select {...register('type')} className={CLS}>
              {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priorite" error={errors.priority?.message}>
              <select {...register('priority')} className={CLS}>
                {Object.entries(JOB_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Duree (min)" error={errors.estimated_duration?.message}>
              <input type="number" {...register('estimated_duration', { valueAsNumber: true })} className={CLS} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *" error={errors.scheduled_date?.message}>
              <input type="date" {...register('scheduled_date')} className={CLS} />
            </Field>
            <Field label="Heure" error={errors.scheduled_start?.message}>
              <input type="time" {...register('scheduled_start')} className={CLS} />
            </Field>
          </div>

          <Field label="Assigner a">
            <select {...register('housekeeper_id')} className={CLS}>
              <option value="">Non assigne</option>
              {MOCK_HOUSEKEEPERS.filter(h => h.is_active).map(h => (
                <option key={h.id} value={h.id}>{h.first_name} {h.last_name}</option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea rows={3} {...register('notes')} placeholder="Instructions speciales..."
              className={`${CLS} resize-none`} />
          </Field>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors min-h-[44px]">
            Annuler
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]">
            {isSubmitting ? 'Creation...' : 'Creer le job'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobForm;
