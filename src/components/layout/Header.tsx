import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, LogOut, Globe, Building2, ChevronDown, User, Settings, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/i18n";

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function fetchNotifications() {
  const [approvalsRes, ticketsRes, hkRes] = await Promise.all([
    supabase.from('approval_requests')
      .select('id, title, priority, scenario, created_at')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('maintenance_tickets')
      .select('id, title, priority, status, created_at')
      .eq('tenant_id', TENANT_ID)
      .in('priority', ['urgent', 'high'])
      .in('status', ['open', 'assigned', 'in_progress'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('housekeeping_jobs')
      .select('id, job_type, priority, status, scheduled_date')
      .eq('tenant_id', TENANT_ID)
      .eq('priority', 'urgent')
      .in('status', ['pending', 'assigned', 'in_progress'])
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: true })
      .limit(3),
  ]);
  return {
    approvals: approvalsRes.data ?? [],
    tickets: ticketsRes.data ?? [],
    hkJobs: hkRes.data ?? [],
  };
}

interface HeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  onMobileMenuOpen: () => void;
}

const Header = ({ onSidebarToggle, onMobileMenuOpen }: HeaderProps) => {
  const navigate = useNavigate();
  const { t, language, changeLanguage } = useI18n();
  const { user, membership, signOut } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['header-notifications', TENANT_ID],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const totalNotifs = (notifications?.approvals.length ?? 0)
    + (notifications?.tickets.length ?? 0)
    + (notifications?.hkJobs.length ?? 0);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0 relative z-10">
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        onClick={onSidebarToggle}
        className="hidden lg:flex w-11 h-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Tenant indicator */}
      <div className="hidden sm:flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">
          {membership?.role ? membership.role.replace(/_/g, ' ') : 'PMS SaaS'}
        </span>
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(o => !o); setLangOpen(false); setUserOpen(false); }}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          {totalNotifs > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-danger text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {totalNotifs > 9 ? '9+' : totalNotifs}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-12 bg-card border border-border rounded-xl shadow-xl w-[min(20rem,calc(100vw-2rem))] max-h-96 overflow-y-auto z-50">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Notifications</p>
              {totalNotifs > 0 && (
                <span className="text-xs bg-danger-soft text-danger border border-danger-border px-2 py-0.5 rounded-full font-medium">{totalNotifs} actives</span>
              )}
            </div>

            {totalNotifs === 0 ? (
              <div className="px-4 py-6 text-center">
                <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune alerte en attente</p>
              </div>
            ) : (
              <div className="py-1">
                {(notifications?.approvals ?? []).map(a => (
                  <button key={a.id} onClick={() => { navigate('/approvals'); setNotifOpen(false); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">Approbation en attente · {a.priority}</p>
                    </div>
                  </button>
                ))}
                {(notifications?.tickets ?? []).map(t => (
                  <button key={t.id} onClick={() => { navigate(`/maintenance/${t.id}`); setNotifOpen(false); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">Maintenance {t.priority} · {t.status}</p>
                    </div>
                  </button>
                ))}
                {(notifications?.hkJobs ?? []).map(j => (
                  <button key={j.id} onClick={() => { navigate('/housekeeping'); setNotifOpen(false); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{j.job_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">Ménage urgent · {j.scheduled_date}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Language switcher */}
      <div className="relative">
        <button
          onClick={() => { setLangOpen(o => !o); setUserOpen(false); }}
          className="flex items-center gap-1.5 h-11 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-transparent hover:border-border"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-medium uppercase">{language}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-12 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px] z-50">
            {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => { changeLanguage(code as Language); setLangOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm min-h-[44px] transition-opacity",
                  language === code ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <span>{flag}</span>
                <span>{label}</span>
                {language === code && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setUserOpen(o => !o); setLangOpen(false); }}
          className="flex items-center gap-2 h-11 pl-1 pr-2.5 rounded-lg hover:bg-secondary transition-colors border border-transparent hover:border-border"
        >
          <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block max-w-[80px] truncate">
            {user?.full_name?.split(' ')[0] ?? 'Admin'}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        {userOpen && (
          <div className="absolute right-0 top-12 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[180px] z-50">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name ?? 'Administrateur'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={() => { navigate('/profile'); setUserOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm min-h-[44px] text-foreground hover:bg-secondary transition-opacity"
            >
              <User className="w-3.5 h-3.5" />
              Mon profil
            </button>
            <button
              onClick={() => { navigate('/settings'); setUserOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm min-h-[44px] text-foreground hover:bg-secondary transition-opacity"
            >
              <Settings className="w-3.5 h-3.5" />
              Paramètres
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm min-h-[44px] text-danger hover:bg-danger-soft transition-opacity"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("auth", "signOut")}
            </button>
          </div>
        )}
      </div>

      {/* Close dropdowns on outside click */}
      {(langOpen || userOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setLangOpen(false); setUserOpen(false); setNotifOpen(false); }}
        />
      )}
    </header>
  );
};

export default Header;
