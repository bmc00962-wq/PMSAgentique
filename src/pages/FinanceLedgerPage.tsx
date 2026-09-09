// FinanceLedgerPage — Live Supabase data — ADR-015 (append-only)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  base_rent: 'Loyer base', cleaning_fee: 'Frais ménage', tax: 'Taxes',
  channel_commission: 'Commission OTA', management_fee: 'Frais gestion',
  damage_deposit: 'Caution', damage_deduction: 'Déduction', refund: 'Remboursement',
  adjustment: 'Ajustement', payout: 'Virement', reversal: 'Annulation',
};

const TYPES = Object.keys(ENTRY_TYPE_LABELS);

async function fetchLedger() {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('id, entry_type, direction, amount, currency, description, reservation_id, is_reversed, created_at')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Join reservation guest names
  const resIds = [...new Set((data ?? []).map(e => e.reservation_id).filter(Boolean))];
  const { data: reservations } = resIds.length > 0
    ? await supabase.from('reservations').select('id, guest_first_name, guest_last_name').in('id', resIds)
    : { data: [] };
  const resMap: Record<string, string> = {};
  for (const r of reservations ?? []) resMap[r.id] = `${r.guest_first_name} ${r.guest_last_name}`;

  return (data ?? []).map(e => ({
    ...e,
    guest_name: e.reservation_id ? resMap[e.reservation_id] ?? '—' : '—',
  }));
}

const FinanceLedgerPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ledger', TENANT_ID],
    queryFn: fetchLedger,
    staleTime: 30_000,
  });

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    if (q && !e.description.toLowerCase().includes(q) && !e.guest_name.toLowerCase().includes(q)) return false;
    if (typeFilter && e.entry_type !== typeFilter) return false;
    if (directionFilter && e.direction !== directionFilter) return false;
    return true;
  });

  const totalCredits = filtered.filter(e => e.direction === 'credit').reduce((s, e) => s + Number(e.amount), 0);
  const totalDebits = filtered.filter(e => e.direction === 'debit').reduce((s, e) => s + Number(e.amount), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/finance')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Finance
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Grand Livre
              <span className="text-sm font-normal bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{entries.length} écritures</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Journal comptable append-only — ADR-015 · NUMERIC(12,4)</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="text-right">
              <p className="text-emerald-400 font-bold font-mono">+{totalCredits.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $</p>
              <p className="text-muted-foreground">Crédits (filtrés)</p>
            </div>
            <div className="text-right">
              <p className="text-red-400 font-bold font-mono">-{totalDebits.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $</p>
              <p className="text-muted-foreground">Débits (filtrés)</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Description, voyageur…"
              className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>)}
          </select>
          <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)}
            className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Toutes directions</option>
            <option value="credit">Crédits</option>
            <option value="debit">Débits</option>
          </select>
          {(search || typeFilter || directionFilter) && (
            <button onClick={() => { setSearch(''); setTypeFilter(''); setDirectionFilter(''); }}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2.5 bg-secondary transition-colors">
              Réinitialiser
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">Description</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">Voyageur</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                        <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        Aucune écriture trouvée
                      </td>
                    </tr>
                  ) : filtered.map(e => (
                    <tr key={e.id} className={cn('border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors', e.is_reversed && 'opacity-50')}>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString('fr-CA')}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground max-w-xs truncate">{e.description}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground">{ENTRY_TYPE_LABELS[e.entry_type] ?? e.entry_type}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{e.guest_name}</td>
                      <td className="py-3 px-4 text-right">
                        <div className={cn('flex items-center justify-end gap-1 text-sm font-bold font-mono', e.direction === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                          {e.direction === 'credit' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {e.direction === 'credit' ? '+' : '-'}{Number(e.amount).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {e.currency}
                        </div>
                        {e.is_reversed && <div className="text-xs text-slate-500 mt-0.5">Annulé</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                <span>{filtered.length} écriture{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}</span>
                <span className="text-orange-400 font-mono">🔒 Append-only — aucune modification possible (ADR-015)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FinanceLedgerPage;
