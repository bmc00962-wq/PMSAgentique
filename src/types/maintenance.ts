// Maintenance module types — PROMPT 14
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'pending_parts' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory =
  | 'plumbing' | 'electrical' | 'hvac' | 'appliance'
  | 'structural' | 'cleaning' | 'lock' | 'other';

export interface MaintenanceIntervention {
  id: string;
  ticket_id: string;
  technician_name: string;
  action: string;
  notes?: string;
  duration_min?: number;
  created_at: string;
}

export interface MaintenanceTicket {
  id: string;
  tenant_id: string;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_name: string;
  housekeeping_job_id?: string;      // escalated from housekeeping
  reservation_id?: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to?: string;
  assigned_name?: string;
  reported_by: string;               // housekeeper name or staff
  photo_urls: string[];
  interventions: MaintenanceIntervention[];
  resolved_at?: string;
  created_at: string;
}

export interface MaintenanceFormValues {
  property_id: string;
  unit_id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  assigned_to: string;
  notes: string;
}
