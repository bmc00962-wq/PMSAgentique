// Dashboard — Live Supabase data — ADR-002, ADR-008, ADR-021
// KPIs: reservations, properties, housekeeping jobs, revenue, occupancy
// Panneau alertes: check-in aujourd'hui, approbations urgentes, HK en retard

import {
  Building2, BookOpen, Sparkles, DollarSign,
  Plus, CalendarDays, Users, BarChart2,
  ArrowRight, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  Wrench, Car, ClipboardCheck, Bell, LogIn,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AppLayout from "@/components/layout/AppLayout";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/features/LoadingSpinner";
import { cn } from "@/lib/utils";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

// ── Revenue chart helpers ────────────────────────────────────────────────────
function getLast6MonthsLabels(): { key: string; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' }),
    });
  }
  return months;
}

async function fetchOccupancyRate(unitCount: number) {
  if (unitCount === 0) return 0;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const { data: res } = await supabase
    .from('reservations')
    .select('unit_id, check_in, check_out, status')
    .eq('tenant_id', TENANT_ID)
    .in('status', ['confirmed', 'checked_in', 'checked_out'])
    .gte('check_out', thirtyDaysAgo.toISOString().slice(0, 10))
    .lte('check_in', now.toISOString().slice(0, 10));

  if (!res) return 0;
  const occupiedDays = new Set<string>();
  for (const r of res) {
    if (!r.check_in || !r.check_out) continue;
    const ci = new Date(r.check_in);
    const co = new Date(r.check_out);
    const start = ci < thirtyDaysAgo ? thirtyDaysAgo : ci;
    const end = co > now ? now : co;
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      occupiedDays.add(`${r.unit_id}_${d.toISOString().slice(0, 10)}`);
    }
  }
  return Math.round((occupiedDays.size / (unitCount * 30)) * 100);
}

async function fetchDashboardStats() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [resResult, propsResult, hkResult, ledgerResult, maintenanceResult, tripsResult, approvalsResult] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("id, status, total_amount, check_in, check_out, guest_first_name, guest_last_name, created_at, channel, unit_id")
        .eq("tenant_id", TENANT_ID)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("properties")
        .select("id, name, city, country, status")
        .eq("tenant_id", TENANT_ID)
        .is("deleted_at", null)
        .eq("status", "active"),
      supabase
        .from("housekeeping_jobs")
        .select("id, status, job_type, scheduled_date, priority, unit_id")
        .eq("tenant_id", TENANT_ID)
        .is("deleted_at", null)
        .in("status", ["pending", "assigned", "in_progress"])
        .order("scheduled_date", { ascending: true })
        .limit(5),
      supabase
        .from("ledger_entries")
        .select("amount, direction, entry_type")
        .eq("tenant_id", TENANT_ID),
      supabase
        .from("maintenance_tickets")
        .select("id, title, priority, status, category")
        .eq("tenant_id", TENANT_ID)
        .is("deleted_at", null)
        .in("status", ["open", "assigned", "in_progress"])
        .limit(3),
      supabase
        .from("transport_trips")
        .select("id, trip_type, status, scheduled_at, pickup_location, dropoff_location")
        .eq("tenant_id", TENANT_ID)
        .is("deleted_at", null)
        .in("status", ["pending", "assigned", "en_route"])
        .order("scheduled_at", { ascending: true })
        .limit(3),
      // Pending approvals (urgent alerts)
      supabase
        .from("approval_requests")
        .select("id, title, priority, status, deadline, scenario")
        .eq("tenant_id", TENANT_ID)
        .eq("status", "pending")
        .order("deadline", { ascending: true })
        .limit(5),
    ]);

  const reservations = resResult.data || [];
  const properties = propsResult.data || [];
  const hkJobs = hkResult.data || [];
  const ledger = ledgerResult.data || [];
  const tickets = maintenanceResult.data || [];
  const trips = tripsResult.data || [];
  const pendingApprovals = approvalsResult.data || [];

  // Units
  const { data: unitsData } = await supabase
    .from('units')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'active')
    .is('deleted_at', null);
  const unitCount = unitsData?.length ?? 0;
  const occupancyRate = await fetchOccupancyRate(unitCount);

  // Check-ins today
  const checkInsToday = reservations.filter(
    r => r.check_in === todayStr && ['confirmed', 'checked_in'].includes(r.status)
  );

  // Check-outs today
  const checkOutsToday = reservations.filter(
    r => r.check_out === todayStr && r.status === 'confirmed'
  );

  // Overdue HK jobs (scheduled_date < today)
  const overdueHK = hkJobs.filter(j => j.scheduled_date < todayStr);

  // Month revenue
  const monthRevenue = ledger
    .filter(e => e.direction === "credit")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Active reservations
  const activeRes = reservations.filter(
    r => r.status === "confirmed" || r.status === "checked_in"
  );

  const thisMonthRes = reservations.filter(
    r => r.created_at >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  );

  const statusCount: Record<string, number> = {};
  for (const r of reservations) {
    statusCount[r.status] = (statusCount[r.status] || 0) + 1;
  }

  // Revenue chart (last 6 months)
  const months = getLast6MonthsLabels();
  const revenueChartData = months.map(({ key, label }) => {
    const monthRevTotal = reservations
      .filter(r => {
        if (!r.created_at) return false;
        const rMonth = r.created_at.slice(0, 7);
        return rMonth === key && ['confirmed', 'checked_in', 'checked_out'].includes(r.status);
      })
      .reduce((sum, r) => sum + Number(r.total_amount), 0);
    return { label, revenue: Math.round(monthRevTotal) };
  });

  return {
    reservations, thisMonthRes, properties, hkJobs, ledger, monthRevenue,
    statusCount, activeRes, tickets, trips, revenueChartData, occupancyRate,
    unitCount, pendingApprovals, checkInsToday, checkOutsToday, overdueHK,
  };
}

const statusColor: Record<string, string> = {
  confirmed:   'bg-success-soft text-success border-success-border',
  checked_in:  'bg-info-soft text-info border-info-border',
  checked_out: 'bg-secondary text-muted-foreground border-border',
  pending:     'bg-warning-soft text-warning border-warning-border',
  inquiry:     'bg-accent text-primary border-primary/20',
  cancelled:   'bg-danger-soft text-danger border-danger-border',
  no_show:     'bg-danger-soft text-danger border-danger-border',
};

const priorityColor: Record<string, string> = {
  urgent: 'text-danger', high: 'text-warning', normal: 'text-muted-foreground', low: 'text-muted-foreground',
};

const channelLabel: Record<string, string> = {
  airbnb: "Airbnb", booking: "Booking.com", vrbo: "Vrbo",
  ical: "iCal", direct: "Direct", manual: "Manuel",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, membership } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats", TENANT_ID],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (error) console.error("[Dashboard] fetch error:", error);

  // ── Alert items ────────────────────────────────────────────────────────────
  const alerts: { id: string; type: 'checkin' | 'checkout' | 'approval' | 'hk' | 'maintenance'; label: string; sub: string; color: string; path: string }[] = [
    ...(data?.checkInsToday ?? []).map(r => ({
      id: r.id, type: 'checkin' as const,
      label: `Check-in: ${r.guest_first_name} ${r.guest_last_name}`,
      sub: `Arrivée aujourd'hui · ${channelLabel[r.channel ?? ''] ?? r.channel ?? ''}`,
      color: 'text-success bg-success/10 border-success/20',
      path: `/reservations/${r.id}`,
    })),
    ...(data?.checkOutsToday ?? []).map(r => ({
      id: r.id, type: 'checkout' as const,
      label: `Check-out: ${r.guest_first_name} ${r.guest_last_name}`,
      sub: `Départ attendu aujourd'hui`,
      color: 'text-info bg-info/10 border-info/20',
      path: `/reservations/${r.id}`,
    })),
    ...(data?.pendingApprovals ?? []).map(a => ({
      id: a.id, type: 'approval' as const,
      label: a.title.length > 55 ? a.title.slice(0, 55) + '…' : a.title,
      sub: `Approbation ${a.priority === 'high' || a.priority === 'urgent' ? '⚡ urgente' : 'en attente'} · ${a.scenario.replace(/_/g, ' ')}`,
      color: a.priority === 'high' || a.priority === 'urgent'
        ? 'text-danger bg-danger/10 border-danger/20'
        : 'text-warning bg-warning/10 border-warning/20',
      path: `/approvals/${a.id}`,
    })),
    ...(data?.overdueHK ?? []).map(j => ({
      id: j.id, type: 'hk' as const,
      label: `Ménage en retard — ${j.job_type.replace(/_/g, ' ')}`,
      sub: `Prévu le ${j.scheduled_date} · ${j.priority}`,
      color: 'text-warning bg-warning/10 border-warning/20',
      path: `/housekeeping/${j.id}`,
    })),
  ];

  const stats = [
    {
      label: "Propriétés actives", icon: Building2,
      value: String(data?.properties.length ?? 0), sub: "logements en gestion",
      color: 'text-primary', bg: 'bg-accent', border: 'border-border', path: '/properties',
    },
    {
      label: "Réservations actives", icon: BookOpen,
      value: String(data?.activeRes.length ?? 0), sub: `${data?.thisMonthRes.length ?? 0} ce mois`,
      color: 'text-primary', bg: 'bg-accent', border: 'border-border', path: '/reservations',
    },
    {
      label: "Jobs ménage en attente", icon: Sparkles,
      value: String(data?.hkJobs.length ?? 0), sub: "pending / assignés",
      color: 'text-primary', bg: 'bg-accent', border: 'border-border', path: '/housekeeping',
    },
    {
      label: "Revenus cumulés", icon: DollarSign,
      value: data?.monthRevenue
        ? `${data.monthRevenue.toLocaleString("fr-CA", { minimumFractionDigits: 2 })} $`
        : "0.00 $",
      sub: "total crédits ledger",
      color: 'text-primary', bg: 'bg-accent', border: 'border-border', path: '/finance',
    },
    {
      label: "Taux d'occupation (30j)", icon: TrendingUp,
      value: data?.occupancyRate !== undefined ? `${data.occupancyRate}%` : "—",
      sub: `${data?.unitCount ?? 0} unité${(data?.unitCount ?? 0) !== 1 ? 's' : ''} · 30 jours`,
      color: (data?.occupancyRate ?? 0) >= 70 ? "text-success" : (data?.occupancyRate ?? 0) >= 40 ? "text-warning" : "text-danger",
      bg: (data?.occupancyRate ?? 0) >= 70 ? "bg-success/10" : (data?.occupancyRate ?? 0) >= 40 ? "bg-warning/10" : "bg-danger/10",
      border: (data?.occupancyRate ?? 0) >= 70 ? "border-success/20" : (data?.occupancyRate ?? 0) >= 40 ? "border-warning/20" : "border-danger/20",
      path: "/reports",
    },
  ];

  const quickActions = [
    { label: "Nouvelle réservation", icon: Plus,         path: "/reservations/new", primary: true },
    { label: "Calendrier",           icon: CalendarDays,  path: "/calendar",         primary: false },
    { label: "Voyageurs",            icon: Users,         path: "/guests",           primary: false },
    { label: "Finance",              icon: BarChart2,     path: "/finance",          primary: false },
    { label: "Approbations",         icon: ClipboardCheck,path: "/approvals",        primary: false },
    { label: "Rapports",             icon: TrendingUp,    path: "/reports",          primary: false },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap rounded-2xl border border-primary/15 bg-accent/45 p-6 shadow-card">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {greeting}, {user?.full_name?.split(" ")[0] ?? user?.username ?? "…"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {membership?.role
              ? `${membership.role.replace(/_/g, " ")} · Gestion Soleil Inc.`
              : "Tableau de bord · Gestion Soleil Inc."}
          </p>
        </div>
        <span className="text-xs bg-success/10 text-success border border-success/20 px-3 py-1.5 rounded-full font-medium flex-shrink-0">
          Live · données réelles
        </span>
      </div>

      {/* ── Alerts panel ──────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Alertes du jour
            </h2>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium ml-auto">
              {alerts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alerts.slice(0, 6).map(alert => (
              <button
                key={alert.id}
                onClick={() => navigate(alert.path)}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-xl border text-left hover:opacity-80 transition-opacity',
                  alert.color,
                )}
              >
                {alert.type === 'checkin'  && <LogIn      className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {alert.type === 'checkout' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {alert.type === 'approval' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {alert.type === 'hk'       && <Sparkles    className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {alert.type === 'maintenance' && <Wrench   className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{alert.label}</p>
                  <p className="text-xs mt-0.5 truncate">{alert.sub}</p>
                </div>
              </button>
            ))}
          </div>
          {alerts.length > 6 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              + {alerts.length - 6} alerte{alerts.length - 6 > 1 ? 's' : ''} supplémentaire{alerts.length - 6 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── KPI Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {stats.map(({ label, icon: Icon, value, sub, color, bg, border, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className={cn('border rounded-xl p-4 flex items-start gap-3 text-left shadow-card transition-transform duration-200 hover:-translate-y-1', path === '/finance' ? 'bg-accent/45' : 'bg-card', border)}
          >
            <div className={cn('w-9 h-9 border rounded-lg flex items-center justify-center flex-shrink-0', bg, border)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div className="min-w-0">
              <div className={cn('text-2xl font-bold leading-none tracking-tight', color)}>{value}</div>
              <div className="text-xs text-foreground font-medium mt-1 truncate">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservations list */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Réservations récentes
            </h2>
            <button onClick={() => navigate("/reservations")} className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {!data?.reservations?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">Aucune réservation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.reservations.slice(0, 7).map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/reservations/${r.id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-secondary border border-border rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {r.guest_first_name} {r.guest_last_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.check_in ? `${r.check_in} → ${r.check_out}` : "Dates à confirmer"}
                      {r.channel && ` · ${channelLabel[r.channel] ?? r.channel}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.total_amount > 0 && (
                      <span className="text-xs font-mono text-success">
                        {Number(r.total_amount).toLocaleString("fr-CA", { minimumFractionDigits: 2 })} $
                      </span>
                    )}
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusColor[r.status] ?? "bg-secondary text-muted-foreground border-border")}>
                      {r.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions rapides</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, icon: Icon, path, primary }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]',
                    primary
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 col-span-2"
                      : "bg-secondary border border-border text-foreground hover:bg-secondary/80",
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pending approvals */}
          {data?.pendingApprovals && data.pendingApprovals.length > 0 && (
            <div className="bg-card border border-warning/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-2">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Approbations urgentes
                  <span className="text-xs bg-warning/20 border border-warning/30 px-1.5 py-0.5 rounded-full">
                    {data.pendingApprovals.length}
                  </span>
                </h2>
                <button onClick={() => navigate("/approvals")} className="text-xs text-primary hover:underline">Voir tout</button>
              </div>
              <div className="space-y-2">
                {data.pendingApprovals.slice(0, 3).map(a => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/approvals/${a.id}`)}
                    className="w-full flex items-start gap-2 text-left p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <AlertTriangle className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', priorityColor[a.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.deadline ? `Délai: ${new Date(a.deadline).toLocaleDateString('fr-CA')}` : 'Aucun délai'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Housekeeping jobs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Ménage à venir
              </h2>
              <button onClick={() => navigate("/housekeeping")} className="text-xs text-primary hover:underline">Voir tout</button>
            </div>
            {!data?.hkJobs?.length ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Aucun job en attente</p>
            ) : (
              <div className="space-y-2">
                {data.hkJobs.map(job => {
                  const isOverdue = job.scheduled_date < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={job.id} className={cn('flex items-center gap-2 text-xs', isOverdue && 'opacity-90')}>
                      <CheckCircle2 className={cn('w-3.5 h-3.5 flex-shrink-0',
                        job.status === "done" ? "text-success" : job.status === "in_progress" ? "text-info" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-foreground font-medium truncate', isOverdue && 'text-danger')}>
                          {job.job_type.replace(/_/g, " ")}
                          {isOverdue && ' ⚠'}
                        </div>
                        <div className="text-muted-foreground">{job.scheduled_date}</div>
                      </div>
                      <span className={cn('flex-shrink-0 font-medium', priorityColor[job.priority])}>{job.priority}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Maintenance tickets */}
          {data?.tickets && data.tickets.length > 0 && (
            <div className="bg-card border border-warning/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5" /> Maintenance ouverte
                </h2>
                <button onClick={() => navigate("/maintenance")} className="text-xs text-primary hover:underline">Voir tout</button>
              </div>
              <div className="space-y-2">
                {data.tickets.map(t => (
                  <button key={t.id} onClick={() => navigate(`/maintenance/${t.id}`)}
                    className="w-full flex items-center gap-2 text-xs text-left p-1.5 hover:bg-secondary/50 rounded-lg transition-colors">
                    <AlertTriangle className={cn('w-3.5 h-3.5 flex-shrink-0', priorityColor[t.priority])} />
                    <span className="flex-1 text-foreground truncate">{t.title}</span>
                    <span className="text-muted-foreground flex-shrink-0">{t.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transport trips */}
          {data?.trips && data.trips.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-3.5 h-3.5" /> Transport à venir
                </h2>
                <button onClick={() => navigate("/transport")} className="text-xs text-primary hover:underline">Voir tout</button>
              </div>
              <div className="space-y-2">
                {data.trips.map(trip => {
                  const dt = new Date(trip.scheduled_at);
                  const isToday = dt.toDateString() === new Date().toDateString();
                  return (
                    <button key={trip.id} onClick={() => navigate(`/transport/${trip.id}`)}
                      className="w-full flex items-center gap-2 text-xs text-left p-1.5 hover:bg-secondary/50 rounded-lg transition-colors">
                      <Car className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground font-medium capitalize truncate">{trip.trip_type}</div>
                        <div className="text-muted-foreground truncate">{trip.pickup_location}</div>
                      </div>
                      <span className={cn('flex-shrink-0 text-xs px-1.5 py-0.5 rounded border',
                        isToday ? 'bg-primary/10 text-primary border-primary/20' : 'bg-info/10 text-info border-info/20')}>
                        {isToday ? "Auj." : dt.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue chart */}
      {data?.revenueChartData && data.revenueChartData.some(d => d.revenue > 0) && (
        <div className="mt-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Revenus — 6 derniers mois (réservations confirmées)
            </h2>
            <button onClick={() => navigate('/finance')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Finance <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueChartData} barSize={28} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false} tickLine={false} width={40}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value.toLocaleString('fr-CA')} CAD`, 'Revenus']}
                  cursor={{ fill: 'hsl(var(--secondary))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Status summary */}
      {data?.statusCount && Object.keys(data.statusCount).length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Distribution statuts réservations
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.statusCount).map(([status, count]) => (
              <button
                key={status}
                onClick={() => navigate(`/reservations`)}
                className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium hover:opacity-80 transition-opacity', statusColor[status] ?? "bg-secondary text-muted-foreground border-border")}>
                <span className="capitalize">{status}</span>
                <span className="font-bold">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
