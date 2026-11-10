// UnitDetailPage — Live Supabase data — ADR-009 / ADR-013 / ADR-014
// Charge unit/:id avec property, reservations, HK jobs, rate_plans, smart_lock_codes
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Chrome as Home, BedDouble, Users, DollarSign, Calendar, BookOpen, Sparkles, Lock, TrendingUp, CircleCheck as CheckCircle2, Clock, Hash, Layers, CreditCard as Edit, Plus } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const UNIT_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement', studio: 'Studio', chalet: 'Chalet',
  villa: 'Villa', house: 'Maison', room: 'Chambre', other: 'Autre',
};

const STATUS_STYLE: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const RES_STATUS_COLOR: Record<string, string> = {
  confirmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  checked_in:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checked_out: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  inquiry:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cancelled:   'bg-red-500/10 text-red-400 border-red-500/20',
};

const RES_STATUS_LABELS: Record<string, string> = {
  inquiry: 'Demande', pending: 'En attente', confirmed: 'Confirmée',
  checked_in: 'Arrivé', checked_out: 'Parti', cancelled: 'Annulée',
};

const HK_STATUS_COLOR: Record<string, string> = {
  pending:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  done:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled:   'bg-red-500/10 text-red-400 border-red-500/20',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-400', high: 'text-orange-400', normal: 'text-yellow-400', low: 'text-slate-400',
};

type TabId = 'reservations' | 'housekeeping' | 'rates' | 'locks';

async function fetchUnitDetail(id: string, tenantId: string) {
  const { data: unit, error } = await supabase
    .from('units')
    .select('id, name, unit_type, property_id, bedrooms, bathrooms, max_guests, base_rate, cleaning_fee, currency, status, floor, area_sqm, smart_lock_id, version, created_at, updated_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;

  const [propRes, resRes, hkRes, ratePlanRes, lockRes] = await Promise.all([
    supabase.from('properties')
      .select('id, name, city, country, owner_id')
      .eq('id', unit.property_id)
      .single(),
    supabase.from('reservations')
      .select('id, status, channel, check_in, check_out, nights, guest_first_name, guest_last_name, total_amount, currency, guests_count')
      .eq('unit_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('check_in', { ascending: false })
      .limit(20),
    supabase.from('housekeeping_jobs')
      .select('id, job_type, status, scheduled_date, priority, notes, assigned_to')
      .eq('unit_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .limit(15),
    supabase.from('rate_plans')
      .select('id, name, rate_type, base_rate, min_stay, start_date, end_date, is_active, days_of_week')
      .eq('unit_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('smart_lock_codes')
      .select('id, code_type, code_value, is_active, valid_from, valid_until, provider')
      .eq('unit_id', id)
      .eq('tenant_id', tenantId)
      .order('valid_from', { ascending: false })
      .limit(20),
  ]);

  const reservations = resRes.data ?? [];
  const hkJobs = hkRes.data ?? [];
  const ratePlans = ratePlanRes.data ?? [];
  const lockCodes = lockRes.data ?? [];
  const property = propRes.data;

  const confirmedRes = reservations.filter(r => ['confirmed', 'checked_in', 'checked_out'].includes(r.status));
  const totalRevenue = confirmedRes.reduce((s, r) => s + Number(r.total_amount), 0);
  const activeJobs = hkJobs.filter(j => ['pending', 'assigned', 'in_progress'].includes(j.status)).length;
  const activeRates = ratePlans.filter(p => p.is_active).length;
  const activeCodes = lockCodes.filter(c => c.is_active).length;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const occupiedDays = new Set<string>();
  for (const r of reservations) {
    if (!['confirmed', 'checked_in', 'checked_out'].includes(r.status)) continue;
    if (!r.check_in || !r.check_out) continue;
    const checkIn = new Date(r.check_in);
    const checkOut = new Date(r.check_out);
    const start = checkIn < thirtyDaysAgo ? thirtyDaysAgo : checkIn;
    const end = checkOut > now ? now : checkOut;
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      occupiedDays.add(d.toISOString().slice(0, 10));
    }
  }
  const occupancyRate = Math.round((occupiedDays.size / 30) * 100);

  return {
    unit, property, reservations, hkJobs, ratePlans, lockCodes,
    kpi: { totalRevenue, activeJobs, activeRates, activeCodes, occupancyRate, totalReservations: reservations.length },
  };
}

const UnitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('reservations');
  const [showAddCode, setShowAddCode] = useState(false);
  const [newCode, setNewCode] = useState({ type: 'guest', value: '', days: 30 });
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  const toggleReveal = (codeId: string) =>
    setRevealedCodes(prev => { const n = new Set(prev); n.has(codeId) ? n.delete(codeId) : n.add(codeId); return n; });

  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  const addLockCode = useMutation({
    mutationFn: async (payload: { unit_id: string; code_type: string; code_value: string; days: number }) => {
      const now = new Date();
      const until = new Date(now.getTime() + payload.days * 86400_000);
      const { error } = await supabase.from('smart_lock_codes').insert({
        tenant_id: tenantId, unit_id: payload.unit_id,
        code_type: payload.code_type, code_value: payload.code_value,
        is_active: true, valid_from: now.toISOString(), valid_until: until.toISOString(), provider: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-detail', id] });
      toast.success("Code d'accès ajouté ✓");
      setNewCode({ type: 'guest', value: '', days: 30 });
      setShowAddCode(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateCode = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase.from('smart_lock_codes')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('id', codeId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['unit-detail', id] }); toast.success('Code désactivé ✓'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data, isPending } = useQuery({
    queryKey: ['unit-detail', id, tenantId],
    queryFn: () => fetchUnitDetail(id!, tenantId),
    enabled: !!id,
    staleTime: 60_000,
  });

  if (isPending) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.unit) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Unité introuvable</p>
          <button onClick={() => navigate('/properties')} className="text-primary text-sm hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const { unit: u, property, reservations, hkJobs, ratePlans, lockCodes, kpi } = data;

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'reservations', label: 'Réservations', count: reservations.length },
    { id: 'housekeeping', label: 'Ménage',       count: kpi.activeJobs > 0 ? kpi.activeJobs : undefined },
    { id: 'rates',        label: 'Tarifs',        count: ratePlans.length },
    { id: 'locks',        label: 'Accès',         count: kpi.activeCodes > 0 ? kpi.activeCodes : undefined },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/properties')} className="hover:text-foreground">Propriétés</button>
          {property && (<><span>/</span><button onClick={() => navigate(`/properties/${property.id}`)} className="hover:text-foreground">{property.name}</button></>)}
          <span>/</span>
          <span className="text-foreground">{u.name}</span>
        </div>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Home className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">{u.name}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_STYLE[u.status] ?? '')}>{u.status}</span>
                <span className="text-xs bg-secondary border border-border text-muted-foreground px-2.5 py-1 rounded-full">
                  {UNIT_TYPE_LABELS[u.unit_type] ?? u.unit_type}
                </span>
              </div>
              {property && (
                <p className="text-sm text-muted-foreground">
                  <button onClick={() => navigate(`/properties/${property.id}`)} className="text-primary hover:underline">{property.name}</button>
                  {property.city && ` · ${property.city}, ${property.country}`}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => navigate(`/units/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]">
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
              <button onClick={() => navigate(`/units/${id}/calendar`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Calendrier
              </button>
              <button onClick={() => navigate('/reservations/new')}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]">
                <Plus className="w-3.5 h-3.5" /> Réservation
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Taux occup. (30j)', value: `${kpi.occupancyRate}%`, color: kpi.occupancyRate >= 70 ? 'text-emerald-400' : kpi.occupancyRate >= 40 ? 'text-yellow-400' : 'text-red-400', icon: TrendingUp },
            { label: 'Réservations',      value: kpi.totalReservations,   color: 'text-blue-400',    icon: BookOpen },
            { label: 'Revenus confirmés', value: `${kpi.totalRevenue.toFixed(0)} ${u.currency}`, color: 'text-emerald-400', icon: DollarSign },
            { label: 'Jobs ménage actifs',value: kpi.activeJobs,          color: kpi.activeJobs > 0 ? 'text-orange-400' : 'text-slate-400', icon: Sparkles },
            { label: 'Codes actifs',      value: kpi.activeCodes,         color: 'text-cyan-400',    icon: Lock },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
              <div className="min-w-0">
                <p className={cn('text-lg font-bold truncate', color)}>{value}</p>
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Chambres',       value: u.bedrooms,   icon: BedDouble },
            { label: 'Salles de bain', value: u.bathrooms,  icon: Home },
            { label: 'Max voyageurs',  value: u.max_guests, icon: Users },
            { label: 'Surface',        value: u.area_sqm ? `${u.area_sqm} m²` : '—', icon: Hash },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div><p className="text-sm font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tarification de base</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold font-mono text-emerald-400">{Number(u.base_rate).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{u.currency} / nuit</p>
            </div>
            <div>
              <p className="text-xl font-bold font-mono text-blue-400">{Number(u.cleaning_fee).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{u.currency} ménage</p>
            </div>
            <div>
              <p className="text-xl font-bold font-mono text-purple-400">{(Number(u.base_rate) * 7 + Number(u.cleaning_fee)).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">{u.currency} / semaine est.</p>
            </div>
          </div>
          {u.floor != null && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5" /> Étage {u.floor}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center border-b border-border px-1 pt-1 gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap',
                  activeTab === tab.id ? 'text-primary border-primary bg-primary/5' : 'text-muted-foreground border-transparent hover:text-foreground')}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full', activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── Reservations ── */}
            {activeTab === 'reservations' && (
              reservations.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune réservation pour cette unité</p>
                  <button onClick={() => navigate('/reservations/new')} className="text-xs text-primary mt-2 hover:underline">Créer une réservation →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map(r => (
                    <button key={r.id} onClick={() => navigate(`/reservations/${r.id}`)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/20 border border-border hover:border-primary/30 text-left transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{r.guest_first_name} {r.guest_last_name}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', RES_STATUS_COLOR[r.status] ?? '')}>
                            {RES_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.check_in} → {r.check_out}{r.guests_count && ` · ${r.guests_count} voyageur${r.guests_count > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-sm text-emerald-400 flex-shrink-0">
                        {Number(r.total_amount).toFixed(0)} {r.currency}
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* ── Housekeeping ── */}
            {activeTab === 'housekeeping' && (
              hkJobs.length === 0 ? (
                <div className="text-center py-10">
                  <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun job de ménage</p>
                  <button onClick={() => navigate('/housekeeping/new')} className="text-xs text-primary mt-2 hover:underline">Créer un job →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {hkJobs.map(job => (
                    <button key={job.id} onClick={() => navigate(`/housekeeping/${job.id}`)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/20 border border-border hover:border-primary/30 text-left transition-all">
                      <Sparkles className={cn('w-4 h-4 flex-shrink-0', PRIORITY_COLOR[job.priority] ?? 'text-muted-foreground')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground capitalize">{job.job_type.replace(/_/g, ' ')}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', HK_STATUS_COLOR[job.status] ?? '')}>{job.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.scheduled_date}</p>
                      </div>
                      <span className={cn('text-xs font-medium flex-shrink-0', PRIORITY_COLOR[job.priority] ?? 'text-muted-foreground')}>{job.priority}</span>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* ── Rate Plans ── */}
            {activeTab === 'rates' && (
              ratePlans.length === 0 ? (
                <div className="text-center py-10">
                  <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun plan tarifaire configuré</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Le tarif de base s'applique par défaut</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratePlans.map(plan => (
                    <div key={plan.id} className={cn('p-4 rounded-xl border', plan.is_active ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-secondary/20')}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{plan.rate_type.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-slate-400" />}
                          <span className="text-sm font-bold font-mono text-emerald-400">{Number(plan.base_rate).toFixed(2)} {u.currency}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {plan.min_stay > 1 && <span>Min {plan.min_stay} nuits</span>}
                        {plan.start_date && <span>Du {plan.start_date}</span>}
                        {plan.end_date && <span>Au {plan.end_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── Smart Lock Codes ── */}
            {activeTab === 'locks' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {u.smart_lock_id && (
                    <div className="flex items-center gap-2 p-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                      <Lock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="text-xs text-cyan-400 font-mono">Lock: {u.smart_lock_id}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowAddCode(v => !v)}
                    className="ml-auto flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors min-h-[36px]">
                    <Plus className="w-3.5 h-3.5" /> Nouveau code
                  </button>
                </div>

                {showAddCode && (
                  <div className="bg-secondary/30 border border-border rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground">Nouveau code d'accès</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                        <select value={newCode.type} onChange={e => setNewCode(v => ({ ...v, type: e.target.value }))}
                          className="w-full bg-secondary border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                          {['guest','cleaner','technician','owner','master'].map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Code PIN (4-8 chiffres)</label>
                        <input type="text" maxLength={8} placeholder="4827"
                          value={newCode.value}
                          onChange={e => setNewCode(v => ({ ...v, value: e.target.value.replace(/\D/g, '') }))}
                          className="w-full bg-secondary border border-border rounded-lg px-2.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Validité (jours)</label>
                        <input type="number" min={1} max={365}
                          value={newCode.days}
                          onChange={e => setNewCode(v => ({ ...v, days: Number(e.target.value) }))}
                          className="w-full bg-secondary border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!newCode.value || newCode.value.length < 4) { toast.error('Code PIN minimum 4 chiffres'); return; }
                          addLockCode.mutate({ unit_id: id!, code_type: newCode.type, code_value: newCode.value, days: newCode.days });
                        }}
                        disabled={addLockCode.isPending}
                        className="flex-1 text-xs bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px] font-medium disabled:opacity-50">
                        {addLockCode.isPending ? 'Ajout...' : 'Ajouter le code'}
                      </button>
                      <button onClick={() => setShowAddCode(false)}
                        className="px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors min-h-[36px]">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {lockCodes.length === 0 && !showAddCode ? (
                  <div className="text-center py-10">
                    <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun code d'accès configuré</p>
                    <button onClick={() => setShowAddCode(true)} className="text-xs text-primary mt-2 hover:underline">+ Ajouter un code →</button>
                  </div>
                ) : lockCodes.map(code => {
                  const validFrom = new Date(code.valid_from);
                  const validUntil = new Date(code.valid_until);
                  const now2 = new Date();
                  const isCurrentlyValid = code.is_active && validFrom <= now2 && validUntil >= now2;
                  const isRevealed = revealedCodes.has(code.id);
                  return (
                    <div key={code.id} className={cn('p-4 rounded-xl border', isCurrentlyValid ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-secondary/20')}>
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <Lock className={cn('w-4 h-4', isCurrentlyValid ? 'text-emerald-400' : 'text-muted-foreground')} />
                          <div>
                            <p className="text-sm font-mono font-bold text-foreground">
                              {isRevealed ? code.code_value : code.code_value.replace(/./g, '●')}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{code.code_type} · {code.provider}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium',
                            isCurrentlyValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20')}>
                            {isCurrentlyValid ? 'Valide' : code.is_active ? 'Expiré' : 'Inactif'}
                          </span>
                          <button onClick={() => toggleReveal(code.id)}
                            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 min-h-[30px] transition-colors">
                            {isRevealed ? 'Masquer' : 'Révéler'}
                          </button>
                          {code.is_active && (
                            <button onClick={() => deactivateCode.mutate(code.id)} disabled={deactivateCode.isPending}
                              className="text-xs text-red-400 border border-red-500/20 rounded-lg px-2 py-1 min-h-[30px] bg-red-500/5 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                              Désactiver
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Valide: {validFrom.toLocaleDateString('fr-CA')} → {validUntil.toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default UnitDetailPage;
