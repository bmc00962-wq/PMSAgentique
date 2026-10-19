import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2, LayoutDashboard, UserCog, CalendarDays, BookOpen, Globe,
  Users, MessageSquare, Sparkles, Wrench, Car, DollarSign, BarChart2, Bot, Settings,
  Network, ClipboardCheck, Lock, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";

// Map module IDs to lucide icons (avoids dynamic icon type issues)
// Permissions minimales requises par item de navigation (resource.action)
const NAV_PERMISSIONS: Record<string, string> = {
  finance: 'finance.read',
  reports: 'report.read',
  agents: 'agent.read',
  approvals: 'approval.read',
  integrations: 'settings.read',
};

// Rôles ayant accès à chaque item (vide = tout le monde)
// platform_super_admin a toujours accès
const NAV_ROLE_RESTRICTIONS: Record<string, string[]> = {
  finance: ['platform_super_admin', 'tenant_admin', 'property_manager', 'accounting', 'ops_manager'],
  reports: ['platform_super_admin', 'tenant_admin', 'property_manager', 'accounting', 'ops_manager', 'housekeeping_supervisor', 'revenue_manager'],
  agents: ['platform_super_admin', 'tenant_admin', 'ops_manager'],
  approvals: ['platform_super_admin', 'tenant_admin', 'property_manager', 'ops_manager', 'accounting'],
  integrations: ['platform_super_admin', 'tenant_admin'],
  channels: ['platform_super_admin', 'tenant_admin', 'property_manager', 'revenue_manager'],
  owners: ['platform_super_admin', 'tenant_admin', 'property_manager', 'accounting'],
  maintenance: ['platform_super_admin', 'tenant_admin', 'property_manager', 'ops_manager', 'maintenance_technician', 'housekeeping_supervisor'],
  transport: ['platform_super_admin', 'tenant_admin', 'property_manager', 'ops_manager', 'driver'],
  housekeeping: ['platform_super_admin', 'tenant_admin', 'property_manager', 'ops_manager', 'cleaner', 'housekeeping_supervisor', 'inspector'],
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  settings: Settings,
  owners: UserCog,
  properties: Building2,
  calendar: CalendarDays,
  reservations: BookOpen,
  channels: Globe,
  guests: Users,
  communications: MessageSquare,
  housekeeping: Sparkles,
  maintenance: Wrench,
  transport: Car,
  finance: DollarSign,
  reports: BarChart2,
  agents: Bot,
  integrations: Network,
  approvals: ClipboardCheck,
  saasadmin: Shield,
  pricing: DollarSign,
};

// Group label translations
const GROUP_LABELS: Record<string, Record<string, string>> = {
  foundation: { fr: 'Fondation',     en: 'Foundation',   ar: 'الأساس'   },
  core:       { fr: 'Core',          en: 'Core',         ar: 'الجوهر'   },
  domain:     { fr: 'Domaine',       en: 'Domain',       ar: 'المجال'   },
  governance: { fr: 'Gouvernance',   en: 'Governance',   ar: 'الحوكمة'  },
  platform:   { fr: 'Plateforme',    en: 'Platform',     ar: 'المنصة'   },
};

const NAV = [
  {
    groupKey: "foundation",
    dot: "bg-primary/60",
    items: [
      { id: "dashboard", path: "/dashboard", key: "dashboard", ready: true },
      { id: "settings", path: "/settings", key: "settings", ready: true },
    ],
  },
  {
    groupKey: "core",
    dot: "bg-primary/60",
    items: [
      { id: "owners", path: "/owners", key: "owners", ready: true },
      { id: "properties", path: "/properties", key: "properties", ready: true },
      { id: "calendar", path: "/calendar", key: "calendar", ready: true },
      { id: "reservations", path: "/reservations", key: "reservations", ready: true },
      { id: "channels", path: "/channels", key: "channels", ready: true },
      { id: "guests", path: "/guests", key: "guests", ready: true },
      { id: "communications", path: "/communications", key: "communications", ready: true },
    ],
  },
  {
    groupKey: "domain",
    dot: "bg-primary/60",
    items: [
      { id: "housekeeping", path: "/housekeeping", key: "housekeeping", ready: true },
      { id: "maintenance", path: "/maintenance", key: "maintenance", ready: true },
      { id: "transport", path: "/transport", key: "transport", ready: true },
      { id: "finance", path: "/finance", key: "finance", ready: true },
      { id: "reports", path: "/reports", key: "reports", ready: true },
    ],
  },
  {
    groupKey: "governance",
    dot: "bg-primary/60",
    items: [
      { id: "integrations", path: "/integrations/n8n", key: "integrations", ready: true },
      { id: "agents", path: "/agents", key: "agents", ready: true },
      { id: "approvals", path: "/approvals", key: "approvals", ready: true },
    ],
  },
  {
    groupKey: "platform",
    dot: "bg-primary/60",
    items: [
      { id: "saasadmin", path: "/saas-admin", key: "saasadmin", ready: true },
      { id: "pricing", path: "/pricing", key: "pricing", ready: true },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar = ({ collapsed, mobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { membership } = useAuth();

  const userRole = membership?.role ?? '';
  const isSuperAdmin = userRole === 'platform_super_admin';

  // Check if user can access a nav item based on role restrictions
  const canAccessItem = (itemId: string): boolean => {
    if (isSuperAdmin) return true;
    const restrictions = NAV_ROLE_RESTRICTIONS[itemId];
    if (!restrictions || restrictions.length === 0) return true;
    return restrictions.includes(userRole);
  };

  const handleNav = (path: string, ready: boolean) => {
    if (!ready) return;
    navigate(path);
    onMobileClose();
  };

  return (
    <aside
      className={cn(
        "flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 z-30",
        "fixed inset-y-0 left-0 lg:relative lg:translate-x-0",
        collapsed ? "w-[60px]" : "w-[240px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-border flex-shrink-0",
        collapsed ? "h-14 justify-center px-3" : "h-14 gap-2.5 px-4"
      )}>
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground leading-none">PMS SaaS</div>
            <div className="text-xs text-muted-foreground leading-none mt-0.5">Agentique</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(group => {
  // For platform group, only show to super admin (except pricing which is visible to all)
          if (group.groupKey === 'platform' && !isSuperAdmin) {
            // Show only pricing to non-super-admin
            const visiblePlatformItems = group.items.filter(item => item.id === 'pricing');
            if (visiblePlatformItems.length === 0) return null;
            return (
              <div key={group.groupKey}>
                {!collapsed && (
                  <div className="flex items-center gap-1.5 px-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${group.dot}`} />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {GROUP_LABELS[group.groupKey]?.[language] ?? GROUP_LABELS[group.groupKey]?.fr}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {visiblePlatformItems.map(item => {
                    const Icon = ICON_MAP[item.id] ?? LayoutDashboard;
                    const isActive = location.pathname.startsWith(item.path);
                    const label = t("nav", item.key);
                    return (
                      <button key={item.id} onClick={() => handleNav(item.path, item.ready)}
                        className={cn('w-full flex items-center rounded-lg transition-opacity text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring',
                          collapsed ? 'h-11 justify-center' : 'min-h-[44px] gap-2.5 px-2.5',
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60')}>
                        <Icon className={cn('flex-shrink-0', collapsed ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
                        {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Filter items by role
          const visibleItems = group.items.filter(item => canAccessItem(item.id));
          if (visibleItems.length === 0) return null;

          return (
          <div key={group.groupKey}>
            {!collapsed && (
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${group.dot}`} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {GROUP_LABELS[group.groupKey]?.[language] ?? GROUP_LABELS[group.groupKey]?.fr}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {visibleItems.map(item => {
                const Icon = ICON_MAP[item.id] ?? LayoutDashboard;
                const isActive = location.pathname.startsWith(item.path);
                const label = t("nav", item.key);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.path, item.ready)}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "w-full flex items-center rounded-lg transition-opacity text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring",
                      collapsed ? "h-11 justify-center" : "min-h-[44px] gap-2.5 px-2.5",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : item.ready
                        ? "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                        : "text-muted-foreground/40 cursor-not-allowed"
                    )}
                  >
                    <Icon className={cn("flex-shrink-0", collapsed ? "w-4 h-4" : "w-3.5 h-3.5")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{label}</span>
                        {!item.ready && <Lock className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-3">
          <div className="bg-accent/60 border border-primary/15 rounded-lg p-2.5">
            <p className="text-xs text-primary font-medium">Phase 25 — Production ✓</p>
            <p className="text-xs text-muted-foreground mt-0.5">88/88 checks · RTO 4h · PROD READY</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
