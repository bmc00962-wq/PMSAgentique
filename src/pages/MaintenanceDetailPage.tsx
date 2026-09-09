// MaintenanceDetailPage — Live Supabase data — ADR-014
// Onglets: Détails | Interventions (add inline) | Historique statut
// Machine d'état: open → assigned → in_progress → pending_parts → resolved → closed
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Wrench, AlertTriangle, Building2, User, CheckCircle2,
  Clock, DollarSign, Plus, Loader2, Save, Info, ChevronRight, Edit,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── State machine ──────────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, string[]> = {
  open:           ['assigned', 'in_progress', 'closed'],
  assigned:       ['in_progress', 'resolved', 'closed'],
  in_progress:    ['pending_parts', 'resolved', 'closed'],
  pending_parts:  ['in_progress', 'resolved'],
  resolved:       ['closed'],
  closed:         [],
  escalated:      ['assigned', 'in_progress'],
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', assigned: 'Assigné', in_progress: 'En cours',
  pending_parts: 'Pièces attendues', resolved: 'Résolu', closed: 'Fermé', escalated: 'Escaladé',
};

const STATUS_COLOR: Record<string, string> = {
  open:          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  pending_parts: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  resolved:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed:        'bg-slate-500/10 text-slate-400 border-slate-500/20',
  escalated:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const PRIORITY_COLOR: Record<string, string> = {
  emergency: 'text-red-400 bg-red-500/10 border-red-500/20',
  urgent:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
  high:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  normal:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  low:       'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Plomberie', electrical: 'Électricité', hvac: 'Climatisation',
  appliance: 'Électroménager', structural: 'Structure', pest: 'Nuisibles',
  cleaning: 'Nettoyage', general: 'Général', security: 'Sécurité',
};

type TabId = 'details' | 'interventions' | 'history';

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchTicketDetail(id: string) {
  const { data: ticket, error } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  const [unitRes, propsRes, interventionsRes] = await Promise.all([
    supabase.from('units').select('id, name, unit_type').eq('id', ticket.unit_id).single(),
    supabase.from('properties').select('id, name, city').eq('id', ticket.property_id).single(),
    supabase.from('maintenance_interventions')
      .select('id, description, duration_hours, parts_cost, labor_cost, total_cost, currency, status, started_at, completed_at, created_at')
      .eq('ticket_id', id)
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false }),
  ]);

  const interventions = interventionsRes.data ?? [];
  const totalCost = interventions.reduce((s, i) => s + Number(i.total_cost), 0);

  return {
    ticket,
    unit: unitRes.data,
    property: propsRes.data,
    interventions,
    totalCost,
  };
}

// ── Component ───────────────────────────────────────────────────────────────
const MaintenanceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [showInterventionForm, setShowInterventionForm] = useState(false);

  // Intervention form state
  const [intDescription, setIntDescription] = useState('');
  const [intDurationHours, setIntDurationHours] = useState('');
  const [intPartsCost, setIntPartsCost] = useState('0');
  const [intLaborCost, setIntLaborCost] = useState('0');

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => fetchTicketDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  // Update ticket status
  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({
          status: newStatus,
          version: (data!.ticket.version ?? 1) + 1,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets', TENANT_ID] });
      toast.success(`Statut → ${STATUS_LABELS[newStatus]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Add intervention
  const addIntervention = useMutation({
    mutationFn: async () => {
      const parts = Number(intPartsCost) || 0;
      const labor = Number(intLaborCost) || 0;
      const total = parts + labor;
      const { error } = await supabase
        .from('maintenance_interventions')
        .insert({
          tenant_id: TENANT_ID,
          ticket_id: id!,
          description: intDescription.trim(),
          duration_hours: intDurationHours ? Number(intDurationHours) : null,
          parts_cost: parts,
          labor_cost: labor,
          total_cost: total,
          currency: 'CAD',
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      if (error) throw error;

      // Update actual_cost on ticket
      await supabase
        .from('maintenance_tickets')
        .update({
          actual_cost: (Number(data?.ticket.actual_cost ?? 0)) + total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', id] });
      toast.success('Intervention ajoutée ✓');
      setShowInterventionForm(false);
      setIntDescription('');
      setIntDurationHours('');
      setIntPartsCost('0');
      setIntLaborCost('0');
      setActiveTab('interventions');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.ticket) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Ticket introuvable</p>
          <button onClick={() => navigate('/maintenance')} className="text-primary text-sm hover:underline">← Maintenance</button>
        </div>
      </AppLayout>
    );
  }

  const { ticket: t, unit, property, interventions, totalCost } = data;
  const nextStatuses = STATUS_TRANSITIONS[t.status] ?? [];
  const isTerminal = t.status === 'closed';

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'details', label: 'Détails' },
    { id: 'interventions', label: 'Interventions', count: interventions.length },
    { id: 'history', label: 'Suivi' },
  ];

  const intPartsNum = Number(intPartsCost) || 0;
  const intLaborNum = Number(intLaborCost) || 0;
  const intTotalPreview = intPartsNum + intLaborNum;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/maintenance')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Maintenance
          </button>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{t.title}</span>
        </div>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', PRIORITY_COLOR[t.priority] ?? 'bg-secondary border-border')}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-foreground">{t.title}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_COLOR[t.status] ?? '')}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PRIORITY_COLOR[t.priority] ?? '')}>
                  {t.priority}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {property?.name ?? '—'} · {unit?.name ?? '—'}
                {property?.city ? ` · ${property.city}` : ''}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">{CATEGORY_LABELS[t.category] ?? t.category}</p>
            </div>

            {/* Next status actions */}
            {!isTerminal && nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(ns => (
                  <button
                    key={ns}
                    onClick={() => updateStatus.mutate(ns)}
                    disabled={updateStatus.isPending}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-colors min-h-[36px] disabled:opacity-50',
                      ns === 'closed'
                        ? 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20'
                        : ns === 'resolved'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20',
                    )}>
                    <ChevronRight className="w-3 h-3" />
                    {STATUS_LABELS[ns]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Coût estimé', value: t.estimated_cost ? `${Number(t.estimated_cost).toFixed(2)} ${t.currency}` : '—', color: 'text-blue-400', icon: DollarSign },
            { label: 'Coût réel', value: t.actual_cost ? `${Number(t.actual_cost).toFixed(2)} ${t.currency}` : '—', color: 'text-emerald-400', icon: DollarSign },
            { label: 'Interventions', value: interventions.length, color: 'text-purple-400', icon: Wrench },
            { label: 'Total interventions', value: totalCost > 0 ? `${totalCost.toFixed(2)} CAD` : '—', color: 'text-orange-400', icon: DollarSign },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
              <div className="min-w-0">
                <p className={cn('text-sm font-bold truncate font-mono', color)}>{value}</p>
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center border-b border-border px-1 pt-1 gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                  activeTab === tab.id ? 'text-primary border-primary bg-primary/5' : 'text-muted-foreground border-transparent hover:text-foreground',
                )}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                  )}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-sm text-foreground leading-relaxed">{t.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {unit && (
                    <div className="bg-secondary/20 border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Unité</p>
                      <button onClick={() => navigate(`/units/${unit.id}`)} className="text-sm font-semibold text-primary hover:underline">{unit.name}</button>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{unit.unit_type}</p>
                    </div>
                  )}
                  {property && (
                    <div className="bg-secondary/20 border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Propriété</p>
                      <button onClick={() => navigate(`/properties/${property.id}`)} className="text-sm font-semibold text-primary hover:underline">{property.name}</button>
                      {property.city && <p className="text-xs text-muted-foreground mt-0.5">{property.city}</p>}
                    </div>
                  )}
                  <div className="bg-secondary/20 border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <p className="text-sm font-semibold text-foreground capitalize">{t.source?.replace(/_/g, ' ') ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                </div>

                {t.requires_approval && (
                  <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">
                      Ce ticket requiert une approbation avant intervention (ADR-020).{' '}
                      <button onClick={() => navigate('/approvals')} className="underline hover:no-underline">Voir les approbations</button>
                    </p>
                  </div>
                )}

                {t.resolved_at && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Résolu le {new Date(t.resolved_at).toLocaleDateString('fr-CA', { dateStyle: 'long' })}</span>
                  </div>
                )}
              </div>
            )}

            {/* INTERVENTIONS TAB */}
            {activeTab === 'interventions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {interventions.length} intervention{interventions.length !== 1 ? 's' : ''}
                    {totalCost > 0 && (
                      <span className="text-muted-foreground font-normal ml-2 text-xs">· Total: {totalCost.toFixed(2)} CAD</span>
                    )}
                  </h3>
                  {!isTerminal && (
                    <button
                      onClick={() => setShowInterventionForm(f => !f)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors min-h-[36px]">
                      <Plus className="w-3 h-3" /> Ajouter
                    </button>
                  )}
                </div>

                {/* Add Intervention Form (inline) */}
                {showInterventionForm && (
                  <div className="bg-secondary/20 border border-primary/20 rounded-xl p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-primary">Nouvelle intervention</h4>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Description <span className="text-red-400">*</span></label>
                      <textarea
                        value={intDescription}
                        onChange={e => setIntDescription(e.target.value)}
                        rows={3}
                        placeholder="Décrivez l'intervention effectuée, pièces remplacées, travaux réalisés…"
                        className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Durée (h)</label>
                        <input
                          type="number" min={0} step="0.5"
                          value={intDurationHours}
                          onChange={e => setIntDurationHours(e.target.value)}
                          placeholder="1.5"
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Pièces (CAD)</label>
                        <input
                          type="number" min={0} step="0.01"
                          value={intPartsCost}
                          onChange={e => setIntPartsCost(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Main d'œuvre (CAD)</label>
                        <input
                          type="number" min={0} step="0.01"
                          value={intLaborCost}
                          onChange={e => setIntLaborCost(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    {intTotalPreview > 0 && (
                      <div className="flex items-center justify-between text-sm border-t border-border pt-3">
                        <span className="text-muted-foreground">Total estimé</span>
                        <span className="font-bold font-mono text-emerald-400">{intTotalPreview.toFixed(2)} CAD</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInterventionForm(false)}
                        className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                        Annuler
                      </button>
                      <button
                        onClick={() => addIntervention.mutate()}
                        disabled={addIntervention.isPending || !intDescription.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {addIntervention.isPending
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                          : <><Save className="w-4 h-4" /> Enregistrer l'intervention</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Interventions list */}
                {interventions.length === 0 ? (
                  <div className="text-center py-10">
                    <Wrench className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune intervention enregistrée</p>
                    {!isTerminal && (
                      <button onClick={() => setShowInterventionForm(true)} className="text-xs text-primary mt-2 hover:underline">
                        Ajouter la première intervention →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interventions.map(int => (
                      <div key={int.id} className="bg-secondary/20 border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug">{int.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(int.created_at).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                              {int.duration_hours ? ` · ${int.duration_hours}h` : ''}
                            </p>
                          </div>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                            int.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          )}>
                            {int.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          {[
                            { l: 'Pièces', v: int.parts_cost },
                            { l: 'Main d\'œuvre', v: int.labor_cost },
                            { l: 'Total', v: int.total_cost },
                          ].map(({ l, v }) => (
                            <div key={l} className="text-center bg-card border border-border rounded-lg p-2">
                              <p className="font-bold font-mono text-foreground">{Number(v).toFixed(2)}</p>
                              <p className="text-muted-foreground">{l} {int.currency}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Ticket créé', date: t.created_at, color: 'bg-blue-400', icon: Plus },
                    ...(t.scheduled_at ? [{ label: 'Intervention planifiée', date: t.scheduled_at, color: 'bg-purple-400', icon: Clock }] : []),
                    ...(t.resolved_at ? [{ label: 'Ticket résolu', date: t.resolved_at, color: 'bg-emerald-400', icon: CheckCircle2 }] : []),
                    ...(t.updated_at !== t.created_at ? [{ label: 'Dernière mise à jour', date: t.updated_at, color: 'bg-slate-400', icon: Edit }] : []),
                  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(({ label, date, color, icon: Icon }) => (
                    <div key={label + date} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', color)}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <div className="w-px flex-1 bg-border mt-1 min-h-4" />
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(date).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                          {' · '}
                          {new Date(date).toLocaleTimeString('fr-CA', { timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Version info */}
                <div className="bg-secondary/20 border border-border rounded-xl p-4 mt-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>Version: <span className="font-mono text-foreground">{t.version}</span></span>
                    <span>ID: <span className="font-mono text-foreground">{t.id.slice(0, 8)}…</span></span>
                    <span>Catégorie: <span className="text-foreground">{CATEGORY_LABELS[t.category] ?? t.category}</span></span>
                    {t.requires_approval && <span className="text-amber-400">Approbation requise (ADR-020)</span>}
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-400/80">
                    <span className="font-semibold text-blue-400">ADR-014 ·</span> Machine d'état append-only.
                    Transitions: open → assigned → in_progress → resolved → closed.
                    Interventions avec coûts pièces/main d'œuvre reliées au ticket.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MaintenanceDetailPage;
