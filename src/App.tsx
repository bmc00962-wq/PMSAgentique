
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OwnersPage from "./pages/OwnersPage";
import OwnerDetailPage from "./pages/OwnerDetailPage";
import PropertiesPage from "./pages/PropertiesPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import CalendarPage from "./pages/CalendarPage";
import ReservationsPage from "./pages/ReservationsPage";
import ReservationDetailPage from "./pages/ReservationDetailPage";
import ChannelsPage from "./pages/ChannelsPage";
import ChannelDetailPage from "./pages/ChannelDetailPage";
import GuestsPage from "./pages/GuestsPage";
import GuestDetailPage from "./pages/GuestDetailPage";
import CommunicationsPage from "./pages/CommunicationsPage";
import HousekeepingPage from "./pages/HousekeepingPage";
import HousekeepingDetailPage from "./pages/HousekeepingDetailPage";
import TransportPage from "./pages/TransportPage";
import TransportDetailPage from "./pages/TransportDetailPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceDetailPage from "./pages/MaintenanceDetailPage";
import FinancePage from "./pages/FinancePage";
import FinanceLedgerPage from "./pages/FinanceLedgerPage";
import FinanceStatementsPage from "./pages/FinanceStatementsPage";
import N8nDashboardPage from "./pages/N8nDashboardPage";
import N8nWorkflowDetailPage from "./pages/N8nWorkflowDetailPage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import SettingsPage from "./pages/SettingsPage";
import SaasAdminPage from "./pages/SaasAdminPage";
import AgentOrchestratorPage from "./pages/AgentOrchestratorPage";
import ReportsPage from "./pages/ReportsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import ApprovalDetailPage from "./pages/ApprovalDetailPage";
import DesignSystemPage from "./pages/DesignSystemPage";
import CleanerMobileView from "./pages/mobile/CleanerMobileView";
import DriverMobileView from "./pages/mobile/DriverMobileView";
import InspectorMobileView from "./pages/mobile/InspectorMobileView";
import TechnicianMobileView from "./pages/mobile/TechnicianMobileView";
import NewReservationPage from "./pages/NewReservationPage";
import NewOwnerPage from "./pages/NewOwnerPage";
import NewPropertyPage from "./pages/NewPropertyPage";
import NewGuestPage from "./pages/NewGuestPage";
import EditOwnerPage from "./pages/EditOwnerPage";
import EditPropertyPage from "./pages/EditPropertyPage";
import ProfilePage from "./pages/ProfilePage";
import EditGuestPage from "./pages/EditGuestPage";
import NewUnitPage from "./pages/NewUnitPage";
import EditReservationPage from "./pages/EditReservationPage";
import NewChannelPage from "./pages/NewChannelPage";
import UnitDetailPage from "./pages/UnitDetailPage";
import NewMaintenancePage from "./pages/NewMaintenancePage";
import CalendarUnitPage from "./pages/CalendarUnitPage";
import NewTransportPage from "./pages/NewTransportPage";
import EditChannelPage from "./pages/EditChannelPage";
import EditUnitPage from "./pages/EditUnitPage";
import NewMessageTemplatePage from "./pages/NewMessageTemplatePage";
import NewOwnerStatementPage from "./pages/NewOwnerStatementPage";
import NewDriverPage from "./pages/NewDriverPage";
import EditDriverPage from "./pages/EditDriverPage";
import NewHousekeepingJobPage from "./pages/NewHousekeepingJobPage";
import OwnerStatementDetailPage from "./pages/OwnerStatementDetailPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/features/ProtectedRoute";
import AdminTenantsPage from "./pages/AdminTenantsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminTenantDetailPage from "./pages/AdminTenantDetailPage";
import PricingPage from "./pages/PricingPage";
import TenantOnboardingPage from "./pages/TenantOnboardingPage";
import TasksPage from "./pages/TasksPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Root → login (architecture disponible sur /architecture) */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/architecture" element={<Index />} />
          {/* PMS Application */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* PROMPT 08 — Property & Owner Management */}
          <Route path="/owners" element={<ProtectedRoute><OwnersPage /></ProtectedRoute>} />
          <Route path="/owners/new" element={<ProtectedRoute><NewOwnerPage /></ProtectedRoute>} />
          <Route path="/owners/:id/edit" element={<ProtectedRoute><EditOwnerPage /></ProtectedRoute>} />
          <Route path="/owners/:id" element={<ProtectedRoute><OwnerDetailPage /></ProtectedRoute>} />
          <Route path="/properties" element={<ProtectedRoute><PropertiesPage /></ProtectedRoute>} />
          <Route path="/properties/new" element={<ProtectedRoute><NewPropertyPage /></ProtectedRoute>} />
          <Route path="/properties/:id/edit" element={<ProtectedRoute><EditPropertyPage /></ProtectedRoute>} />
          <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetailPage /></ProtectedRoute>} />
          {/* PROMPT 09 — Calendar Engine */}
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          {/* PROMPT 10 — Reservation Engine */}
          <Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />
          <Route path="/reservations/new" element={<ProtectedRoute><NewReservationPage /></ProtectedRoute>} />
          <Route path="/reservations/:id/edit" element={<ProtectedRoute><EditReservationPage /></ProtectedRoute>} />
          <Route path="/reservations/:id" element={<ProtectedRoute><ReservationDetailPage /></ProtectedRoute>} />
          {/* PROMPT 11 — Channel Manager */}
          <Route path="/channels" element={<ProtectedRoute><ChannelsPage /></ProtectedRoute>} />
          <Route path="/channels/new" element={<ProtectedRoute><NewChannelPage /></ProtectedRoute>} />
          <Route path="/channels/:id/edit" element={<ProtectedRoute><EditChannelPage /></ProtectedRoute>} />
          <Route path="/channels/:id" element={<ProtectedRoute><ChannelDetailPage /></ProtectedRoute>} />
          <Route path="/units/new" element={<ProtectedRoute><NewUnitPage /></ProtectedRoute>} />
          <Route path="/units/:id/calendar" element={<ProtectedRoute><CalendarUnitPage /></ProtectedRoute>} />
          <Route path="/units/:id/edit" element={<ProtectedRoute><EditUnitPage /></ProtectedRoute>} />
          <Route path="/units/:id" element={<ProtectedRoute><UnitDetailPage /></ProtectedRoute>} />
          {/* PROMPT 12 — Voyageurs & Communications */}
          <Route path="/guests" element={<ProtectedRoute><GuestsPage /></ProtectedRoute>} />
          <Route path="/guests/new" element={<ProtectedRoute><NewGuestPage /></ProtectedRoute>} />
          <Route path="/guests/:id/edit" element={<ProtectedRoute><EditGuestPage /></ProtectedRoute>} />
          <Route path="/guests/:id" element={<ProtectedRoute><GuestDetailPage /></ProtectedRoute>} />
          <Route path="/communications" element={<ProtectedRoute><CommunicationsPage /></ProtectedRoute>} />
          <Route path="/communications/templates/new" element={<ProtectedRoute><NewMessageTemplatePage /></ProtectedRoute>} />
          {/* PROMPT 13 — Housekeeping Engine */}
          <Route path="/housekeeping" element={<ProtectedRoute><HousekeepingPage /></ProtectedRoute>} />
          <Route path="/housekeeping/new" element={<ProtectedRoute><NewHousekeepingJobPage /></ProtectedRoute>} />
          <Route path="/housekeeping/:id" element={<ProtectedRoute><HousekeepingDetailPage /></ProtectedRoute>} />
          {/* PROMPT 14 — Transport & Maintenance */}
          <Route path="/transport" element={<ProtectedRoute><TransportPage /></ProtectedRoute>} />
          <Route path="/transport/new" element={<ProtectedRoute><NewTransportPage /></ProtectedRoute>} />
          <Route path="/drivers/new" element={<ProtectedRoute><NewDriverPage /></ProtectedRoute>} />
          <Route path="/drivers/:id/edit" element={<ProtectedRoute><EditDriverPage /></ProtectedRoute>} />
          <Route path="/transport/:id" element={<ProtectedRoute><TransportDetailPage /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
          <Route path="/maintenance/new" element={<ProtectedRoute><NewMaintenancePage /></ProtectedRoute>} />
          <Route path="/maintenance/:id" element={<ProtectedRoute><MaintenanceDetailPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          {/* PROMPT 15 — Finance Engine */}
          <Route path="/finance" element={<ProtectedRoute requiredPermission="finance.read"><FinancePage /></ProtectedRoute>} />
          <Route path="/finance/ledger" element={<ProtectedRoute><FinanceLedgerPage /></ProtectedRoute>} />
          <Route path="/finance/statements" element={<ProtectedRoute><FinanceStatementsPage /></ProtectedRoute>} />
          <Route path="/finance/statements/new" element={<ProtectedRoute><NewOwnerStatementPage /></ProtectedRoute>} />
          <Route path="/finance/statements/:id" element={<ProtectedRoute><OwnerStatementDetailPage /></ProtectedRoute>} />
          {/* PROMPT 16 — Intégration n8n */}
          <Route path="/integrations/n8n" element={<ProtectedRoute><N8nDashboardPage /></ProtectedRoute>} />
          <Route path="/integrations/n8n/:id" element={<ProtectedRoute><N8nWorkflowDetailPage /></ProtectedRoute>} />
          {/* PROMPT 17 — Architecture Agentique */}
          <Route path="/agents" element={<ProtectedRoute requiredPermission="agent.read"><AgentsPage /></ProtectedRoute>} />
          <Route path="/agents/:id" element={<ProtectedRoute><AgentDetailPage /></ProtectedRoute>} />
          {/* PROMPT 18 — Production & Déploiement */}
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/saas-admin" element={<ProtectedRoute requiredPermission="tenant.admin"><SaasAdminPage /></ProtectedRoute>} />
          <Route path="/saas-admin/tenants" element={<ProtectedRoute requiredPermission="tenant.admin"><AdminTenantsPage /></ProtectedRoute>} />
          <Route path="/saas-admin/tenants/:id" element={<ProtectedRoute requiredPermission="tenant.admin"><AdminTenantDetailPage /></ProtectedRoute>} />
          <Route path="/saas-admin/users" element={<ProtectedRoute requiredPermission="tenant.admin"><AdminUsersPage /></ProtectedRoute>} />
          {/* PROMPT 19 — Agent Orchestrator Architecture */}
          <Route path="/agents/orchestrator" element={<ProtectedRoute><AgentOrchestratorPage /></ProtectedRoute>} />
          {/* PROMPT 20 — Human Approval Engine */}
          <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
          <Route path="/approvals/:id" element={<ProtectedRoute><ApprovalDetailPage /></ProtectedRoute>} />
          {/* PROMPT 21 — Reporting & SaaS Admin */}
          <Route path="/reports" element={<ProtectedRoute requiredPermission="report.read"><ReportsPage /></ProtectedRoute>} />
          {/* PROMPT 22 — UX/UI Finalization */}
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="/mobile/cleaner" element={<CleanerMobileView />} />
          <Route path="/mobile/driver" element={<DriverMobileView />} />
          <Route path="/mobile/inspector" element={<InspectorMobileView />} />
          <Route path="/mobile/technician" element={<TechnicianMobileView />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          {/* Pricing & Onboarding */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><TenantOnboardingPage /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
