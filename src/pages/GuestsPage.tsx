// GuestsPage — Live Supabase data — ADR-012
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Globe2, Mail, Phone, CalendarDays, Plus, Download } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const COUNTRY_LABELS: Record<string, string> = {
  CA: 'Canada', US: 'États-Unis', MA: 'Maroc',
  FR: 'France', GB: 'Royaume-Uni', DE: 'Allemagne',
};

async function fetchGuests() {
  const { data, error } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, phone, nationality, language, notes, total_stays, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const GuestsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [nationalityFilter, setNationality] = useState('all');

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', TENANT_ID],
    queryFn: fetchGuests,
    staleTime: 60_000,
  });

  const nationalities = [...new Set(guests.map(g => g.nationality).filter(Boolean))];

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(q);
    const matchNationality = nationalityFilter === 'all' || g.nationality === nationalityFilter;
    return matchSearch && matchNationality;
  });

  const stats = {
    total: guests.length,
    countries: nationalities.length,
    totalStays: guests.reduce((s, g) => s + (g.total_stays ?? 0), 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Users className="w-5 h-5 text-primary" />
              Voyageurs
              <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{stats.total}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestion des profils voyageurs et historique de séjours</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Nationalité', 'Langue', 'Séjours', 'Client depuis'];
                const rows = filtered.map(g => [
                  g.first_name, g.last_name, g.email ?? '', g.phone ?? '',
                  g.nationality ?? '', g.language ?? '', g.total_stays ?? 0,
                  new Date(g.created_at).toLocaleDateString('fr-CA'),
                ]);
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'voyageurs.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 bg-secondary border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => navigate('/guests/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Nouveau voyageur
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total voyageurs', value: stats.total, color: 'text-blue-400', icon: Users },
            { label: 'Nationalités', value: stats.countries, color: 'text-purple-400', icon: Globe2 },
            { label: 'Séjours cumulés', value: stats.totalStays, color: 'text-emerald-400', icon: CalendarDays },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom ou email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={nationalityFilter} onChange={e => setNationality(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]">
            <option value="all">Toutes nationalités</option>
            {nationalities.map(n => <option key={n} value={n}>{COUNTRY_LABELS[n ?? ''] ?? n}</option>)}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun voyageur trouvé</p>
            <button onClick={() => { setSearch(''); setNationality('all'); }}
              className="text-xs text-primary mt-2 hover:underline">Réinitialiser</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(g => (
              <button
                key={g.id}
                onClick={() => navigate(`/guests/${g.id}`)}
                className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/30 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                    {g.first_name[0]}{g.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{g.first_name} {g.last_name}</h3>
                    <p className="text-xs text-muted-foreground">{COUNTRY_LABELS[g.nationality ?? ''] ?? g.nationality ?? '—'} · {g.language?.toUpperCase()}</p>
                  </div>
                  {(g.total_stays ?? 0) > 0 && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      {g.total_stays} séjour{(g.total_stays ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {g.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{g.email}</span>
                    </div>
                  )}
                  {g.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 flex-shrink-0" /><span>{g.phone}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default GuestsPage;
