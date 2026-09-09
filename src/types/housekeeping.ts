// Housekeeping module types — PROMPT 13
export type JobStatus = 'pending' | 'assigned' | 'in_progress' | 'done' | 'cancelled' | 'issue_reported';
export type JobType = 'checkout_clean' | 'mid_stay_clean' | 'deep_clean' | 'maintenance_prep' | 'inspection';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ChecklistCategory = 'chambre' | 'salle_de_bain' | 'cuisine' | 'salon' | 'general';

export interface ChecklistItem {
  id: string;
  job_id: string;
  category: ChecklistCategory;
  task: string;
  is_completed: boolean;
  completed_at?: string;
  photo_required: boolean;
}

export interface Housekeeper {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  avatar_initials: string;
  avatar_color: string;
  is_active: boolean;
  jobs_completed: number;
  jobs_this_month: number;
  rating: number;
  languages: string[];
}

export interface HousekeepingJob {
  id: string;
  tenant_id: string;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_name: string;
  reservation_id?: string;
  housekeeper_id?: string;
  housekeeper_name?: string;
  housekeeper_initials?: string;
  housekeeper_color?: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  scheduled_date: string;
  scheduled_start?: string;
  estimated_duration: number; // minutes
  actual_duration?: number;
  started_at?: string;
  completed_at?: string;
  checklist: ChecklistItem[];
  notes?: string;
  issue_description?: string;
  created_at: string;
}

export interface HousekeepingFormValues {
  property_id: string;
  unit_id: string;
  type: JobType;
  priority: JobPriority;
  scheduled_date: string;
  scheduled_start: string;
  estimated_duration: number;
  housekeeper_id: string;
  notes: string;
}
