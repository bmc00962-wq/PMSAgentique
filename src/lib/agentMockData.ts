// DEV ONLY — Agentic Architecture mock data (PROMPT 17)
// ADR-017: Human-in-the-loop mandatory · Tool Registry · jamais DB directe
import type { AgentDefinition, ApprovalRequest, AgentLog } from '@/types/agent';

export const MOCK_AGENTS: AgentDefinition[] = [
  {
    id: 'agent-booking', name: 'Booking Intelligence', domain: 'reservation', model: 'gpt-4o', status: 'active',
    description: "Analyse les demandes de réservation, suggère les tarifs optimaux et peut confirmer les réservations directes après approbation.",
    capabilities: ['read_data', 'draft_content', 'suggest_action', 'execute_with_approval'],
    actions_today: 4, approvals_pending: 2, total_executions: 847, success_rate: 96,
    last_active_at: '2026-08-10T11:55:00Z',
    constraints: [
      "Ne peut jamais confirmer une réservation OTA sans approbation (ADR-010)",
      "Calculs de montants interdits — fonctions déterministes uniquement (ADR-015)",
      "Messages = brouillons uniquement, jamais d'envoi automatique (ADR-012)",
    ],
    available_actions: [
      { id: 'suggest_pricing', name: 'Suggérer tarif optimal', description: "Analyse occupation + marché pour proposer un tarif compétitif.", capability: 'suggest_action', impact: 'medium', requires_approval: false, domain: 'reservation', forbidden: false },
      { id: 'auto_confirm_direct', name: 'Confirmer réservation directe', description: "Confirme une réservation directe éligible après vérification des critères.", capability: 'execute_with_approval', impact: 'high', requires_approval: true, domain: 'reservation', forbidden: false },
      { id: 'draft_rejection', name: 'Rédiger message de refus', description: "Rédige un brouillon de refus personnalisé. Jamais envoyé automatiquement.", capability: 'draft_content', impact: 'low', requires_approval: false, domain: 'communications', forbidden: false },
      { id: 'block_dates', name: 'Bloquer des dates', description: "Bloque des dates pour maintenance ou nettoyage profond.", capability: 'execute_with_approval', impact: 'medium', requires_approval: true, domain: 'calendar', forbidden: false },
      { id: 'calculate_charges', name: 'Calculer les charges', description: "INTERDIT — calculs financiers déterministes uniquement (ADR-015).", capability: 'read_data', impact: 'high', requires_approval: false, domain: 'finance', forbidden: true },
    ],
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'agent-pricing', name: 'Dynamic Pricing', domain: 'calendar', model: 'claude-3-sonnet', status: 'active',
    description: "Surveille l'occupation, la concurrence et la saisonnalité pour suggérer des ajustements tarifaires. Applique les changements uniquement après validation humaine.",
    capabilities: ['read_data', 'suggest_action', 'execute_with_approval'],
    actions_today: 6, approvals_pending: 3, total_executions: 1203, success_rate: 94,
    last_active_at: '2026-08-10T11:52:00Z',
    constraints: [
      "Jamais appliquer un tarif sans approbation humaine (impact: high)",
      "Calculs de revenus ou commissions interdits (ADR-015)",
      "Variation max suggérée : ±30% sans explication documentée",
    ],
    available_actions: [
      { id: 'suggest_weekend_rate', name: 'Suggérer tarif week-end', description: "Propose un ajustement basé sur taux d'occupation zone et historique.", capability: 'suggest_action', impact: 'medium', requires_approval: false, domain: 'calendar', forbidden: false },
      { id: 'apply_rate_adjustment', name: 'Appliquer ajustement tarifaire', description: "Modifie le tarif d'une ou plusieurs unités sur une période donnée.", capability: 'execute_with_approval', impact: 'high', requires_approval: true, domain: 'calendar', forbidden: false },
      { id: 'apply_discount', name: 'Appliquer remise early-bird', description: "Applique une remise pour réservations anticipées.", capability: 'execute_with_approval', impact: 'high', requires_approval: true, domain: 'calendar', forbidden: false },
      { id: 'calc_revenue_forecast', name: 'Calculer prévision revenus', description: "INTERDIT — projections financières réservées aux fonctions déterministes (ADR-015).", capability: 'read_data', impact: 'critical', requires_approval: false, domain: 'finance', forbidden: true },
    ],
    created_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'agent-housekeeping', name: 'Housekeeping Optimizer', domain: 'housekeeping', model: 'gpt-4o-mini', status: 'idle',
    description: "Optimise les plannings de ménage, anticipe les conflits d'agenda et suggère les priorités selon les arrivées/départs du jour.",
    capabilities: ['read_data', 'suggest_action', 'execute_with_approval'],
    actions_today: 3, approvals_pending: 1, total_executions: 532, success_rate: 98,
    last_active_at: '2026-08-10T11:45:00Z',
    constraints: [
      "Ne peut pas modifier les checklists — append-only (ADR-013)",
      "Assignation automatique uniquement pour jobs low/medium priority",
      "Ne peut pas signaler un incident sans confirmation de l'agent ménage",
    ],
    available_actions: [
      { id: 'suggest_priority', name: 'Suggérer priorité job', description: "Analyse les arrivées/départs pour recommander l'ordre d'exécution optimal.", capability: 'suggest_action', impact: 'low', requires_approval: false, domain: 'housekeeping', forbidden: false },
      { id: 'auto_assign_job', name: 'Assigner un job', description: "Assigne un job ménage à l'agent disponible optimal.", capability: 'execute_with_approval', impact: 'low', requires_approval: true, domain: 'housekeeping', forbidden: false },
      { id: 'optimize_schedule', name: 'Optimiser le planning', description: "Propose une réorganisation du planning journalier pour minimiser les délais.", capability: 'suggest_action', impact: 'medium', requires_approval: false, domain: 'housekeeping', forbidden: false },
    ],
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'agent-communication', name: 'Guest Communication', domain: 'communications', model: 'gpt-4o', status: 'active',
    description: "Rédige des brouillons de réponses personnalisés, traduit les messages et catégorise les conversations. N'envoie JAMAIS de messages automatiquement.",
    capabilities: ['read_data', 'draft_content'],
    actions_today: 5, approvals_pending: 0, total_executions: 1876, success_rate: 99,
    last_active_at: '2026-08-10T11:48:00Z',
    constraints: [
      "JAMAIS d'envoi automatique de messages — RGPD Art. 22 (ADR-012)",
      "Brouillons uniquement — validation et envoi par un humain obligatoire",
      "Accès aux données de paiement des voyageurs interdit",
      "Archivage des brouillons rejetés pour amélioration continue",
    ],
    available_actions: [
      { id: 'draft_response', name: 'Rédiger brouillon de réponse', description: "Génère un brouillon personnalisé basé sur le contexte de la conversation.", capability: 'draft_content', impact: 'low', requires_approval: false, domain: 'communications', forbidden: false },
      { id: 'translate_message', name: 'Traduire un message', description: "Traduit un message entrant (AR/EN/FR) avec contexte culturel.", capability: 'read_data', impact: 'low', requires_approval: false, domain: 'communications', forbidden: false },
      { id: 'categorize_conversation', name: 'Catégoriser conversation', description: "Classe automatiquement les conversations par urgence et type.", capability: 'read_data', impact: 'low', requires_approval: false, domain: 'communications', forbidden: false },
      { id: 'send_message_auto', name: 'Envoyer message automatique', description: "INTERDIT — envoi automatique interdit (ADR-012 · RGPD Art. 22).", capability: 'draft_content', impact: 'critical', requires_approval: false, domain: 'communications', forbidden: true },
    ],
    created_at: '2026-04-15T00:00:00Z',
  },
  {
    id: 'agent-maintenance', name: 'Maintenance Predictor', domain: 'maintenance', model: 'gpt-4o-mini', status: 'active',
    description: "Analyse les données capteurs et l'historique d'incidents pour prédire les pannes et créer des tickets prioritaires.",
    capabilities: ['read_data', 'suggest_action', 'execute_with_approval'],
    actions_today: 4, approvals_pending: 1, total_executions: 284, success_rate: 91,
    last_active_at: '2026-08-10T11:42:00Z',
    constraints: [
      "Les tickets critiques doivent être approuvés avant création (ADR-014)",
      "Accès aux codes d'accès des serrures interdit (ISmartLockProvider)",
      "Escalade automatique vers superviseur si ticket critical non validé dans 1h",
    ],
    available_actions: [
      { id: 'predict_failure', name: 'Prédire défaillance', description: "Analyse les anomalies pour détecter les risques de panne imminente.", capability: 'suggest_action', impact: 'medium', requires_approval: false, domain: 'maintenance', forbidden: false },
      { id: 'create_ticket', name: 'Créer ticket maintenance', description: "Crée un ticket prioritaire avec catégorie, description et unité concernée.", capability: 'execute_with_approval', impact: 'medium', requires_approval: true, domain: 'maintenance', forbidden: false },
      { id: 'escalate_priority', name: 'Escalader en critique', description: "Remonte la priorité d'un ticket existant vers critical.", capability: 'execute_with_approval', impact: 'high', requires_approval: true, domain: 'maintenance', forbidden: false },
    ],
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'agent-reporting', name: 'Analytics & Insights', domain: 'finance', model: 'claude-3-haiku', status: 'active',
    description: "Génère des résumés KPI, identifie les tendances de performance et prépare les rapports propriétaires. N'envoie jamais de relevés sans approbation.",
    capabilities: ['read_data', 'draft_content', 'suggest_action', 'execute_with_approval'],
    actions_today: 3, approvals_pending: 1, total_executions: 412, success_rate: 97,
    last_active_at: '2026-08-10T11:30:00Z',
    constraints: [
      "Calculs de montants interdits — NUMERIC(12,4) déterministes uniquement (ADR-015)",
      "Les relevés propriétaires nécessitent approbation avant envoi",
      "Accès en lecture seule aux données financières",
    ],
    available_actions: [
      { id: 'generate_kpi_summary', name: 'Générer résumé KPIs', description: "Synthétise les métriques clés du mois (occupation, revenus, ADR).", capability: 'read_data', impact: 'low', requires_approval: false, domain: 'finance', forbidden: false },
      { id: 'export_report', name: 'Exporter rapport', description: "Génère un rapport CSV/PDF à partir des données du grand livre.", capability: 'suggest_action', impact: 'low', requires_approval: false, domain: 'finance', forbidden: false },
      { id: 'send_owner_statement', name: 'Envoyer relevé propriétaire', description: "Envoie par email le relevé mensuel au propriétaire (W-12 post-approbation).", capability: 'execute_with_approval', impact: 'high', requires_approval: true, domain: 'finance', forbidden: false },
      { id: 'compute_financial_totals', name: 'Calculer totaux financiers', description: "INTERDIT — calculs réservés aux fonctions NUMERIC(12,4) (ADR-015).", capability: 'read_data', impact: 'critical', requires_approval: false, domain: 'finance', forbidden: true },
    ],
    created_at: '2026-05-15T00:00:00Z',
  },
];

export const getAgentById = (id: string): AgentDefinition | undefined =>
  MOCK_AGENTS.find(a => a.id === id);

// ── Pending Approvals ────────────────────────────────────────────────────────

export const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: 'appr-001', agent_id: 'agent-pricing', agent_name: 'Dynamic Pricing',
    action_id: 'apply_rate_adjustment', action_name: 'Appliquer ajustement tarifaire +18%',
    action_description: "Modifier le tarif de la Villa Bellevue (unit-001) pour le week-end 15-17 août 2026.",
    impact: 'high', domain: 'calendar',
    context_summary: "Taux d'occupation de la zone est à 82%. Concurrents ont augmenté leurs tarifs de 15-25%. Tarif actuel : 185 CAD/nuit.",
    suggested_value: "218 CAD/nuit · villa-001 · 15-17 août 2026",
    requested_at: '2026-08-10T11:52:00Z', expires_at: '2026-08-10T18:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
  {
    id: 'appr-002', agent_id: 'agent-pricing', agent_name: 'Dynamic Pricing',
    action_id: 'apply_discount', action_name: 'Remise early-bird -12% sept/oct',
    action_description: "Appliquer une remise early-bird sur les appartements Larivière (unit-002, unit-003) pour sept/oct.",
    impact: 'high', domain: 'calendar',
    context_summary: "Taux d'occupation prévu sept/oct : 34% (bien en dessous de la moyenne 62%). La remise early-bird a augmenté l'occupation de 18% lors de la même période l'an passé.",
    suggested_value: "-12% pour résas confirmées avant le 25 août · unit-002, unit-003",
    requested_at: '2026-08-10T10:15:00Z', expires_at: '2026-08-10T20:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
  {
    id: 'appr-003', agent_id: 'agent-booking', agent_name: 'Booking Intelligence',
    action_id: 'auto_confirm_direct', action_name: 'Confirmer réservation directe res-116',
    action_description: "Confirmer la réservation directe de Sophie Marchand (4 nuits, 12-16 sept, Villa Bellevue).",
    impact: 'high', domain: 'reservation',
    context_summary: "Réservation directe reçue via site web. Guest vérifiée (2 séjours précédents, note 4.9/5). Aucun conflit calendrier détecté.",
    suggested_value: "Confirmer res-116 · 740 CAD · check-in 12 sept",
    requested_at: '2026-08-10T09:30:00Z', expires_at: '2026-08-10T14:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
  {
    id: 'appr-004', agent_id: 'agent-pricing', agent_name: 'Dynamic Pricing',
    action_id: 'block_dates', action_name: 'Bloquer 22-25 août (maintenance propriétaire)',
    action_description: "Bloquer les dates du 22 au 25 août 2026 sur Villa Hassan II (unit-005) pour maintenance propriétaire Karim Mansouri.",
    impact: 'medium', domain: 'calendar',
    context_summary: "Aucune réservation confirmée sur cette période. Perte de revenu estimée : 3 nuits × 220 EUR.",
    suggested_value: "Blocage unit-005 · 22-25 août 2026 · motif: owner_maintenance",
    requested_at: '2026-08-10T08:00:00Z', expires_at: '2026-08-11T08:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
  {
    id: 'appr-005', agent_id: 'agent-housekeeping', agent_name: 'Housekeeping Optimizer',
    action_id: 'auto_assign_job', action_name: 'Assigner job-13 à Sophie Lalonde',
    action_description: "Assigner le job de nettoyage post-départ (job-13, Villa Bellevue) à Sophie Lalonde disponible à 14h00.",
    impact: 'low', domain: 'housekeeping',
    context_summary: "Marie-Claire Côté est surchargée (3 jobs aujourd'hui). Sophie Lalonde est disponible dès 14h00 et a déjà nettoyé Villa Bellevue 6 fois. Prochain arrivant à 17h00.",
    suggested_value: "Assigner job-13 → Sophie Lalonde (hk-003) · début 14h00",
    requested_at: '2026-08-10T11:45:00Z', expires_at: '2026-08-10T16:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
  {
    id: 'appr-006', agent_id: 'agent-maintenance', agent_name: 'Maintenance Predictor',
    action_id: 'create_ticket', action_name: 'Créer ticket CRITIQUE : climatiseur unit-004',
    action_description: "Créer un ticket de maintenance critique pour le système de climatisation de l'appartement Fès (unit-004).",
    impact: 'critical', domain: 'maintenance',
    context_summary: "Température chambre principale : 31°C (normale : 22°C). 3 anomalies capteur compresseur en 48h. Réservation active jusqu'au 15 août (3 voyageurs présents). Escalade automatique si non traité dans 1h.",
    suggested_value: "Ticket CRITICAL · unit-004 · catégorie: hvac · intervention immédiate",
    requested_at: '2026-08-10T11:40:00Z', expires_at: '2026-08-10T13:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
  {
    id: 'appr-007', agent_id: 'agent-reporting', agent_name: 'Analytics & Insights',
    action_id: 'send_owner_statement', action_name: 'Envoyer relevé juillet 2026 à Pierre Moreau',
    action_description: "Envoyer par email le relevé financier de juillet 2026 à Pierre Moreau (Villa Bellevue + Appartement Montréal).",
    impact: 'high', domain: 'finance',
    context_summary: "Relevé juillet 2026 généré le 01/08 par W-11. Le propriétaire a relancé ce matin. Montant net : 4 287,50 CAD (après frais gestion 18%).",
    suggested_value: "Envoyer stmt-001 · 4 287,50 CAD net · pierre.moreau@example.com",
    requested_at: '2026-08-10T10:00:00Z', expires_at: '2026-08-12T10:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-12',
  },
  {
    id: 'appr-008', agent_id: 'agent-booking', agent_name: 'Booking Intelligence',
    action_id: 'block_dates', action_name: 'Bloquer 28 août (nettoyage profond 3 unités)',
    action_description: "Bloquer le 28 août 2026 sur 3 unités (unit-001, unit-002, unit-003) pour nettoyage profond saisonnier.",
    impact: 'medium', domain: 'calendar',
    context_summary: "Nettoyage profond recommandé tous les 3 mois. Dernière fois : 28 mai. Aucune réservation confirmée ce jour-là.",
    suggested_value: "Blocage unit-001, unit-002, unit-003 · 28 août 2026 · motif: deep_cleaning",
    requested_at: '2026-08-10T10:00:00Z', expires_at: '2026-08-10T20:00:00Z',
    status: 'pending', n8n_workflow_ref: 'W-13',
  },
];

// ── Agent Logs (15 entries) ───────────────────────────────────────────────────

export const MOCK_AGENT_LOGS: AgentLog[] = [
  { id: 'alog-001', agent_id: 'agent-booking', agent_name: 'Booking Intelligence', action_name: 'Suggérer tarif optimal', status: 'success', duration_ms: 1240, result_summary: 'Tarif optimal 195 CAD/nuit pour villa-001 (15-17 août) — +5% vs tarif actuel', executed_at: '2026-08-10T11:55:00Z' },
  { id: 'alog-002', agent_id: 'agent-pricing', agent_name: 'Dynamic Pricing', action_name: 'Créer demande appr-001', status: 'info', duration_ms: 890, approval_id: 'appr-001', result_summary: 'ApprovalRequest créée — en attente de validation gestionnaire', executed_at: '2026-08-10T11:52:00Z' },
  { id: 'alog-003', agent_id: 'agent-communication', agent_name: 'Guest Communication', action_name: 'Rédiger brouillon de réponse', status: 'success', duration_ms: 2100, result_summary: 'Brouillon rédigé pour conv-003 (question WiFi, réponse bilingue FR/EN)', executed_at: '2026-08-10T11:48:00Z' },
  { id: 'alog-004', agent_id: 'agent-housekeeping', agent_name: 'Housekeeping Optimizer', action_name: 'Suggérer priorité job', status: 'success', duration_ms: 560, result_summary: 'Job-13 priorité élevée : prochain arrivant dans 4h (Villa Bellevue)', executed_at: '2026-08-10T11:45:00Z' },
  { id: 'alog-005', agent_id: 'agent-maintenance', agent_name: 'Maintenance Predictor', action_name: 'Prédire défaillance', status: 'warning', duration_ms: 780, result_summary: 'Risque climatiseur unit-004 (3 anomalies capteur en 48h) — ticket recommandé', executed_at: '2026-08-10T11:42:00Z' },
  { id: 'alog-006', agent_id: 'agent-maintenance', agent_name: 'Maintenance Predictor', action_name: 'Créer demande appr-006', status: 'info', duration_ms: 420, approval_id: 'appr-006', result_summary: 'Ticket CRITIQUE climatiseur — ApprovalRequest créée (expire dans 1h)', executed_at: '2026-08-10T11:40:00Z' },
  { id: 'alog-007', agent_id: 'agent-reporting', agent_name: 'Analytics & Insights', action_name: 'Générer résumé KPIs', status: 'success', duration_ms: 3200, result_summary: 'KPIs août : 68% occupation · 12 450 CAD revenus · ADR 185 CAD', executed_at: '2026-08-10T11:30:00Z' },
  { id: 'alog-008', agent_id: 'agent-booking', agent_name: 'Booking Intelligence', action_name: 'Rédiger message de refus', status: 'success', duration_ms: 1850, result_summary: 'Brouillon refus rédigé (séjour minimum non respecté) — en attente validation', executed_at: '2026-08-10T11:15:00Z' },
  { id: 'alog-009', agent_id: 'agent-communication', agent_name: 'Guest Communication', action_name: 'Traduire un message', status: 'success', duration_ms: 1120, result_summary: 'Message traduit AR→FR pour conv-007 (285 mots, voyageur Maroc)', executed_at: '2026-08-10T11:00:00Z' },
  { id: 'alog-010', agent_id: 'agent-pricing', agent_name: 'Dynamic Pricing', action_name: 'Suggérer tarif week-end', status: 'success', duration_ms: 1680, result_summary: 'Tarif suggéré +22% (taux remplissage zone 80% · concurrents +18-25%)', executed_at: '2026-08-10T10:45:00Z' },
  { id: 'alog-011', agent_id: 'agent-communication', agent_name: 'Guest Communication', action_name: 'Envoyer message automatique', status: 'blocked', duration_ms: 0, error_message: "Action INTERDITE — ADR-012 interdit l'envoi automatique de messages (RGPD Art. 22)", executed_at: '2026-08-10T10:30:00Z' },
  { id: 'alog-012', agent_id: 'agent-housekeeping', agent_name: 'Housekeeping Optimizer', action_name: 'Assigner un job (exécuté)', status: 'success', duration_ms: 540, approval_id: 'appr-prev-004', result_summary: 'Job-12 assigné à Marie-Claire Côté (approuvé par admin@pms.local)', executed_at: '2026-08-10T10:20:00Z' },
  { id: 'alog-013', agent_id: 'agent-reporting', agent_name: 'Analytics & Insights', action_name: 'Créer demande appr-007', status: 'info', duration_ms: 320, approval_id: 'appr-007', result_summary: 'Envoi relevé Pierre Moreau (4 287,50 CAD) — ApprovalRequest créée', executed_at: '2026-08-10T10:00:00Z' },
  { id: 'alog-014', agent_id: 'agent-pricing', agent_name: 'Dynamic Pricing', action_name: 'Calculer prévision revenus', status: 'blocked', duration_ms: 0, error_message: "Action INTERDITE — calculs financiers réservés aux fonctions NUMERIC(12,4) déterministes (ADR-015)", executed_at: '2026-08-10T09:45:00Z' },
  { id: 'alog-015', agent_id: 'agent-booking', agent_name: 'Booking Intelligence', action_name: 'Confirmer réservation directe', status: 'info', duration_ms: 5200, approval_id: 'appr-003', result_summary: "Critères validés — ApprovalRequest appr-003 créée (expire à 14h00)", executed_at: '2026-08-10T09:30:00Z' },
];

// ── Display constants ─────────────────────────────────────────────────────────

export const AGENT_STATUS_CONFIG = {
  active: { label: 'Actif', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  idle: { label: 'Inactif', color: 'text-slate-400', bg: 'bg-secondary', border: 'border-border' },
  running: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  paused: { label: 'En pause', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  error: { label: 'Erreur', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

export const CAPABILITY_LABELS: Record<string, string> = {
  read_data: 'Lecture',
  draft_content: 'Rédaction',
  suggest_action: 'Suggestion',
  execute_with_approval: 'Exécution*',
};

export const IMPACT_CONFIG = {
  critical: { label: 'Critique', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  high: { label: 'Élevé', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { label: 'Moyen', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { label: 'Faible', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

export const DOMAIN_BADGE_COLORS: Record<string, string> = {
  reservation: 'bg-blue-500/10 text-blue-300',
  calendar: 'bg-emerald-500/10 text-emerald-300',
  housekeeping: 'bg-pink-500/10 text-pink-300',
  communications: 'bg-teal-500/10 text-teal-300',
  maintenance: 'bg-orange-500/10 text-orange-300',
  finance: 'bg-green-500/10 text-green-300',
};
