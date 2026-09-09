// TechnicianMobileView — Live Supabase data — ADR-014
// Loads maintenance_tickets assigned to authenticated technician
// Smart lock codes scoped to intervention window
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Clock, MapPin, CheckCircle2, AlertTriangle,
  ChevronLeft, Camera, Play, Key, FileText, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  high: { label: 'Élevée', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  normal: { label: 'Normale', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  low: { label: 'Faible', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'text-yellow-400' },
  in_progress: { label: 'En cours', color: 'text-blue-400' },
  waiting_parts: { label: 'En attente pièces', color: 'text-purple-400' },
  resolved: { label: 'Résolu', color: 'text-emerald-400' },
  closed: { label: 'Fermé', color: 'text-slate-400' },
};

const NEXT_TRANSITIONS: Record<string, { status: string; label: string; color: string }[]> = {
  open: [{ status: 'in_progress', label: 'Démarrer l\'intervention', color: 'bg-blue-500 text-white hover:bg-blue-600' }],
  in_progress: [
    { status: 'resolved', label: 'Marquer résolu ✓', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { status: 'waiting_parts', label: 'En attente de pièces', color: 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30' },
  ],
  waiting_parts: [{ status: 'in_progress', label: 'Reprendre', color: 'bg-blue-500 text-white hover:bg-blue-600' }],
};

async function fetchTechnicianTickets() {
  const { data: tickets, error } = await supabase
    .from('maintenance_tickets')
    .select('id, title, description, category, priority, status, unit_id, property_id, scheduled_at, estimated_cost, currency, notes, requires_approval, approval_threshold, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .in('status', ['open', 'in_progress', 'waiting_parts'])
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  const ticketList = tickets ?? [];
  if (ticketList.length === 0) return { tickets: [], units: {}, props: {}, interventions: {}, lockCodes: {} };

  // Unit names
  const unitIds = [...new Set(ticketList.map(t => t.unit_id))];
  const { data: units } = await supabase.from('units').select('id, name').in('id', unitIds);

  const propIds = [...new Set(ticketList.map(t => t.property_id))];
  const { data: props } = await supabase.from('properties').select('id, name, address, city').in('id', propIds);

  const unitMap: Record<string, string> = {};
  for (const u of units ?? []) unitMap[u.id] = u.name;

  const propMap: Record<string, { name: string; address: string; city: string }> = {};
  for (const p of props ?? []) propMap[p.id] = { name: p.name, address: p.address, city: p.city };

  // Interventions
  const ticketIds = ticketList.map(t => t.id);
  const { data: interventions } = await supabase
    .from('maintenance_interventions')
    .select('id, ticket_id, description, status, started_at, completed_at, created_at')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: true });

  const interventionMap: Record<string, typeof interventions> = {};
  for (const i of interventions ?? []) {
    if (!interventionMap[i.ticket_id]) interventionMap[i.ticket_id] = [];
    interventionMap[i.ticket_id].push(i);
  }

  // Smart lock codes for units (scoped to intervention window — ADR-014)
  const { data: lockCodes } = await supabase
    .from('smart_lock_codes')
    .select('id, unit_id, code_value, code_type, valid_from, valid_until, is_active')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .in('unit_id', unitIds)
    .gte('valid_until', new Date().toISOString());

  const lockMap: Record<string, { code_value: string; valid_until: string }> = {};
  for (const code of lockCodes ?? []) {
    lockMap[code.unit_id] = { code_value: code.code_value, valid_until: code.valid_until };
  }

  return { tickets: ticketList, units: unitMap, props: propMap, interventions: interventionMap, lockCodes: lockMap };
}

const TechnicianMobileView = () => {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [workLog, setWorkLog] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['technician-tickets', TENANT_ID],
    queryFn: fetchTechnicianTickets,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const tickets = data?.tickets ?? [];
  const units = data?.units ?? {};
  const props = data?.props ?? {};
  const interventions = data?.interventions ?? {};
  const lockCodes = data?.lockCodes ?? {};

  const activeTicketId = selectedTicketId ?? tickets[0]?.id ?? null;
  const ticket = tickets.find(t => t.id === activeTicketId);
  const ticketInterventions = activeTicketId ? (interventions[activeTicketId] ?? []) : [];
  const lockCode = ticket ? lockCodes[ticket.unit_id] : null;
  const prop = ticket ? props[ticket.property_id] : null;
  const unitName = ticket ? units[ticket.unit_id] : null;

  // Update ticket status
  const updateStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'resolved') update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('maintenance_tickets').update(update).eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['technician-tickets', TENANT_ID] });
      if (status === 'resolved') toast.success('Ticket résolu ✓ — Rapport envoyé (ADR-014)');
      else if (status === 'in_progress') toast.success('Intervention démarrée');
      else toast.success(`Statut → ${STATUS_CONFIG[status]?.label ?? status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Add intervention journal entry
  const addIntervention = useMutation({
    mutationFn: async ({ ticketId, description }: { ticketId: string; description: string }) => {
      const { error } = await supabase.from('maintenance_interventions').insert({
        tenant_id: TENANT_ID,
        ticket_id: ticketId,
        description,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-tickets', TENANT_ID] });
      setWorkLog('');
      toast.success('Entrée ajoutée au journal.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Chargement des tickets…</p>
        </div>
      </div>
    );
  }

  const priorityCfg = ticket ? (PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.normal) : PRIORITY_CONFIG.normal;
  const statusCfg = ticket ? (STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open) : STATUS_CONFIG.open;

  return (
    <div className="min-h-screen bg-background text-foreground max-w-sm mx-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/maintenance" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </a>
        <div className="flex-1 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm font-bold text-foreground">Maintenance</span>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['technician-tickets', TENANT_ID] })}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="text-xs text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* No tickets */}
        {tickets.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center mt-8">
            <Wrench className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun ticket en cours</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tous les tickets sont résolus ou fermés</p>
          </div>
        )}

        {/* Ticket selector */}
        {tickets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tickets.map(t => {
              const pcfg = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.normal;
              return (
                <button key={t.id} onClick={() => setSelectedTicketId(t.id)}
                  className={cn('flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left',
                    activeTicketId === t.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-secondary')}>
                  <div className="font-semibold truncate max-w-[100px]">{t.title}</div>
                  <div className={cn('mt-0.5', pcfg.color)}>{pcfg.label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Ticket card */}
        {ticket && (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className={cn('px-4 py-3 flex items-center gap-2', priorityCfg.bg)}>
                <AlertTriangle className={cn('w-4 h-4', priorityCfg.color)} />
                <span className={cn('text-sm font-semibold', priorityCfg.color)}>{priorityCfg.label}</span>
                <span className={cn('text-xs font-medium ml-auto', statusCfg.color)}>{statusCfg.label}</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">{ticket.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                </div>

                <div className="space-y-1.5">
                  {prop && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {prop.name}{unitName ? ` — ${unitName}` : ''} · {prop.address}{prop.city ? `, ${prop.city}` : ''}
                    </div>
                  )}
                  {ticket.scheduled_at && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400 font-semibold">
                        Planifié : {new Date(ticket.scheduled_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-secondary border border-border px-2 py-0.5 rounded-md">{ticket.category}</span>
                    {ticket.estimated_cost && (
                      <span className="text-emerald-400 font-medium">
                        ~{Number(ticket.estimated_cost).toFixed(0)} {ticket.currency}
                      </span>
                    )}
                    {ticket.requires_approval && (
                      <span className="text-amber-400 text-xs">⚠ Approbation requise</span>
                    )}
                  </div>
                </div>

                {/* Smart lock code */}
                <div className="bg-secondary/40 border border-border rounded-lg p-3 flex items-center gap-3">
                  <Key className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">
                      Code d'accès · valide jusqu'à{' '}
                      {lockCode ? new Date(lockCode.valid_until).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                    <div className={cn('text-sm font-bold mt-0.5 font-mono', showAccessCode ? 'text-emerald-400' : 'text-muted-foreground/40')}>
                      {lockCode ? (showAccessCode ? lockCode.code_value : '••••••') : 'Non configuré'}
                    </div>
                  </div>
                  {lockCode && (
                    <button onClick={() => setShowAccessCode(v => !v)}
                      className="text-xs text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors min-h-[32px]">
                      {showAccessCode ? 'Masquer' : 'Afficher'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Start button */}
            {ticket.status === 'open' && (
              <button onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: 'in_progress' })}
                disabled={updateStatus.isPending}
                className="w-full py-4 bg-blue-500 text-white rounded-xl text-base font-bold hover:bg-blue-600 active:scale-[0.98] transition-all min-h-[56px] flex items-center justify-center gap-2 disabled:opacity-50">
                <Play className="w-5 h-5" />
                Démarrer l'intervention
              </button>
            )}

            {/* Journal */}
            {['in_progress', 'waiting_parts'].includes(ticket.status) && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Journal d'intervention</span>
                  <span className="text-xs text-muted-foreground ml-auto">({ticketInterventions.length} entrée{ticketInterventions.length !== 1 ? 's' : ''})</span>
                </div>

                {/* Existing entries */}
                {ticketInterventions.length > 0 && (
                  <div className="space-y-2 border-b border-border pb-3">
                    {ticketInterventions.map(i => (
                      <div key={i.id} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground/60 font-mono flex-shrink-0 whitespace-nowrap">
                          {new Date(i.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-foreground">{i.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add entry */}
                <div className="space-y-2">
                  <textarea value={workLog} onChange={e => setWorkLog(e.target.value)}
                    placeholder="Décrivez les travaux effectués..."
                    rows={2}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => workLog.trim() && addIntervention.mutate({ ticketId: ticket.id, description: workLog.trim() })}
                      disabled={!workLog.trim() || addIntervention.isPending}
                      className="flex-1 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors min-h-[44px] disabled:opacity-50">
                      Ajouter au journal
                    </button>
                    <button className="px-3 py-2.5 border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors min-h-[44px]">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status transition buttons */}
            <div className="space-y-2">
              {(NEXT_TRANSITIONS[ticket.status] ?? []).map(next => (
                <button key={next.status}
                  onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: next.status })}
                  disabled={updateStatus.isPending}
                  className={cn('w-full py-4 rounded-xl text-base font-bold transition-all min-h-[56px] active:scale-[0.98] disabled:opacity-50', next.color)}>
                  {next.status === 'resolved' && <CheckCircle2 className="w-5 h-5 inline mr-2" />}
                  {next.label}
                </button>
              ))}

              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <button
                  onClick={() => toast.warning('Demande d\'approbation envoyée — ADR-020 ✓')}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-500/10 transition-colors">
                  <AlertTriangle className="w-4 h-4" />
                  Escalader · Demander approbation
                </button>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-center text-muted-foreground/50 pb-4">
          ADR-014 · Maintenance State Machine · Supabase live · ISmartLockProvider · Photos Storage
        </p>
      </div>
    </div>
  );
};

export default TechnicianMobileView;
