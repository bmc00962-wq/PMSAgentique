// Guest module types — PROMPT 12
export type GuestLanguage = 'fr' | 'en' | 'ar';
export type PreferredChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';

export interface GuestPreferences {
  communication_channel: PreferredChannel;
  language: GuestLanguage;
  early_checkin: boolean;
  late_checkout: boolean;
  dietary?: string;
  special_requests?: string;
}

export interface GuestNote {
  id: string;
  tenant_id: string;
  guest_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface GuestProfile {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country_code: string;
  language: GuestLanguage;
  avatar_initials: string;
  avatar_color: string;
  is_verified: boolean;
  rating: number;
  total_stays: number;
  total_spent: number;
  currency: string;
  preferences: GuestPreferences;
  notes: GuestNote[];
  created_at: string;
  last_stay_at?: string;
}
