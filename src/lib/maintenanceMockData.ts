// DEV ONLY — Maintenance mock data (PROMPT 14)
import type { MaintenanceTicket, MaintenanceIntervention } from '@/types/maintenance';

const mkIntervention = (
  id: string, ticketId: string, tech: string, action: string,
  notes?: string, durationMin?: number, createdAt = '2026-08-08T10:00:00Z'
): MaintenanceIntervention => ({ id, ticket_id: ticketId, technician_name: tech, action, notes, duration_min: durationMin, created_at: createdAt });

export const MOCK_TICKETS: MaintenanceTicket[] = [
  {
    id: 'mnt-01', tenant_id: 'tenant-demo',
    property_id: 'prop-006', property_name: 'Villa Hassan II Marrakech',
    unit_id: 'unit-011', unit_name: 'Suite Royale',
    housekeeping_job_id: 'job-08', reservation_id: 'res-106',
    title: 'Fuite robinetterie salle de bain',
    description: 'Fuite detectee sous le robinet du lavabo de la salle de bain. Eau visible sur le carrelage. Signalee par la gouvernante lors du menage depart le 08/08.',
    category: 'plumbing', status: 'in_progress', priority: 'high',
    assigned_to: 'tech-01', assigned_name: 'Youssef Radi',
    reported_by: 'Karim Benali (gouvernant)',
    photo_urls: [],
    interventions: [
      mkIntervention('int-01a','mnt-01','Youssef Radi','Diagnostic effectue — joint defectueux sous robinet lavabo','Piece necessaire: joint ceramique DN15',20,'2026-08-08T11:00:00Z'),
      mkIntervention('int-01b','mnt-01','Youssef Radi','Commande piece effectuee — livraison J+1',undefined,undefined,'2026-08-08T11:30:00Z'),
    ],
    created_at: '2026-08-08T09:30:00Z',
  },
  {
    id: 'mnt-02', tenant_id: 'tenant-demo',
    property_id: 'prop-001', property_name: 'Le Loft Mile-End',
    unit_id: 'unit-002', unit_name: 'Loft B',
    title: 'Climatiseur ne refroidit plus',
    description: 'Le climatiseur mural du salon souffle de l air chaud. Temperature interieure 28C. Signale par le voyageur le 07/08 en soiree.',
    category: 'hvac', status: 'resolved', priority: 'high',
    assigned_to: 'tech-02', assigned_name: 'Daniel Morin',
    reported_by: 'Jean Martin (voyageur)',
    photo_urls: [],
    interventions: [
      mkIntervention('int-02a','mnt-02','Daniel Morin','Verification niveau de gaz refrigerant — niveau bas',undefined,30,'2026-08-08T09:00:00Z'),
      mkIntervention('int-02b','mnt-02','Daniel Morin','Recharge gaz R32 + verification etancheite — systeme operationnel',undefined,60,'2026-08-08T10:30:00Z'),
    ],
    resolved_at: '2026-08-08T11:30:00Z', created_at: '2026-08-07T21:00:00Z',
  },
  {
    id: 'mnt-03', tenant_id: 'tenant-demo',
    property_id: 'prop-003', property_name: 'Studio Cote-des-Neiges',
    unit_id: 'unit-006', unit_name: 'Studio A',
    title: 'Panne partielle electrique cuisine',
    description: 'Les prises electriques de la cuisine ne fonctionnent plus. Disjoncteur a saute. Les autres pieces fonctionnent normalement.',
    category: 'electrical', status: 'open', priority: 'critical',
    assigned_to: undefined, assigned_name: undefined,
    reported_by: 'Martine Tremblay (gouvernante)',
    photo_urls: [],
    interventions: [],
    created_at: '2026-08-09T08:00:00Z',
  },
  {
    id: 'mnt-04', tenant_id: 'tenant-demo',
    property_id: 'prop-002', property_name: 'Maison Plateau Familiale',
    unit_id: 'unit-004', unit_name: 'Cuisine principale',
    title: 'Lave-vaisselle en panne',
    description: 'Le lave-vaisselle affiche le code erreur E3 et ne draine plus. Signale par les voyageurs le 07/08.',
    category: 'appliance', status: 'assigned', priority: 'medium',
    assigned_to: 'tech-02', assigned_name: 'Daniel Morin',
    reported_by: 'Lea Bouchard (voyageur)',
    photo_urls: [],
    interventions: [
      mkIntervention('int-04a','mnt-04','Daniel Morin','Visite planifiee pour 10/08 matin','Code E3 = pompe de vidange defectueuse probable',0,'2026-08-08T14:00:00Z'),
    ],
    created_at: '2026-08-07T19:00:00Z',
  },
  {
    id: 'mnt-05', tenant_id: 'tenant-demo',
    property_id: 'prop-005', property_name: 'Dar Zitoun Marrakech',
    unit_id: 'unit-009', unit_name: 'Entree principale',
    title: 'Serrure electronique dysfonctionnelle',
    description: 'La serrure electronique de l entree ne reconnait plus les codes PIN. Le code maitre fonctionne encore. Voyageurs bloques 20 min le 08/08.',
    category: 'lock', status: 'resolved', priority: 'critical',
    assigned_to: 'tech-01', assigned_name: 'Youssef Radi',
    reported_by: 'Carlos Gomez (voyageur)',
    photo_urls: [],
    interventions: [
      mkIntervention('int-05a','mnt-05','Youssef Radi','Reinitialisation firmware serrure TTLock v3.2',undefined,15,'2026-08-08T20:00:00Z'),
      mkIntervention('int-05b','mnt-05','Youssef Radi','Codes voyageurs reprogrammes — tests OK','Firmware mis a jour vers v3.3',10,'2026-08-08T20:20:00Z'),
    ],
    resolved_at: '2026-08-08T20:30:00Z', created_at: '2026-08-08T19:45:00Z',
  },
  {
    id: 'mnt-06', tenant_id: 'tenant-demo',
    property_id: 'prop-004', property_name: 'Chalet Mont-Tremblant',
    unit_id: 'unit-007', unit_name: 'Terrasse',
    title: 'Lame de terrasse descellée — risque chute',
    description: 'Une lame de la terrasse en bois est descellée et se soulève. Risque de chute pour les voyageurs. Inspection structurelle nécessaire.',
    category: 'structural', status: 'open', priority: 'critical',
    assigned_to: undefined, assigned_name: undefined,
    reported_by: 'Sonia Bergeron (gouvernante)',
    photo_urls: [],
    interventions: [],
    created_at: '2026-08-09T07:30:00Z',
  },
];

export const getTicketById = (id: string): MaintenanceTicket | undefined => MOCK_TICKETS.find(t => t.id === id);

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', assigned: 'Assigne', in_progress: 'En cours',
  pending_parts: 'Pieces en attente', resolved: 'Resolu', closed: 'Clos',
};
export const TICKET_STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  pending_parts: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};
export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique',
};
export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-400', medium: 'text-yellow-400', high: 'text-orange-400', critical: 'text-rose-400',
};
export const TICKET_PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-slate-500/30', medium: 'border-l-yellow-500',
  high: 'border-l-orange-500', critical: 'border-l-rose-500',
};
export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Plomberie', electrical: 'Electricite', hvac: 'Climatisation / Chauffage',
  appliance: 'Electromenager', structural: 'Structure / Gros oeuvre',
  cleaning: 'Nettoyage profond', lock: 'Serrure / Acces', other: 'Autre',
};
