// NewOwnerStatementPage — React Hook Form + Zod + Supabase INSERT — ADR-015
// Génération manuelle de relevé propriétaire avec calcul automatique depuis ledger_entries
// Period start/end → calcul revenus (base_rent, cleaning_fee, tax) + frais → net_payout
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, DollarSign, Calendar, ChevronDown,
  Save, Loader2, User, Info, TrendingUp, Calculator, CheckCircle2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const statementSchema = z.object({
  owner_id:      z.string().uuid('Sélectionnez un propriétaire'),
  period_start:  z.string().min(1, 'Date de début requise'),
  period_end:    z.string().min(1, 'Date de fin requise'),
  currency:      z.enum(['CAD', 'MAD', 'EUR', 'USD']),
  notes:         z.string().max(1000).optional(),
}).refine(d => d.period_start <= d.period_end, {
  message: 'La date de fin doit être après le début',
  path: ['period_end'],
});
type StatementFormData = z.infer<typeof statementSchema>;

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

// Management fee percentage from tenant settings
const MANAGEMENT_FEE_PCT = 18; // 18% par défaut (ADR-015)
const TAX_PCT = 18.475;

// ── Preview Calculator ─────────────────────────────────────────────────────────
interface PreviewData {
  totalRevenue: number;
  cleaningFees: number;
  managementFee: number;
  maintenanceCosts: number;
  netPayout: number;
  reservationCount: number;
  currency: string;
}

async function calculatePreview(ownerId: string, periodStart: string, periodEnd: string): Promise<PreviewData | null> {
  if (!ownerId || !periodStart || !periodEnd) return null;

  // Get all units owned by this owner via their properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);

  if (!properties?.length) return null;
  const propIds = properties.map(p => p.id);

  const { data: units } = await supabase
    .from('units')
    .select('id')
    .in('property_id', propIds)
    .eq('tenant_id', TENANT_ID);

  if (!units?.length) return null;
  const unitIds = units.map(u => u.id);

  // Get reservations in period
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, base_rent, cleaning_fee, tax_amount, channel_commission, total_amount, currency, status')
    .in('unit_id', unitIds)
    .eq('tenant_id', TENANT_ID)
    .in('status', ['confirmed', 'checked_in', 'checked_out', 'completed'])
    .gte('check_in', periodStart)
    .lte('check_out', periodEnd)
    .is('deleted_at', null);

  if (!reservations) return null;

  const totalRevenue = reservations.reduce((s, r) => s + Number(r.base_rent) + Number(r.cleaning_fee), 0);
  const cleaningFees = reservations.reduce((s, r) => s + Number(r.cleaning_fee), 0);
  const managementFee = totalRevenue * (MANAGEMENT_FEE_PCT / 100);

  // Get maintenance costs for these units in period
  const { data: maintenanceInterventions } = await supabase
    .from('maintenance_interventions')
    .select('total_cost')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', periodStart + 'T00:00:00Z')
    .lte('created_at', periodEnd + 'T23:59:59Z');

  const maintenanceCosts = (maintenanceInterventions ?? []).reduce((s, m) => s + Number(m.total_cost), 0);
  const netPayout = totalRevenue - managementFee - maintenanceCosts;
  const currency = reservations[0]?.currency ?? 'CAD';

  return {
    totalRevenue,
    cleaningFees,
    managementFee,
    maintenanceCosts,
    netPayout,
    reservationCount: reservations.length,
    currency,
  };
}

const NewOwnerStatementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Load owners
  const { data: owners = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['owners-list', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, first_name, last_name, city, country')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, watch,
    formState: { errors, isValid },
  } = useForm<StatementFormData>({
    resolver: zodResolver(statementSchema),
    defaultValues: {
      currency: 'CAD',
      // Default: last full month
      period_start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10),
      period_end:   new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10),
    },
    mode: 'onChange',
  });

  const watchedOwnerId = watch('owner_id');
  const watchedStart   = watch('period_start');
  const watchedEnd     = watch('period_end');
  const watchedCurrency = watch('currency');

  const handleCalculate = async () => {
    if (!watchedOwnerId || !watchedStart || !watchedEnd) return;
    setIsCalculating(true);
    const result = await calculatePreview(watchedOwnerId, watchedStart, watchedEnd);
    setPreview(result);
    setIsCalculating(false);
  };

  const createStatement = useMutation({
    mutationFn: async (data: StatementFormData) => {
      const calc = preview ?? {
        totalRevenue: 0,
        cleaningFees: 0,
        managementFee: 0,
        maintenanceCosts: 0,
        netPayout: 0,
        reservationCount: 0,
        currency: data.currency,
      };

      const { data: stmt, error } = await supabase
        .from('owner_statements')
        .insert({
          tenant_id:          TENANT_ID,
          owner_id:           data.owner_id,
          period_start:       data.period_start,
          period_end:         data.period_end,
          total_revenue:      calc.totalRevenue,
          total_fees:         calc.managementFee + calc.maintenanceCosts,
          management_fee:     calc.managementFee,
          cleaning_fees:      calc.cleaningFees,
          maintenance_costs:  calc.maintenanceCosts,
          net_payout:         calc.netPayout,
          currency:           data.currency,
          status:             'draft',
          notes:              data.notes?.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return stmt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-statements', TENANT_ID] });
      toast.success('Relevé créé (brouillon) ✓');
      navigate('/finance/statements');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedOwner = owners.find(o => o.id === watchedOwnerId);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/finance/statements')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Relevés propriétaires
          </button>
          <span>/</span>
          <span className="text-foreground">Nouveau relevé</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nouveau relevé propriétaire</h1>
            <p className="text-xs text-muted-foreground mt-1">
              ADR-015 · Immuable une fois envoyé · Frais gestion {MANAGEMENT_FEE_PCT}% · Grand livre append-only
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => createStatement.mutate(d))} className="space-y-6">

          {/* Propriétaire & Période */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> Propriétaire & Période
            </h2>

            <Field label="Propriétaire" required error={errors.owner_id?.message}>
              {ownersLoading ? (
                <div className="flex items-center gap-2 py-3"><LoadingSpinner size="sm" /><span className="text-xs text-muted-foreground">Chargement…</span></div>
              ) : (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select {...register('owner_id')} className={inputCls + ' pl-9 appearance-none'}>
                    <option value="">— Sélectionner un propriétaire —</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.first_name} {o.last_name}{o.city ? ` · ${o.city}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Début de période" required error={errors.period_start?.message}>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="date" {...register('period_start')} className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Fin de période" required error={errors.period_end?.message}>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="date" {...register('period_end')} className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Devise" required>
                <div className="relative">
                  <select {...register('currency')} className={inputCls + ' appearance-none'}>
                    <option value="CAD">CAD — Dollar canadien</option>
                    <option value="MAD">MAD — Dirham marocain</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar US</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </Field>
            </div>

            {/* Calculate preview button */}
            {watchedOwnerId && watchedStart && watchedEnd && (
              <button
                type="button"
                onClick={handleCalculate}
                disabled={isCalculating}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors min-h-[44px] disabled:opacity-50">
                {isCalculating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Calcul en cours…</>
                  : <><Calculator className="w-4 h-4" /> Calculer automatiquement depuis les réservations</>
                }
              </button>
            )}
          </section>

          {/* Preview */}
          {preview !== null && (
            <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" /> Calcul automatique
                <span className="text-xs font-normal text-muted-foreground">
                  {preview.reservationCount} réservation{preview.reservationCount > 1 ? 's' : ''} · {watchedStart} → {watchedEnd}
                </span>
              </h2>

              {preview.reservationCount === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune réservation confirmée pour ce propriétaire sur la période sélectionnée.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Revenus totaux (loyers + ménage)', val: preview.totalRevenue, color: 'text-emerald-400', sign: '+' },
                    { label: `Frais de gestion (${MANAGEMENT_FEE_PCT}%)`, val: -preview.managementFee, color: 'text-orange-400', sign: '-' },
                    { label: 'Frais de ménage inclus', val: -preview.cleaningFees, color: 'text-blue-400', sign: '-' },
                    { label: 'Coûts de maintenance', val: -preview.maintenanceCosts, color: 'text-yellow-400', sign: '-' },
                  ].map(({ label, val, color, sign }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-emerald-500/10">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn('font-mono font-medium', color)}>
                        {sign}{Math.abs(val).toFixed(2)} {preview.currency}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 mt-1">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Net à verser
                    </span>
                    <span className="font-bold text-xl font-mono text-emerald-400">
                      {preview.netPayout.toFixed(2)} {preview.currency}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Notes */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-muted-foreground" /> Notes internes (optionnel)
            </h2>
            <textarea {...register('notes')} rows={3}
              placeholder="Commentaires sur ce relevé, ajustements exceptionnels, références de virement…"
              className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </section>

          {/* ADR note */}
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400/80">
              <span className="font-semibold text-blue-400">ADR-015 ·</span> Le relevé est créé en statut <em>Brouillon</em>.
              Il doit être révisé avant envoi. Une fois envoyé ou payé, il est <strong>immuable</strong>.
              Toute correction crée un nouveau relevé avec entrée d'ajustement dans le grand livre.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button type="button" onClick={() => navigate('/finance/statements')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={createStatement.isPending || !isValid}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !createStatement.isPending && isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}>
              {createStatement.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                : <><Save className="w-4 h-4" /> Créer le relevé (Brouillon)</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewOwnerStatementPage;
