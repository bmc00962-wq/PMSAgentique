// DEV ONLY — n8n workflow mock data (PROMPT 16)
// ADR-003: n8n orchestrates via PMS Edge Functions ONLY — never direct DB access
import type { WorkflowDefinition, ExecutionLog, WebhookConfig } from '@/types/workflow';

export const MOCK_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'W-00', name: 'Bootstrap Tenant', description: "Initialise le tenant à la création : tables de config, quota, welcome email.",
    status: 'active', trigger_type: 'event', trigger_label: 'on_tenant_created', domain: 'tenant',
    last_execution_at: '2026-08-01T06:12:00Z', last_execution_status: 'success',
    avg_duration_ms: 1850, executions_today: 0, executions_total: 3,
    calls_edge_functions: ['fn-tenant-init', 'fn-notification-send'],
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'W-01', name: 'Calendar Sync Push', description: "Pousse les disponibilités PMS vers tous les OTAs connectés après chaque modification de calendrier.",
    status: 'active', trigger_type: 'event', trigger_label: 'on_availability_change', domain: 'calendar',
    last_execution_at: '2026-08-10T11:44:00Z', last_execution_status: 'success',
    avg_duration_ms: 2100, executions_today: 8, executions_total: 1247,
    calls_edge_functions: ['fn-channel-push-availability'],
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'W-02', name: 'OTA Reservation Import', description: "Importe les nouvelles réservations OTA via polling. Idempotence via external_reservation_id.",
    status: 'active', trigger_type: 'schedule', trigger_label: 'Toutes les 15 min', domain: 'reservation',
    last_execution_at: '2026-08-10T11:45:00Z', last_execution_status: 'success',
    avg_duration_ms: 3400, executions_today: 24, executions_total: 8760,
    calls_edge_functions: ['fn-channel-pull-reservations', 'fn-reservation-import'],
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'W-03', name: 'Reservation Confirmation', description: "Envoie email + SMS de confirmation au voyageur et notifie le gestionnaire.",
    status: 'active', trigger_type: 'webhook', trigger_label: 'POST /webhook/reservation-confirmed', domain: 'reservation',
    last_execution_at: '2026-08-10T10:30:00Z', last_execution_status: 'success',
    avg_duration_ms: 950, executions_today: 2, executions_total: 312,
    calls_edge_functions: ['fn-notification-send', 'fn-guest-email'],
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'W-04', name: "Check-In J-1 Notification", description: "Envoie instructions de check-in 24h avant l'arrivée (code accès, parking, WiFi).",
    status: 'active', trigger_type: 'schedule', trigger_label: 'Quotidien 10h00', domain: 'guest',
    last_execution_at: '2026-08-10T10:00:00Z', last_execution_status: 'success',
    avg_duration_ms: 1200, executions_today: 1, executions_total: 180,
    calls_edge_functions: ['fn-guest-email', 'fn-smartlock-generate-code'],
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'W-05', name: "Check-Out J Rappel", description: "Envoie rappel check-out le matin de la date de départ (heure, procédure, lien avis).",
    status: 'active', trigger_type: 'schedule', trigger_label: 'Quotidien 08h00', domain: 'guest',
    last_execution_at: '2026-08-10T08:00:00Z', last_execution_status: 'success',
    avg_duration_ms: 890, executions_today: 1, executions_total: 165,
    calls_edge_functions: ['fn-guest-email'],
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'W-06', name: "Auto-Création Job Ménage", description: "Crée automatiquement un job checkout_clean après chaque départ confirmé. Priorité selon prochain arrivant.",
    status: 'active', trigger_type: 'event', trigger_label: 'on_reservation_checked_out', domain: 'housekeeping',
    last_execution_at: '2026-08-10T11:00:00Z', last_execution_status: 'success',
    avg_duration_ms: 620, executions_today: 3, executions_total: 487,
    calls_edge_functions: ['fn-housekeeping-create-job', 'fn-notification-send'],
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'W-07', name: "Notification Housekeeper", description: "Notifie l'agent ménage (SMS + push) dès qu'un job lui est assigné.",
    status: 'active', trigger_type: 'event', trigger_label: 'on_job_assigned', domain: 'housekeeping',
    last_execution_at: '2026-08-10T09:15:00Z', last_execution_status: 'success',
    avg_duration_ms: 480, executions_today: 2, executions_total: 431,
    calls_edge_functions: ['fn-notification-send'],
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'W-08', name: "Escalade Maintenance", description: "Crée un ticket maintenance lorsqu'un job ménage signale un incident. Notifie le superviseur.",
    status: 'active', trigger_type: 'event', trigger_label: 'on_job_issue_reported', domain: 'maintenance',
    last_execution_at: '2026-08-09T16:32:00Z', last_execution_status: 'success',
    avg_duration_ms: 730, executions_today: 0, executions_total: 28,
    calls_edge_functions: ['fn-maintenance-create-ticket', 'fn-notification-send'],
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'W-09', name: "Transport — Suivi Vol", description: "Surveille les vols des voyageurs. Ajuste l'heure de prise en charge si retard/avance (adjusted_at non-destructif).",
    status: 'error', trigger_type: 'schedule', trigger_label: 'Toutes les 30 min (vols du jour)', domain: 'transport',
    last_execution_at: '2026-08-10T11:30:00Z', last_execution_status: 'error',
    avg_duration_ms: 4200, executions_today: 4, executions_total: 920,
    error_message: 'FlightAware API: 429 Rate Limit Exceeded — retry dans 12 min',
    calls_edge_functions: ['fn-transport-update-flight', 'fn-notification-send'],
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'W-10', name: "Notification Chauffeur", description: "Notifie le chauffeur lors d'une assignation ou d'un changement d'heure de prise en charge.",
    status: 'active', trigger_type: 'event', trigger_label: 'on_trip_assigned / on_trip_time_adjusted', domain: 'transport',
    last_execution_at: '2026-08-10T08:45:00Z', last_execution_status: 'success',
    avg_duration_ms: 520, executions_today: 1, executions_total: 214,
    calls_edge_functions: ['fn-notification-send'],
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'W-11', name: "Génération Relevés Propriétaires", description: "Génère automatiquement les relevés financiers de chaque propriétaire le 1er du mois à 06h00 UTC.",
    status: 'active', trigger_type: 'schedule', trigger_label: '1er du mois 06h00 UTC', domain: 'finance',
    last_execution_at: '2026-08-01T06:00:00Z', last_execution_status: 'success',
    avg_duration_ms: 8400, executions_today: 0, executions_total: 8,
    calls_edge_functions: ['fn-finance-generate-statements'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'W-12', name: "Envoi Email Relevés", description: "Envoie le relevé PDF au propriétaire après validation par le gestionnaire.",
    status: 'active', trigger_type: 'webhook', trigger_label: 'POST /webhook/statement-send', domain: 'finance',
    last_execution_at: '2026-08-01T09:30:00Z', last_execution_status: 'success',
    avg_duration_ms: 2200, executions_today: 0, executions_total: 16,
    calls_edge_functions: ['fn-finance-send-statement-email'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'W-13', name: "Pipeline Agent IA", description: "Exécute une action d'agent approuvée par un humain. Audit complet. JAMAIS d'exécution automatique sur actions financières/accès.",
    status: 'paused', trigger_type: 'webhook', trigger_label: 'POST /webhook/agent-action-approved', domain: 'agents',
    last_execution_at: '2026-07-28T14:20:00Z', last_execution_status: 'warning',
    avg_duration_ms: 3100, executions_today: 0, executions_total: 7,
    calls_edge_functions: ['fn-agent-execute-action', 'fn-audit-log'],
    n8n_workflow_id: 'wf_agent_pipeline_v1',
    created_at: '2026-06-01T00:00:00Z',
  },
];

export const getWorkflowById = (id: string): WorkflowDefinition | undefined =>
  MOCK_WORKFLOWS.find(w => w.id === id);

// ── Execution Logs (20 recent) ────────────────────────────────────────────────

export const MOCK_EXECUTION_LOGS: ExecutionLog[] = [
  { id: 'log-001', workflow_id: 'W-02', workflow_name: 'OTA Reservation Import', status: 'success', trigger_data: '{"channel":"airbnb","units_checked":6}', duration_ms: 3210, edge_fn_called: 'fn-reservation-import', executed_at: '2026-08-10T11:45:00Z' },
  { id: 'log-002', workflow_id: 'W-01', workflow_name: 'Calendar Sync Push', status: 'success', trigger_data: '{"unit_id":"unit-003","dates_changed":3}', duration_ms: 1980, edge_fn_called: 'fn-channel-push-availability', executed_at: '2026-08-10T11:44:00Z' },
  { id: 'log-003', workflow_id: 'W-09', workflow_name: 'Transport — Suivi Vol', status: 'error', trigger_data: '{"flights_monitored":4}', duration_ms: 4200, edge_fn_called: 'fn-transport-update-flight', error_message: 'FlightAware API: 429 Rate Limit Exceeded', executed_at: '2026-08-10T11:30:00Z' },
  { id: 'log-004', workflow_id: 'W-02', workflow_name: 'OTA Reservation Import', status: 'success', trigger_data: '{"channel":"booking","units_checked":6}', duration_ms: 2870, edge_fn_called: 'fn-reservation-import', executed_at: '2026-08-10T11:30:00Z' },
  { id: 'log-005', workflow_id: 'W-06', workflow_name: 'Auto-Création Job Ménage', status: 'success', trigger_data: '{"reservation_id":"res-102","unit_id":"unit-005"}', duration_ms: 590, edge_fn_called: 'fn-housekeeping-create-job', executed_at: '2026-08-10T11:00:00Z' },
  { id: 'log-006', workflow_id: 'W-03', workflow_name: 'Reservation Confirmation', status: 'success', trigger_data: '{"reservation_id":"res-115","channel":"direct"}', duration_ms: 870, edge_fn_called: 'fn-guest-email', executed_at: '2026-08-10T10:30:00Z' },
  { id: 'log-007', workflow_id: 'W-05', workflow_name: 'Check-Out J Rappel', status: 'success', trigger_data: '{"reservations_today":3}', duration_ms: 920, edge_fn_called: 'fn-guest-email', executed_at: '2026-08-10T08:00:00Z' },
  { id: 'log-008', workflow_id: 'W-04', workflow_name: 'Check-In J-1 Notification', status: 'success', trigger_data: '{"reservations_tomorrow":2}', duration_ms: 1140, edge_fn_called: 'fn-guest-email', executed_at: '2026-08-10T10:00:00Z' },
  { id: 'log-009', workflow_id: 'W-10', workflow_name: 'Notification Chauffeur', status: 'success', trigger_data: '{"trip_id":"trip-006","driver_id":"drv-001"}', duration_ms: 510, edge_fn_called: 'fn-notification-send', executed_at: '2026-08-10T08:45:00Z' },
  { id: 'log-010', workflow_id: 'W-07', workflow_name: 'Notification Housekeeper', status: 'success', trigger_data: '{"job_id":"job-10","housekeeper_id":"hk-002"}', duration_ms: 460, edge_fn_called: 'fn-notification-send', executed_at: '2026-08-10T09:15:00Z' },
  { id: 'log-011', workflow_id: 'W-02', workflow_name: 'OTA Reservation Import', status: 'success', trigger_data: '{"channel":"vrbo","units_checked":6}', duration_ms: 3650, edge_fn_called: 'fn-reservation-import', executed_at: '2026-08-10T11:15:00Z' },
  { id: 'log-012', workflow_id: 'W-09', workflow_name: 'Transport — Suivi Vol', status: 'error', trigger_data: '{"flights_monitored":3}', duration_ms: 4300, error_message: 'FlightAware API: 429 Rate Limit Exceeded', executed_at: '2026-08-10T11:00:00Z' },
  { id: 'log-013', workflow_id: 'W-01', workflow_name: 'Calendar Sync Push', status: 'success', trigger_data: '{"unit_id":"unit-001","dates_changed":1}', duration_ms: 2050, edge_fn_called: 'fn-channel-push-availability', executed_at: '2026-08-10T10:22:00Z' },
  { id: 'log-014', workflow_id: 'W-06', workflow_name: 'Auto-Création Job Ménage', status: 'success', trigger_data: '{"reservation_id":"res-109","unit_id":"unit-002"}', duration_ms: 640, edge_fn_called: 'fn-housekeeping-create-job', executed_at: '2026-08-10T08:30:00Z' },
  { id: 'log-015', workflow_id: 'W-08', workflow_name: 'Escalade Maintenance', status: 'success', trigger_data: '{"job_id":"job-08","issue":"Probleme plomberie"}', duration_ms: 720, edge_fn_called: 'fn-maintenance-create-ticket', executed_at: '2026-08-09T16:32:00Z' },
  { id: 'log-016', workflow_id: 'W-12', workflow_name: 'Envoi Email Relevés', status: 'success', trigger_data: '{"statement_id":"stmt-001","owner_id":"owner-001"}', duration_ms: 2180, edge_fn_called: 'fn-finance-send-statement-email', executed_at: '2026-08-01T09:30:00Z' },
  { id: 'log-017', workflow_id: 'W-11', workflow_name: 'Génération Relevés Propriétaires', status: 'success', trigger_data: '{"period":"2026-07","owners_processed":3}', duration_ms: 8350, edge_fn_called: 'fn-finance-generate-statements', executed_at: '2026-08-01T06:00:00Z' },
  { id: 'log-018', workflow_id: 'W-13', workflow_name: 'Pipeline Agent IA', status: 'warning', trigger_data: '{"action":"price_adjustment","approval_id":"appr-042"}', duration_ms: 3100, edge_fn_called: 'fn-agent-execute-action', error_message: 'Approval expired — action non exécutée', executed_at: '2026-07-28T14:20:00Z' },
  { id: 'log-019', workflow_id: 'W-02', workflow_name: 'OTA Reservation Import', status: 'success', trigger_data: '{"channel":"airbnb","units_checked":6}', duration_ms: 3100, edge_fn_called: 'fn-reservation-import', executed_at: '2026-08-10T10:00:00Z' },
  { id: 'log-020', workflow_id: 'W-06', workflow_name: 'Auto-Création Job Ménage', status: 'success', trigger_data: '{"reservation_id":"res-107","unit_id":"unit-004"}', duration_ms: 610, edge_fn_called: 'fn-housekeeping-create-job', executed_at: '2026-08-09T12:10:00Z' },
];

// ── Webhooks ──────────────────────────────────────────────────────────────────

export const MOCK_WEBHOOKS: WebhookConfig[] = [
  { id: 'wh-001', workflow_id: 'W-03', endpoint_path: '/webhook/reservation-confirmed', method: 'POST', secret_header: 'X-PMS-Signature', is_active: true, last_called_at: '2026-08-10T10:30:00Z', calls_count: 312 },
  { id: 'wh-002', workflow_id: 'W-12', endpoint_path: '/webhook/statement-send', method: 'POST', secret_header: 'X-PMS-Signature', is_active: true, last_called_at: '2026-08-01T09:30:00Z', calls_count: 16 },
  { id: 'wh-003', workflow_id: 'W-13', endpoint_path: '/webhook/agent-action-approved', method: 'POST', secret_header: 'X-PMS-Signature', is_active: false, last_called_at: '2026-07-28T14:20:00Z', calls_count: 7 },
];

// ── Display constants ─────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', paused: 'En pause', error: 'Erreur', disabled: 'Désactivé',
};
export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  disabled: 'bg-secondary text-muted-foreground border-border',
};
export const EXEC_STATUS_COLORS: Record<string, string> = {
  success: 'text-emerald-400', error: 'text-rose-400', warning: 'text-yellow-400', running: 'text-blue-400',
};
export const EXEC_STATUS_ICONS: Record<string, string> = {
  success: '✓', error: '✗', warning: '⚠', running: '↻',
};
export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  event: 'Événement', schedule: 'Planifié', webhook: 'Webhook', manual: 'Manuel',
};
export const TRIGGER_TYPE_COLORS: Record<string, string> = {
  event: 'text-purple-400', schedule: 'text-blue-400', webhook: 'text-cyan-400', manual: 'text-slate-400',
};
export const DOMAIN_COLORS: Record<string, string> = {
  tenant: 'bg-purple-500/10 text-purple-300',
  calendar: 'bg-emerald-500/10 text-emerald-300',
  reservation: 'bg-blue-500/10 text-blue-300',
  guest: 'bg-teal-500/10 text-teal-300',
  housekeeping: 'bg-pink-500/10 text-pink-300',
  maintenance: 'bg-orange-500/10 text-orange-300',
  transport: 'bg-sky-500/10 text-sky-300',
  finance: 'bg-green-500/10 text-green-300',
  agents: 'bg-indigo-500/10 text-indigo-300',
};
