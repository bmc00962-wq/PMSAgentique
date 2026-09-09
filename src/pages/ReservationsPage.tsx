// ReservationsPage — Live Supabase data + Server-side pagination — ADR-010
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Search, Plus, Filter, CheckCircle2, Clock,
  LogIn, AlertTriangle, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Demande', pending: 'En attente', confirmed: 'Confirmée',
  checked_in: 'Arrivé', checked_out: 'Parti', cancelled: 'Annulée', no_show: 'Absent',
};

const CHANNEL_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo',
  ical: 'iCal', direct: 'Direct', manual: 'Manuel',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  checked_in:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  checked_out: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  pending:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  inquiry:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
  cancelled:   'bg-red-500/15 text-red-400 border-red-500/25',
  no_show:     'bg-red-500/15 text-red-400 border-red-500/25',
};

const ALL_STATUSES = ['inquiry','pending','confirmed','checked_in','checked_out','cancelled','no_show'];
const ALL_CHANNELS = ['airbnb','booking','vrbo','direct','manual'];

async function fetchReservationsPage(
  page: number,
  status: string,
  channel: string,
  search: string,
) {
  let query = supabase
    .from('reservations')
    .select('id, status, channel, check_in, check_out, guests_count, total_amount, currency, guest_first_name, guest_last_name, guest_email, created_at', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);

  if (status !== 'all') query = query.eq('status', status);
  if (channel !== 'all') query = query.eq('channel', channel);
  if (search.trim()) {
    query = query.or(
      `guest_first_name.ilike.%${search}%,guest_last_name.ilike.%${search}%,guest_email.ilike.%${search}%`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

async function fetchReservationStats() {
  const { data } = await supabase
    .from('reservations')
    .select('status')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);

  const arr = data ?? [];
  return {
    total: arr.length,
    confirmed: arr.filter(r => r.status === 'confirmed').length,
    pending: arr.filter(r => r.status === 'pending' || r.status === 'inquiry').length,
    checkedIn: arr.filter(r => r.status === 'checked_in').length,
  };
}

const ReservationsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [channelFilter, setChannel] = useState('all');
  const [page, setPage] = useState(0);

  // Reset page on filter change
  const handleStatus = (v: string) => { setStatus(v); setPage(0); };
  const handleChannel = (v: string) => { setChannel(v); setPage(0); };
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['reservations', TENANT_ID, page, statusFilter, channelFilter, search],
    queryFn: () => fetchReservationsPage(page, statusFilter, channelFilter, search),
    staleTime: 30_000,
    placeholderData: prev => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ['reservations-stats', TENANT_ID],
    queryFn: fetchReservationStats,
    staleTime: 60_000,
  });

  const reservations = pageData?.data ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExportCSV = async () => {
    // Export all (not just current page)
    const { data } = await supabase
      .from('reservations')
      .select('guest_first_name,guest_last_name,guest_email,status,channel,check_in,check_out,guests_count,total_amount,currency')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const headers = ['Prénom','Nom','Email','Statut','Canal','Check-in','Check-out','Voyageurs','Total','Devise'];
    const rows = (data ?? []).map(r => [
      r.guest_first_name ?? '', r.guest_last_name ?? '',
      r.guest_email ?? '', r.status, r.channel ?? '',
      r.check_in ?? '', r.check_out ?? '', r.guests_count,
      Number(r.total_amount).toFixed(2), r.currency,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'reservations.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-primary" />
              Réservations
              <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {stats?.total ?? '…'}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestion complète du cycle de vie des réservations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-secondary border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => navigate('/reservations/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Nouvelle réservation
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',      value: stats?.total ?? 0,      color: 'text-blue-400',    icon: BookOpen },
            { label: 'Confirmées', value: stats?.confirmed ?? 0,  color: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'En attente', value: stats?.pending ?? 0,    color: 'text-yellow-400',  icon: Clock },
            { label: 'Arrivés',    value: stats?.checkedIn ?? 0,  color: 'text-purple-400',  icon: LogIn },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />
              <div>
                <div className={cn('text-2xl font-bold', color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Voyageur, email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <select value={statusFilter} onChange={e => handleStatus(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]">
              <option value="all">Tous statuts</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select value={channelFilter} onChange={e => handleChannel(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]">
              <option value="all">Tous canaux</option>
              {ALL_CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
            </select>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {total} résultat{total !== 1 ? 's' : ''}
            {totalPages > 1 && ` · Page ${page + 1}/${totalPages}`}
          </span>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : reservations.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune réservation trouvée</p>
            <button onClick={() => { handleSearch(''); handleStatus('all'); handleChannel('all'); }}
              className="text-xs text-primary mt-2 hover:underline">Réinitialiser les filtres</button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {reservations.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/reservations/${r.id}`)}
                  className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-secondary/20 transition-colors text-left"
                >
                  <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {r.guest_first_name} {r.guest_last_name}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[r.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      {r.channel && (
                        <span className="text-xs bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full">
                          {CHANNEL_LABELS[r.channel] ?? r.channel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.check_in && r.check_out
                        ? `${r.check_in} → ${r.check_out} · ${r.guests_count} voyageur${r.guests_count > 1 ? 's' : ''}`
                        : 'Dates à confirmer'}
                      {r.guest_email && ` · ${r.guest_email}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.total_amount > 0 && (
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {Number(r.total_amount).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {r.currency}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                      {r.check_in ? new Date(r.check_in).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-2 text-xs border border-border rounded-xl px-4 py-2.5 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i;
                    } else if (page < 4) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 7 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'w-9 h-9 text-xs rounded-lg font-medium transition-colors',
                          pageNum === page
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-border',
                        )}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-2 text-xs border border-border rounded-xl px-4 py-2.5 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suivant <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Page info */}
            <p className="text-xs text-center text-muted-foreground/60">
              Affichage {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total} réservations
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ReservationsPage;
