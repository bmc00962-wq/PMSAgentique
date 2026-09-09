// CommunicationsPage — Live Supabase data + Real-time polling — ADR-012
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, FileText, Search, Clock, Send, Plus,
  ChevronRight, RefreshCw, CheckCircle2, XCircle, Mail, Smartphone, Circle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
// Demo user for message sender — in production would come from auth context
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

type Tab = 'conversations' | 'templates';

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp',
  in_app: 'In-App', airbnb: 'Airbnb', booking_com: 'Booking.com',
};

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail, sms: Smartphone, whatsapp: Smartphone,
  in_app: MessageSquare, airbnb: MessageSquare, booking_com: MessageSquare,
};

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  archived: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// ── Data Fetchers ──────────────────────────────────────────────────────────────
async function fetchConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, reservation_id, guest_id, channel, subject, status, last_message_at, unread_count, created_at, updated_at')
    .eq('tenant_id', TENANT_ID)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const guestIds = [...new Set((data ?? []).map(c => c.guest_id).filter(Boolean))];
  const { data: guests } = guestIds.length > 0
    ? await supabase.from('guests').select('id, first_name, last_name, email').in('id', guestIds)
    : { data: [] };
  const guestMap: Record<string, { name: string; email: string }> = {};
  for (const g of guests ?? []) guestMap[g.id] = { name: `${g.first_name} ${g.last_name}`, email: g.email };

  return (data ?? []).map(c => ({
    ...c,
    guest_name: c.guest_id ? guestMap[c.guest_id]?.name ?? 'Voyageur inconnu' : 'Voyageur inconnu',
    guest_email: c.guest_id ? guestMap[c.guest_id]?.email ?? '' : '',
  }));
}

async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, direction, content, content_type, sender_type, sender_id, status, sent_at, read_at, created_at')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchTemplates() {
  const { data, error } = await supabase
    .from('message_templates')
    .select('id, name, trigger_event, channel, language, subject, body, is_active, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

async function createConversation(guestName: string, channel: string, subject: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      tenant_id: TENANT_ID,
      channel,
      subject,
      status: 'open',
      unread_count: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Main Component ─────────────────────────────────────────────────────────────
const CommunicationsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('conversations');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Polling for conversations every 10s
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['conversations', TENANT_ID],
    queryFn: fetchConversations,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  // Polling for messages every 5s when a conversation is selected
  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => fetchMessages(selectedId!),
    enabled: !!selectedId,
    staleTime: 5_000,
    refetchInterval: selectedId ? 5_000 : false,
  });

  const { data: templates = [], isLoading: tplLoading } = useQuery({
    queryKey: ['message-templates', TENANT_ID],
    queryFn: fetchTemplates,
    staleTime: 60_000,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when selecting a conversation
  useEffect(() => {
    if (!selectedId) return;
    const conv = conversations.find(c => c.id === selectedId);
    if (conv && conv.unread_count > 0) {
      supabase.from('conversations')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', selectedId)
        .then(() => queryClient.invalidateQueries({ queryKey: ['conversations', TENANT_ID] }));
    }
  }, [selectedId, conversations]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      // Insert message (append-only — ADR-012)
      const { error: msgErr } = await supabase.from('messages').insert({
        tenant_id: TENANT_ID,
        conversation_id: selectedId!,
        direction: 'outbound',
        content,
        content_type: 'text',
        sender_type: 'agent',
        sender_id: DEMO_USER_ID,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      if (msgErr) throw msgErr;

      // Update conversation last_message_at
      await supabase.from('conversations').update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', selectedId!);
    },
    onSuccess: () => {
      setMsgInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', TENANT_ID] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createNewConversation = useMutation({
    mutationFn: () => createConversation('', 'email', 'Nouveau message'),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', TENANT_ID] });
      setSelectedId(conv.id);
      toast.success('Conversation créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.guest_name.toLowerCase().includes(q) || (c.subject ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selected = conversations.find(c => c.id === selectedId) ?? null;
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  const handleSend = () => {
    const trimmed = msgInput.trim();
    if (!trimmed || !selectedId) return;
    sendMessage.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-primary" />
              Communications
              {totalUnread > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                  {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">ADR-012 · Messages append-only · Polling 5s · LLM draft uniquement</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['conversations', TENANT_ID] })}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors"
              title="Actualiser">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {tab === 'templates' && (
              <button
                onClick={() => navigate('/communications/templates/new')}
                className="flex items-center gap-2 bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]">
                <Plus className="w-4 h-4" /> Nouveau template
              </button>
            )}
            <button
              onClick={() => createNewConversation.mutate()}
              disabled={createNewConversation.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]">
              <Plus className="w-4 h-4" /> Nouvelle
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Ouvertes', value: conversations.filter(c => c.status === 'open').length, color: 'text-blue-400', icon: MessageSquare },
            { label: 'Non lus', value: totalUnread, color: 'text-orange-400', icon: Clock },
            { label: 'Templates', value: templates.length, color: 'text-purple-400', icon: FileText },
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-3">
          {([
            { key: 'conversations' as Tab, label: 'Conversations', icon: MessageSquare, count: conversations.length },
            { key: 'templates' as Tab, label: 'Templates', icon: FileText, count: templates.length },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                tab === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
              <Icon className="w-4 h-4" /> {label}
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === key ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Conversations tab ── */}
        {tab === 'conversations' && (
          convLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: '70vh' }}>
              <div className="flex h-full">
                {/* Left panel — conversation list */}
                <div className="w-full lg:w-80 xl:w-96 border-r border-border flex-shrink-0 flex flex-col">
                  {/* Search + filter */}
                  <div className="p-3 border-b border-border flex-shrink-0 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher…"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex gap-1">
                      {(['all', 'open', 'closed'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                          className={cn('flex-1 text-xs py-1.5 rounded-lg transition-colors',
                            statusFilter === s ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                          )}>
                          {s === 'all' ? 'Toutes' : s === 'open' ? 'Ouvertes' : 'Fermées'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="text-center py-10 px-4">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Aucune conversation</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Les conversations apparaissent lors des réservations</p>
                      </div>
                    ) : filtered.map(c => {
                      const ChannelIcon = CHANNEL_ICON[c.channel] ?? MessageSquare;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            'w-full p-3 text-left border-b border-border/40 hover:bg-secondary/30 transition-colors',
                            selectedId === c.id && 'bg-primary/5 border-l-2 border-l-primary',
                            c.unread_count > 0 && 'bg-blue-500/3'
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Avatar */}
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                              c.status === 'open' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>
                              {c.guest_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className={cn('text-xs font-medium truncate', c.unread_count > 0 ? 'text-foreground' : 'text-foreground/80')}>
                                  {c.guest_name}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {c.unread_count > 0 && (
                                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
                                      {c.unread_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className={cn('text-xs truncate', c.unread_count > 0 ? 'text-muted-foreground font-medium' : 'text-muted-foreground/70')}>
                                {c.subject ?? 'Sans objet'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <ChannelIcon className="w-2.5 h-2.5 text-muted-foreground/60 flex-shrink-0" />
                                <span className="text-xs text-muted-foreground/60">{CHANNEL_LABELS[c.channel] ?? c.channel}</span>
                                <Circle className={cn('w-1.5 h-1.5 flex-shrink-0 ml-auto',
                                  c.status === 'open' ? 'text-blue-400 fill-blue-400' : 'text-slate-400 fill-slate-400'
                                )} />
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right panel — message thread */}
                <div className="flex-1 hidden lg:flex flex-col min-h-0">
                  {selected ? (
                    <div className="flex flex-col h-full">
                      {/* Thread header */}
                      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                            {selected.guest_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground">{selected.guest_name}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {selected.subject ?? 'Sans objet'} · {CHANNEL_LABELS[selected.channel] ?? selected.channel}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_COLOR[selected.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                            {selected.status}
                          </span>
                          <button
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['messages', selectedId] })}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                            title="Actualiser">
                            <RefreshCw className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {msgLoading ? (
                          <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">Aucun message</p>
                            <p className="text-xs text-muted-foreground/50 mt-1">Commencez la conversation ci-dessous</p>
                          </div>
                        ) : (
                          <>
                            {messages.map(msg => {
                              const isOutbound = msg.direction === 'outbound';
                              return (
                                <div key={msg.id} className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
                                  <div className={cn(
                                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                                    isOutbound
                                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                      : 'bg-secondary border border-border text-foreground rounded-tl-sm'
                                  )}>
                                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                    <div className={cn('flex items-center gap-1.5 mt-1.5 text-xs', isOutbound ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground')}>
                                      <span>
                                        {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {isOutbound && (
                                        msg.status === 'read'
                                          ? <CheckCircle2 className="w-3 h-3" />
                                          : msg.status === 'delivered'
                                            ? <CheckCircle2 className="w-3 h-3 opacity-60" />
                                            : <Circle className="w-3 h-3 opacity-40" />
                                      )}
                                      {!isOutbound && (
                                        <span className="capitalize opacity-60">{msg.sender_type}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>

                      {/* Compose — ADR-012: LLM draft only, never auto-send */}
                      <div className="p-3 border-t border-border flex-shrink-0">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <input
                              value={msgInput}
                              onChange={e => setMsgInput(e.target.value)}
                              onKeyDown={handleKeyDown}
                              placeholder="Écrire un message… (Entrée pour envoyer)"
                              className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            />
                            <p className="text-xs text-muted-foreground/50 mt-1 px-1">
                              ADR-012 · Messages append-only · LLM = brouillon uniquement · jamais auto-envoyé
                            </p>
                          </div>
                          <button
                            onClick={handleSend}
                            disabled={!msgInput.trim() || sendMessage.isPending}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                            <Send className="w-4 h-4" />
                            {sendMessage.isPending ? 'Envoi…' : 'Envoyer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                      <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Sélectionnez une conversation</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conversations.length === 0
                            ? 'Créez une nouvelle conversation pour commencer'
                            : `${conversations.length} conversation${conversations.length > 1 ? 's' : ''} dans la liste`}
                        </p>
                      </div>
                      {conversations.length === 0 && (
                        <button
                          onClick={() => createNewConversation.mutate()}
                          className="flex items-center gap-2 text-sm text-primary border border-primary/25 px-4 py-2.5 rounded-xl hover:bg-primary/5 transition-colors">
                          <Plus className="w-4 h-4" /> Nouvelle conversation
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* ── Templates tab ── */}
        {tab === 'templates' && (
          tplLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : templates.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun template configuré</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Créez des templates pour automatiser vos communications</p>
              <button
                onClick={() => navigate('/communications/templates/new')}
                className="mt-4 flex items-center gap-2 mx-auto text-sm text-primary border border-primary/25 px-4 py-2.5 rounded-xl hover:bg-primary/5 transition-colors">
                <Plus className="w-4 h-4" /> Créer un template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map(t => {
                const ChannelIcon = CHANNEL_ICON[t.channel] ?? MessageSquare;
                return (
                  <div key={t.id} className={cn('bg-card border rounded-xl p-5 transition-colors',
                    t.is_active ? 'border-border hover:border-primary/30' : 'border-border/50 opacity-60')}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                          <p className="text-xs text-muted-foreground">{CHANNEL_LABELS[t.channel] ?? t.channel} · {t.language.toUpperCase()}</p>
                        </div>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                        t.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20')}>
                        {t.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    {t.subject && (
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="text-muted-foreground/60">Objet :</span> {t.subject}
                      </p>
                    )}
                    {t.trigger_event && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-xs text-primary">{t.trigger_event}</span>
                      </div>
                    )}
                    {t.body && (
                      <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2 border-t border-border/50 pt-2 mt-2">
                        {t.body}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground/50">
                        {new Date(t.created_at).toLocaleDateString('fr-CA')}
                      </span>
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                        Éditer <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
};

export default CommunicationsPage;
