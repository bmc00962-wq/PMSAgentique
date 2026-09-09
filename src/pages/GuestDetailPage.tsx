// GuestDetailPage — Live Supabase data — ADR-012
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Mail, Phone, Globe2, MessageSquare, BookOpen,
  DollarSign, CalendarDays, Star, Users, MapPin, Clock, Edit,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const COUNTRY_LABELS: Record<string, string> = {
  CA: '🇨🇦 Canada', US: '🇺🇸 États-Unis', MA: '🇲🇦 Maroc',
  FR: '🇫🇷 France', GB: '🇬🇧 Royaume-Uni', DE: '🇩🇪 Allemagne',
};

const LANG_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

const RESERVATION_STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  checked_in: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checked_out: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  inquiry: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  inquiry: 'Demande', pending: 'En attente', confirmed: 'Confirmée',
  checked_in: 'Arrivé', checked_out: 'Parti', cancelled: 'Annulée',
};

const CHANNEL_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', direct: 'Direct', vrbo: 'Vrbo', manual: 'Manuel',
};

async function fetchGuestDetail(id: string) {
  const { data: guest, error } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, phone, nationality, language, notes, total_stays, created_at, deleted_at')
    .eq('id', id).eq('tenant_id', TENANT_ID).single();
  if (error) throw error;

  // Reservations for this guest
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, unit_id, status, channel, check_in, check_out, nights, total_amount, base_rent, cleaning_fee, tax_amount, currency, created_at')
    .eq('guest_id', id).eq('tenant_id', TENANT_ID).is('deleted_at', null)
    .order('check_in', { ascending: false });

  // Conversations for this guest
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, channel, subject, status, unread_count, last_message_at')
    .eq('guest_id', id).eq('tenant_id', TENANT_ID)
    .order('last_message_at', { ascending: false });

  // Unit names
  const unitIds = [...new Set((reservations ?? []).map(r => r.unit_id).filter(Boolean))];
  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, name, property_id').in('id', unitIds)
    : { data: [] };

  const propIds = [...new Set((units ?? []).map(u => u.property_id).filter(Boolean))];
  const { data: props } = propIds.length > 0
    ? await supabase.from('properties').select('id, name, city').in('id', propIds)
    : { data: [] };

  const unitMap: Record<string, { name: string; propertyName: string; city: string }> = {};
  for (const u of units ?? []) {
    const prop = (props ?? []).find(p => p.id === u.property_id);
    unitMap[u.id] = { name: u.name, propertyName: prop?.name ?? '—', city: prop?.city ?? '' };
  }

  const res = reservations ?? [];
  const confirmedRes = res.filter(r => ['confirmed', 'checked_in', 'checked_out'].includes(r.status));
  const totalSpent = confirmedRes.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalNights = confirmedRes.reduce((s, r) => s + (r.nights ?? 0), 0);

  return {
    guest,
    reservations: res,
    conversations: conversations ?? [],
    unitMap,
    stats: {
      totalSpent,
      totalNights,
      confirmedCount: confirmedRes.length,
      cancelledCount: res.filter(r => r.status === 'cancelled').length,
    },
  };
}

const GuestDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['guest-detail', id],
    queryFn: () => fetchGuestDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.guest) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Voyageur introuvable</p>
          <button onClick={() => navigate('/guests')} className="text-primary text-sm hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const { guest: g, reservations, conversations, unitMap, stats } = data;
  const initials = `${g.first_name[0]}${g.last_name[0]}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <button onClick={() => navigate('/guests')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voyageurs
        </button>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">{g.first_name} {g.last_name}</h1>
                {g.nationality && (
                  <span className="text-xs bg-secondary border border-border text-muted-foreground px-2.5 py-1 rounded-full">
                    {COUNTRY_LABELS[g.nationality] ?? g.nationality}
                  </span>
                )}
                <span className="text-xs bg-secondary border border-border text-muted-foreground px-2.5 py-1 rounded-full">
                  {LANG_LABELS[g.language] ?? g.language}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Client depuis le {new Date(g.created_at).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}
                {g.total_stays > 0 && ` · ${g.total_stays} séjour${g.total_stays > 1 ? 's' : ''} enregistré${g.total_stays > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => navigate('/communications')}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors min-h-[44px]">
              <MessageSquare className="w-3.5 h-3.5" /> Communications
            </button>
            <button
              onClick={() => navigate(`/guests/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors min-h-[44px]">
              <Edit className="w-3.5 h-3.5" /> Modifier
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Réservations', value: reservations.length, color: 'text-blue-400', icon: BookOpen },
            { label: 'Nuits totales', value: stats.totalNights, color: 'text-purple-400', icon: CalendarDays },
            { label: 'Dépenses totales', value: `${stats.totalSpent.toFixed(0)} CAD`, color: 'text-emerald-400', icon: DollarSign },
            { label: 'Conversations', value: conversations.length, color: 'text-cyan-400', icon: MessageSquare },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
              <div>
                <p className={cn('text-lg font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Contact */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Contact</h3>
              <div className="space-y-3">
                {g.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${g.email}`} className="text-xs text-primary hover:underline truncate">{g.email}</a>
                  </div>
                )}
                {g.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground">{g.phone}</span>
                  </div>
                )}
                {g.nationality && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground">{COUNTRY_LABELS[g.nationality] ?? g.nationality}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Globe2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-foreground">{LANG_LABELS[g.language] ?? g.language}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Statistiques</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Total séjours', value: g.total_stays },
                  { label: 'Réservations confirmées', value: stats.confirmedCount },
                  { label: 'Annulations', value: stats.cancelledCount },
                  { label: 'Nuits totales', value: stats.totalNights },
                  { label: 'Dépenses confirmées', value: `${stats.totalSpent.toFixed(2)} CAD` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {g.notes && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes internes</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{g.notes}</p>
              </div>
            )}

            {/* Conversations */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Conversations ({conversations.length})
                </h3>
                <button onClick={() => navigate('/communications')} className="text-xs text-primary hover:underline">Voir →</button>
              </div>
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune conversation</p>
              ) : (
                <div className="space-y-2">
                  {conversations.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.status === 'open' ? 'bg-blue-400' : 'bg-slate-400')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{c.subject ?? 'Sans objet'}</p>
                        <p className="text-xs text-muted-foreground">{c.channel}</p>
                      </div>
                      {c.unread_count > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 flex-shrink-0">{c.unread_count}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Reservations */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Historique des réservations ({reservations.length})
                </h3>
                {reservations.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Star className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">{stats.confirmedCount} confirmées</span>
                  </div>
                )}
              </div>

              {reservations.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune réservation enregistrée</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Les réservations liées à ce voyageur apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map(r => {
                    const unit = unitMap[r.unit_id];
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/reservations/${r.id}`)}
                        className="w-full flex items-start gap-3 p-4 rounded-xl bg-secondary/20 border border-border hover:border-primary/30 transition-all text-left">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', {
                          confirmed: 'bg-emerald-500/10', checked_in: 'bg-blue-500/10',
                          checked_out: 'bg-slate-500/10', pending: 'bg-yellow-500/10',
                          inquiry: 'bg-purple-500/10', cancelled: 'bg-red-500/10',
                        }[r.status] ?? 'bg-secondary')}>
                          <BookOpen className={cn('w-4 h-4', {
                            confirmed: 'text-emerald-400', checked_in: 'text-blue-400',
                            checked_out: 'text-slate-400', pending: 'text-yellow-400',
                            inquiry: 'text-purple-400', cancelled: 'text-red-400',
                          }[r.status] ?? 'text-muted-foreground')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', RESERVATION_STATUS_COLOR[r.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                              {RESERVATION_STATUS_LABELS[r.status] ?? r.status}
                            </span>
                            {r.channel && (
                              <span className="text-xs bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full">
                                {CHANNEL_LABELS[r.channel] ?? r.channel}
                              </span>
                            )}
                          </div>
                          {unit && (
                            <p className="text-sm font-medium text-foreground">{unit.propertyName} — {unit.name}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {r.check_in && r.check_out && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {r.check_in} → {r.check_out}
                              </span>
                            )}
                            {r.nights != null && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {r.nights} nuit{r.nights > 1 ? 's' : ''}
                              </span>
                            )}
                            {unit?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {unit.city}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {Number(r.total_amount) > 0 && (
                            <p className="text-sm font-bold font-mono text-emerald-400">
                              {Number(r.total_amount).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {r.currency}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(r.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default GuestDetailPage;
