// DEV ONLY — Guest profiles mock data (PROMPT 12)
import type { GuestProfile, GuestNote } from '@/types/guest';

const n = (id: string, gid: string, author: string, content: string): GuestNote => ({
  id, tenant_id: 'tenant-demo', guest_id: gid, author, content, created_at: '2026-06-01T10:00:00Z',
});

const g = (
  id: string, fn: string, ln: string, email: string, phone: string,
  cc: string, lang: GuestProfile['language'], initials: string, color: string,
  verified: boolean, rating: number, stays: number, spent: number, curr: string,
  prefs: Partial<GuestProfile['preferences']> = {},
  notes: GuestNote[] = [],
  lastStay?: string
): GuestProfile => ({
  id, tenant_id: 'tenant-demo', first_name: fn, last_name: ln, email, phone,
  country_code: cc, language: lang, avatar_initials: initials, avatar_color: color,
  is_verified: verified, rating, total_stays: stays, total_spent: spent, currency: curr,
  preferences: { communication_channel: 'email', language: lang, early_checkin: false, late_checkout: false, ...prefs },
  notes, created_at: '2025-06-01T10:00:00Z', last_stay_at: lastStay,
});

export const MOCK_GUEST_PROFILES: GuestProfile[] = [
  g('guest-01','Marie','Côté','marie.cote@example.com','+1 514-555-0101','CA','fr','MC','bg-rose-500/20 text-rose-400',true,4.9,3,2850,'CAD',
    {late_checkout:true,special_requests:'Lit bébé si disponible'},
    [n('note-01','guest-01','Admin','Voyageuse régulière — très soigneuse')],'2026-07-24T14:00:00Z'),

  g('guest-02','Jean','Martin','jean.martin@example.com','+1 418-555-0202','CA','fr','JM','bg-blue-500/20 text-blue-400',false,4.2,1,650,'CAD',
    {communication_channel:'sms'},[],'2026-08-05T14:00:00Z'),

  g('guest-03','Carlos','Gomez','carlos.gomez@example.com','+52 55-555-0303','MX','en','CG','bg-orange-500/20 text-orange-400',true,4.7,2,3200,'CAD',
    {early_checkin:true,communication_channel:'whatsapp'},
    [n('note-02','guest-03','Admin','Très propre — laisse la propriété impeccable')],'2026-08-06T12:00:00Z'),

  g('guest-04','Amira','Hassan','amira.hassan@example.com','+20 2-555-0404','EG','ar','AH','bg-purple-500/20 text-purple-400',true,5.0,4,4100,'CAD',
    {early_checkin:true,late_checkout:true,dietary:'végétalienne'},
    [n('note-03','guest-04','Admin','VIP — avis 5 étoiles systématiques')],'2026-07-25T11:00:00Z'),

  g('guest-05','Léa','Bouchard','lea.bouchard@example.com','+1 438-555-0505','CA','fr','LB','bg-emerald-500/20 text-emerald-400',true,4.6,2,720,'CAD',
    {communication_channel:'sms'},[],'2026-08-09T10:00:00Z'),

  g('guest-06','Liu','Wei','liu.wei@example.com','+86 10-555-0606','CN','en','LW','bg-yellow-500/20 text-yellow-400',false,3.8,1,1800,'CAD',
    {special_requests:'Cuisine asiatique à proximité'},[],'2026-08-01T15:00:00Z'),

  g('guest-07','Anna','Kowalski','anna.kowalski@example.com','+48 22-555-0707','PL','en','AK','bg-cyan-500/20 text-cyan-400',true,4.5,2,1400,'CAD',
    {late_checkout:true},[],'2026-08-03T11:00:00Z'),

  g('guest-08','Omar','Benali','omar.benali@example.com','+212 522-555-0808','MA','ar','OB','bg-red-500/20 text-red-400',false,4.0,1,3600,'MAD',
    {communication_channel:'whatsapp'},
    [n('note-04','guest-08','Admin','Signalement climatiseur — résolu 2026-07-28')],'2026-07-28T14:00:00Z'),

  g('guest-09','Sophie','Lambert','sophie.lambert@example.com','+33 1-555-0909','FR','fr','SL','bg-indigo-500/20 text-indigo-400',true,4.8,3,3900,'CAD',
    {early_checkin:true,dietary:'végétarienne'},
    [n('note-05','guest-09','Admin','Habituée — toujours 5 étoiles')],'2026-07-22T10:00:00Z'),

  g('guest-10','Fatima Zahra','Alaoui','fz.alaoui@example.com','+212 661-555-1010','MA','ar','FA','bg-teal-500/20 text-teal-400',true,4.9,2,5400,'MAD',
    {},[],'2026-07-15T12:00:00Z'),

  g('guest-11','David','Wilson','david.wilson@example.com','+1 212-555-1111','US','en','DW','bg-slate-500/20 text-slate-400',true,4.4,2,2200,'CAD',
    {},[],'2026-07-10T14:00:00Z'),

  g('guest-12','Nadia','Tazi','nadia.tazi@example.com','+212 537-555-1212','MA','fr','NT','bg-pink-500/20 text-pink-400',true,4.7,1,2800,'MAD',
    {},[],'2026-08-02T12:00:00Z'),

  g('guest-13','Raj','Patel','raj.patel@example.com','+91 22-555-1313','IN','en','RP','bg-amber-500/20 text-amber-400',false,3.9,1,950,'CAD',
    {special_requests:'Chambre non-fumeur impératif'},[],'2026-08-01T14:00:00Z'),

  g('guest-14','Lisa','Anderson','lisa.anderson@example.com','+1 310-555-1414','US','en','LA','bg-violet-500/20 text-violet-400',true,4.8,2,3500,'CAD',
    {late_checkout:true,dietary:'sans gluten'},
    [n('note-06','guest-14','Admin','Séjours longs — professionnelle')],'2026-07-27T10:00:00Z'),

  g('guest-15','Claire','Lavoie','claire.lavoie@example.com','+1 450-555-1515','CA','fr','CL','bg-lime-500/20 text-lime-400',true,4.6,1,1050,'CAD',
    {early_checkin:true},[],'2026-08-03T12:00:00Z'),
];

export const getGuestById = (id: string): GuestProfile | undefined =>
  MOCK_GUEST_PROFILES.find(g => g.id === id);

export const COUNTRY_LABELS: Record<string, string> = {
  CA: 'Canada', MX: 'Mexique', EG: 'Egypte', CN: 'Chine', PL: 'Pologne',
  MA: 'Maroc', FR: 'France', US: 'Etats-Unis', IN: 'Inde',
};

export const COUNTRY_FLAGS: Record<string, string> = {
  CA: '🇨🇦', MX: '🇲🇽', EG: '🇪🇬', CN: '🇨🇳', PL: '🇵🇱',
  MA: '🇲🇦', FR: '🇫🇷', US: '🇺🇸', IN: '🇮🇳',
};

export const LANG_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };
export const PREF_CHANNEL_LABELS: Record<string, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', in_app: 'In-App',
};
