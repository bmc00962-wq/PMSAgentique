// DEV ONLY — Housekeeping mock data (PROMPT 13)
import type { HousekeepingJob, Housekeeper, ChecklistItem, ChecklistCategory } from '@/types/housekeeping';

// ─── Housekeepers ─────────────────────────────────────────────────────────────
export const MOCK_HOUSEKEEPERS: Housekeeper[] = [
  { id: 'hk-01', tenant_id: 'tenant-demo', first_name: 'Martine', last_name: 'Tremblay',
    phone: '+1 514-555-2001', email: 'martine@pms.local',
    avatar_initials: 'MT', avatar_color: 'bg-rose-500/20 text-rose-400',
    is_active: true, jobs_completed: 142, jobs_this_month: 12, rating: 4.9, languages: ['fr'] },
  { id: 'hk-02', tenant_id: 'tenant-demo', first_name: 'Sonia', last_name: 'Bergeron',
    phone: '+1 418-555-2002', email: 'sonia@pms.local',
    avatar_initials: 'SB', avatar_color: 'bg-blue-500/20 text-blue-400',
    is_active: true, jobs_completed: 98, jobs_this_month: 8, rating: 4.7, languages: ['fr', 'en'] },
  { id: 'hk-03', tenant_id: 'tenant-demo', first_name: 'Fatima', last_name: 'Ouhssini',
    phone: '+212 661-555-2003', email: 'fatima@pms.local',
    avatar_initials: 'FO', avatar_color: 'bg-emerald-500/20 text-emerald-400',
    is_active: true, jobs_completed: 203, jobs_this_month: 15, rating: 5.0, languages: ['ar', 'fr'] },
  { id: 'hk-04', tenant_id: 'tenant-demo', first_name: 'Karim', last_name: 'Benali',
    phone: '+212 522-555-2004', email: 'karim@pms.local',
    avatar_initials: 'KB', avatar_color: 'bg-orange-500/20 text-orange-400',
    is_active: true, jobs_completed: 67, jobs_this_month: 6, rating: 4.5, languages: ['ar', 'fr'] },
  { id: 'hk-05', tenant_id: 'tenant-demo', first_name: 'Andrea', last_name: 'Santos',
    phone: '+1 438-555-2005', email: 'andrea@pms.local',
    avatar_initials: 'AS', avatar_color: 'bg-purple-500/20 text-purple-400',
    is_active: true, jobs_completed: 31, jobs_this_month: 4, rating: 4.3, languages: ['fr', 'en'] },
  { id: 'hk-06', tenant_id: 'tenant-demo', first_name: 'Nour', last_name: 'El Ain',
    phone: '+212 537-555-2006', email: 'nour@pms.local',
    avatar_initials: 'NE', avatar_color: 'bg-yellow-500/20 text-yellow-400',
    is_active: false, jobs_completed: 45, jobs_this_month: 0, rating: 4.6, languages: ['ar', 'fr'] },
];

export const HOUSEKEEPER_MAP: Record<string, Housekeeper> = Object.fromEntries(
  MOCK_HOUSEKEEPERS.map(h => [h.id, h])
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ci = (id: string, jid: string, cat: ChecklistCategory, task: string, done: boolean, photoReq = false): ChecklistItem => ({
  id, job_id: jid, category: cat, task, is_completed: done,
  completed_at: done ? '2026-08-09T10:00:00Z' : undefined,
  photo_required: photoReq,
});

const mkJob = (
  id: string,
  propId: string, propName: string,
  unitId: string, unitName: string,
  type: HousekeepingJob['type'], status: HousekeepingJob['status'], priority: HousekeepingJob['priority'],
  date: string, start: string, estMin: number,
  hkId: string | null,
  checklist: ChecklistItem[],
  opts: { resId?: string; notes?: string; issue?: string; actualMin?: number; startedAt?: string; completedAt?: string } = {}
): HousekeepingJob => {
  const hk = hkId ? HOUSEKEEPER_MAP[hkId] : null;
  return {
    id, tenant_id: 'tenant-demo',
    property_id: propId, property_name: propName,
    unit_id: unitId, unit_name: unitName,
    reservation_id: opts.resId,
    housekeeper_id: hkId ?? undefined,
    housekeeper_name: hk ? `${hk.first_name} ${hk.last_name}` : undefined,
    housekeeper_initials: hk?.avatar_initials,
    housekeeper_color: hk?.avatar_color,
    type, status, priority,
    scheduled_date: date, scheduled_start: start,
    estimated_duration: estMin, actual_duration: opts.actualMin,
    started_at: opts.startedAt, completed_at: opts.completedAt,
    checklist, notes: opts.notes, issue_description: opts.issue,
    created_at: '2026-08-08T08:00:00Z',
  };
};

// ─── Mock Jobs ────────────────────────────────────────────────────────────────
export const MOCK_JOBS: HousekeepingJob[] = [
  mkJob('job-01','prop-001','Le Loft Mile-End','unit-001','Studio A',
    'checkout_clean','done','normal','2026-08-07','10:00',90,'hk-01',
    [ci('c01a','job-01','chambre','Changer draps et taies',true),
     ci('c01b','job-01','chambre','Aspirer et laver le sol',true),
     ci('c01c','job-01','salle_de_bain','Nettoyer sanitaires et douche',true),
     ci('c01d','job-01','salle_de_bain','Changer serviettes et tapis',true),
     ci('c01e','job-01','cuisine','Nettoyer cuisiniere et plan de travail',true),
     ci('c01f','job-01','cuisine','Vider lave-vaisselle et ranger',true),
     ci('c01g','job-01','salon','Aspirer et depoussierer salon',true),
     ci('c01h','job-01','general','Photos de validation finale',true,true)],
    {resId:'res-101',actualMin:85,startedAt:'2026-08-07T10:05:00Z',completedAt:'2026-08-07T11:30:00Z'}),

  mkJob('job-02','prop-002','Maison Plateau Familiale','unit-004','Chambre Familiale',
    'checkout_clean','done','high','2026-08-06','09:00',120,'hk-02',
    [ci('c02a','job-02','chambre','Changer draps chambres (x3)',true),
     ci('c02b','job-02','chambre','Nettoyer et ranger', true),
     ci('c02c','job-02','salle_de_bain','Nettoyer 2 salles de bain',true),
     ci('c02d','job-02','cuisine','Nettoyer frigo et congelateur',true),
     ci('c02e','job-02','cuisine','Nettoyer four et micro-ondes',true),
     ci('c02f','job-02','salon','Aspirer tapis et canape',true),
     ci('c02g','job-02','general','Verifier inventaire',true),
     ci('c02h','job-02','general','Photos finales',true,true)],
    {resId:'res-102',actualMin:130,startedAt:'2026-08-06T09:10:00Z',completedAt:'2026-08-06T11:20:00Z'}),

  mkJob('job-03','prop-004','Chalet Mont-Tremblant','unit-007','Suite Principale',
    'mid_stay_clean','in_progress','normal','2026-08-09','11:00',60,'hk-01',
    [ci('c03a','job-03','chambre','Changer draps suite principale',true),
     ci('c03b','job-03','chambre','Aspirer chambre',true),
     ci('c03c','job-03','salle_de_bain','Nettoyer douche et baignoire',true),
     ci('c03d','job-03','salle_de_bain','Reapprovisionner produits accueil',true),
     ci('c03e','job-03','cuisine','Nettoyer plan de travail',false),
     ci('c03f','job-03','salon','Aspirer et depoussierer salon',false),
     ci('c03g','job-03','general','Vider poubelles',false)],
    {resId:'res-104',startedAt:'2026-08-09T11:05:00Z',notes:'Voyageurs presents le soir'}),

  mkJob('job-04','prop-001','Le Loft Mile-End','unit-001','Studio A',
    'checkout_clean','pending','high','2026-08-10','10:00',90,null,
    [ci('c04a','job-04','chambre','Changer draps et taies',false),
     ci('c04b','job-04','salle_de_bain','Nettoyage complet salle de bain',false),
     ci('c04c','job-04','cuisine','Nettoyer cuisiniere et comptoirs',false),
     ci('c04d','job-04','salon','Aspirer et depoussierer',false),
     ci('c04e','job-04','general','Photos de validation',false,true)],
    {notes:'Prochain check-in a 15h00 — priorite haute'}),

  mkJob('job-05','prop-005','Dar Zitoun Marrakech','unit-009','Chambre Jasmine',
    'deep_clean','assigned','normal','2026-08-11','08:00',180,'hk-03',
    [ci('c05a','job-05','chambre','Nettoyage murs et plafonds',false),
     ci('c05b','job-05','chambre','Laver rideaux et voilages',false),
     ci('c05c','job-05','salle_de_bain','Detartrage carrelage et robinetterie',false),
     ci('c05d','job-05','cuisine','Nettoyage complet cuisine et hottes',false),
     ci('c05e','job-05','salon','Nettoyage tapis et moquettes',false),
     ci('c05f','job-05','general','Desinfection complete surfaces',false),
     ci('c05g','job-05','general','Inventaire et signalement manques',false),
     ci('c05h','job-05','general','Photos avant/apres',false,true)],
    {notes:'Grand menage saisonnier — hors saison'}),

  mkJob('job-06','prop-002','Maison Plateau Familiale','unit-005','Suite Parents',
    'checkout_clean','pending','urgent','2026-08-09','13:00',75,null,
    [ci('c06a','job-06','chambre','Changer draps suite parentale',false),
     ci('c06b','job-06','salle_de_bain','Nettoyer douche et bain',false),
     ci('c06c','job-06','cuisine','Nettoyage rapide cuisine',false),
     ci('c06d','job-06','general','Vider poubelles toutes pieces',false),
     ci('c06e','job-06','general','Photo de validation',false,true)],
    {resId:'res-103',notes:'Urgent — prochain check-in 17h'}),

  mkJob('job-07','prop-003','Studio Cote-des-Neiges','unit-006','Studio A',
    'maintenance_prep','done','low','2026-08-05','14:00',45,'hk-05',
    [ci('c07a','job-07','general','Degager acces pour technicien',true),
     ci('c07b','job-07','cuisine','Deconnecter appareil defectueux',true),
     ci('c07c','job-07','general','Photo etat avant intervention',true,true),
     ci('c07d','job-07','general','Laisser cle technicien en boite',true)],
    {notes:'Preparation reparation climatiseur',actualMin:40,startedAt:'2026-08-05T14:05:00Z',completedAt:'2026-08-05T14:45:00Z'}),

  mkJob('job-08','prop-006','Villa Hassan II Marrakech','unit-011','Suite Royale',
    'checkout_clean','issue_reported','high','2026-08-08','09:00',90,'hk-04',
    [ci('c08a','job-08','chambre','Changer draps suite royale',true),
     ci('c08b','job-08','chambre','Aspirer et nettoyer sol',true),
     ci('c08c','job-08','salle_de_bain','Nettoyage salle de bain marbre',true),
     ci('c08d','job-08','salle_de_bain','Fuite robinetterie — signalee',true,true),
     ci('c08e','job-08','cuisine','Nettoyer kitchenette',true),
     ci('c08f','job-08','salon','Aspirer salon',true),
     ci('c08g','job-08','general','Rapport anomalie soumis',false)],
    {resId:'res-106',issue:'Fuite detectee sous robinet salle de bain — eau visible sur carrelage. Photos jointes. Technicien requis.',
     actualMin:95,startedAt:'2026-08-08T09:05:00Z'}),

  mkJob('job-09','prop-004','Chalet Mont-Tremblant','unit-008','Chambre 2',
    'mid_stay_clean','assigned','low','2026-08-10','14:00',45,'hk-02',
    [ci('c09a','job-09','chambre','Changer draps chambre 2',false),
     ci('c09b','job-09','salle_de_bain','Nettoyer salle de bain rapide',false),
     ci('c09c','job-09','general','Vider poubelles',false),
     ci('c09d','job-09','general','Reapprovisionner consommables',false)],
    {resId:'res-104'}),

  mkJob('job-10','prop-001','Le Loft Mile-End','unit-002','Loft B',
    'deep_clean','pending','normal','2026-08-12','08:00',240,null,
    [ci('c10a','job-10','chambre','Nettoyage profond chambre',false),
     ci('c10b','job-10','chambre','Laver couettes et oreillers',false),
     ci('c10c','job-10','salle_de_bain','Detartrage complet',false),
     ci('c10d','job-10','cuisine','Nettoyage hottes et appareils',false),
     ci('c10e','job-10','salon','Shampouinage moquette',false),
     ci('c10f','job-10','general','Inventaire complet',false),
     ci('c10g','job-10','general','Photos avant/apres',false,true)],
    {notes:'Grand menage fin de saison'}),

  mkJob('job-11','prop-005','Dar Zitoun Marrakech','unit-010','Suite Zitoun',
    'inspection','done','normal','2026-08-07','16:00',30,'hk-03',
    [ci('c11a','job-11','general','Verification climatisation',true),
     ci('c11b','job-11','general','Verification plomberie',true),
     ci('c11c','job-11','general','Verification electricite',true),
     ci('c11d','job-11','general','Photos etat general',true,true)],
    {actualMin:28,startedAt:'2026-08-07T16:02:00Z',completedAt:'2026-08-07T16:30:00Z'}),

  mkJob('job-12','prop-003','Studio Cote-des-Neiges','unit-006','Studio A',
    'checkout_clean','cancelled','normal','2026-08-08','10:00',60,null,
    [ci('c12a','job-12','chambre','Changer draps studio',false),
     ci('c12b','job-12','salle_de_bain','Nettoyage salle de bain',false),
     ci('c12c','job-12','general','Photos de validation',false,true)],
    {notes:'Annule — voyageur prolonge sejour de 1 nuit'}),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getJobById = (id: string): HousekeepingJob | undefined =>
  MOCK_JOBS.find(j => j.id === id);

// ─── Display constants ────────────────────────────────────────────────────────
export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'A faire', assigned: 'Assigne', in_progress: 'En cours',
  done: 'Termine', cancelled: 'Annule', issue_reported: 'Incident',
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  issue_reported: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  checkout_clean: 'Menage depart', mid_stay_clean: 'Menage mi-sejour',
  deep_clean: 'Grand menage', maintenance_prep: 'Prep maintenance',
  inspection: 'Inspection',
};

export const JOB_PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente',
};

export const JOB_PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-400', normal: 'text-foreground/70',
  high: 'text-orange-400', urgent: 'text-rose-400',
};

export const JOB_PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-slate-500/30', normal: 'border-l-border',
  high: 'border-l-orange-500', urgent: 'border-l-rose-500',
};

export const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  chambre: 'Chambre', salle_de_bain: 'Salle de bain',
  cuisine: 'Cuisine', salon: 'Salon / Sejour', general: 'General',
};
