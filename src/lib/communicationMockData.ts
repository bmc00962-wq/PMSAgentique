// DEV ONLY — Communication mock data (PROMPT 12)
import type { Conversation, MessageTemplate } from '@/types/communication';

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001', tenant_id: 'tenant-demo',
    guest_id: 'guest-01', guest_name: 'Marie Côté', guest_initials: 'MC',
    reservation_id: 'res-101', property_name: 'Le Loft Mile-End',
    channel: 'email', status: 'closed',
    subject: "Instructions arrivée — Loft Mile-End",
    last_message: "Merci beaucoup, à bientôt !",
    last_message_at: '2026-07-23T16:30:00Z', unread_count: 0,
    messages: [
      { id: 'msg-001a', conversation_id: 'conv-001', sender: 'system', sender_name: 'PMS Auto', content: "Bonjour Marie, votre réservation au Loft Mile-End est confirmée. Code porte #1847, disponible à partir de 15h.", sent_at: '2026-07-20T10:05:00Z', read_at: '2026-07-20T10:30:00Z' },
      { id: 'msg-001b', conversation_id: 'conv-001', sender: 'guest', sender_name: 'Marie Côté', content: "Merci pour les infos ! Y a-t-il un lit bébé disponible ?", sent_at: '2026-07-20T14:15:00Z', read_at: '2026-07-20T15:00:00Z' },
      { id: 'msg-001c', conversation_id: 'conv-001', sender: 'agent', sender_name: 'Admin PMS', content: "Bonjour Marie, oui ! Un lit bébé sera installé avant votre arrivée.", sent_at: '2026-07-20T15:30:00Z', read_at: '2026-07-20T16:00:00Z' },
      { id: 'msg-001d', conversation_id: 'conv-001', sender: 'guest', sender_name: 'Marie Côté', content: "Merci beaucoup, à bientôt !", sent_at: '2026-07-23T16:30:00Z' },
    ],
  },
  {
    id: 'conv-002', tenant_id: 'tenant-demo',
    guest_id: 'guest-02', guest_name: 'Jean Martin', guest_initials: 'JM',
    reservation_id: 'res-102', property_name: 'Maison Plateau Familiale',
    channel: 'sms', status: 'waiting_agent',
    subject: 'Demande arrivée tardive 23h',
    last_message: 'Mon vol arrive à 22h30, je serai là vers 23h.',
    last_message_at: '2026-08-04T20:00:00Z', unread_count: 2,
    messages: [
      { id: 'msg-002a', conversation_id: 'conv-002', sender: 'guest', sender_name: 'Jean Martin', content: 'Bonjour, mon vol arrive à 22h30, je serai là vers 23h. Est-ce possible ?', sent_at: '2026-08-04T19:45:00Z' },
      { id: 'msg-002b', conversation_id: 'conv-002', sender: 'guest', sender_name: 'Jean Martin', content: 'Mon vol arrive à 22h30, je serai là vers 23h.', sent_at: '2026-08-04T20:00:00Z' },
    ],
  },
  {
    id: 'conv-003', tenant_id: 'tenant-demo',
    guest_id: 'guest-03', guest_name: 'Carlos Gomez', guest_initials: 'CG',
    reservation_id: 'res-104', property_name: 'Chalet Mont-Tremblant',
    channel: 'whatsapp', status: 'closed',
    subject: 'Question parking chalet',
    last_message: "Super, on se retrouve là-bas !",
    last_message_at: '2026-08-01T12:00:00Z', unread_count: 0,
    messages: [
      { id: 'msg-003a', conversation_id: 'conv-003', sender: 'guest', sender_name: 'Carlos Gomez', content: 'Bonjour ! Combien de voitures peuvent être garées au chalet ?', sent_at: '2026-07-31T15:00:00Z', read_at: '2026-07-31T15:30:00Z' },
      { id: 'msg-003b', conversation_id: 'conv-003', sender: 'agent', sender_name: 'Admin PMS', content: 'Bonjour Carlos ! Le chalet dispose de 4 places de parking privées.', sent_at: '2026-07-31T16:00:00Z', read_at: '2026-07-31T16:30:00Z' },
      { id: 'msg-003c', conversation_id: 'conv-003', sender: 'guest', sender_name: 'Carlos Gomez', content: "Super, on se retrouve là-bas !", sent_at: '2026-08-01T12:00:00Z' },
    ],
  },
  {
    id: 'conv-004', tenant_id: 'tenant-demo',
    guest_id: 'guest-08', guest_name: 'Omar Benali', guest_initials: 'OB',
    reservation_id: 'res-105', property_name: 'Dar Zitoun Marrakech',
    channel: 'whatsapp', status: 'open',
    subject: 'Problème climatiseur chambre principale',
    last_message: "Merci, j'attends le technicien.",
    last_message_at: '2026-07-28T10:30:00Z', unread_count: 1,
    messages: [
      { id: 'msg-004a', conversation_id: 'conv-004', sender: 'guest', sender_name: 'Omar Benali', content: 'Bonjour, le climatiseur de la chambre principale ne fonctionne pas.', sent_at: '2026-07-28T09:00:00Z', read_at: '2026-07-28T09:15:00Z' },
      { id: 'msg-004b', conversation_id: 'conv-004', sender: 'agent', sender_name: 'Admin PMS', content: "Bonjour Omar, un technicien passera aujourd'hui avant 14h.", sent_at: '2026-07-28T09:30:00Z', read_at: '2026-07-28T10:00:00Z' },
      { id: 'msg-004c', conversation_id: 'conv-004', sender: 'guest', sender_name: 'Omar Benali', content: "Merci, j'attends le technicien.", sent_at: '2026-07-28T10:30:00Z' },
    ],
  },
  {
    id: 'conv-005', tenant_id: 'tenant-demo',
    guest_id: 'guest-05', guest_name: 'Léa Bouchard', guest_initials: 'LB',
    reservation_id: 'res-108', property_name: 'Studio Côte-des-Neiges',
    channel: 'sms', status: 'waiting_guest',
    subject: 'Code porte — Studio A',
    last_message: 'Voici le code : #2024. Bonne arrivée !',
    last_message_at: '2026-08-05T08:02:00Z', unread_count: 0,
    messages: [
      { id: 'msg-005a', conversation_id: 'conv-005', sender: 'system', sender_name: 'PMS Auto', content: 'Code accès pour votre séjour : #2024. Valable du 5 au 9 août 2026.', sent_at: '2026-08-05T08:00:00Z', read_at: '2026-08-05T08:05:00Z' },
      { id: 'msg-005b', conversation_id: 'conv-005', sender: 'agent', sender_name: 'Admin PMS', content: 'Voici le code : #2024. Bonne arrivée !', sent_at: '2026-08-05T08:02:00Z' },
    ],
  },
  {
    id: 'conv-006', tenant_id: 'tenant-demo',
    guest_id: 'guest-06', guest_name: 'Liu Wei', guest_initials: 'LW',
    reservation_id: 'res-109', property_name: 'Maison Plateau Familiale',
    channel: 'email', status: 'open',
    subject: 'Demande extension — 2 nuits supplémentaires',
    last_message: "Votre demande d'extension est en cours de vérification.",
    last_message_at: '2026-08-01T14:30:00Z', unread_count: 1,
    messages: [
      { id: 'msg-006a', conversation_id: 'conv-006', sender: 'guest', sender_name: 'Liu Wei', content: 'Hello, I would like to extend my stay by 2 nights if possible. Aug 3 and 4.', sent_at: '2026-08-01T13:00:00Z', read_at: '2026-08-01T13:45:00Z' },
      { id: 'msg-006b', conversation_id: 'conv-006', sender: 'agent', sender_name: 'Admin PMS', content: "Votre demande d'extension est en cours de vérification.", sent_at: '2026-08-01T14:30:00Z' },
    ],
  },
  {
    id: 'conv-007', tenant_id: 'tenant-demo',
    guest_id: 'guest-09', guest_name: 'Sophie Lambert', guest_initials: 'SL',
    reservation_id: 'res-110', property_name: 'Le Loft Mile-End',
    channel: 'email', status: 'closed',
    subject: 'Demande facture entreprise',
    last_message: 'Facture reçue, merci beaucoup !',
    last_message_at: '2026-07-23T11:00:00Z', unread_count: 0,
    messages: [
      { id: 'msg-007a', conversation_id: 'conv-007', sender: 'guest', sender_name: 'Sophie Lambert', content: 'Pourriez-vous envoyer une facture au nom de Groupe Lambert SAS ?', sent_at: '2026-07-22T15:00:00Z', read_at: '2026-07-22T15:30:00Z' },
      { id: 'msg-007b', conversation_id: 'conv-007', sender: 'agent', sender_name: 'Admin PMS', content: 'Bien sûr ! Voici votre facture en pièce jointe. [Facture-2026-SL-001.pdf]', sent_at: '2026-07-22T16:00:00Z', read_at: '2026-07-22T16:30:00Z' },
      { id: 'msg-007c', conversation_id: 'conv-007', sender: 'guest', sender_name: 'Sophie Lambert', content: 'Facture reçue, merci beaucoup !', sent_at: '2026-07-23T11:00:00Z' },
    ],
  },
  {
    id: 'conv-008', tenant_id: 'tenant-demo',
    guest_id: 'guest-04', guest_name: 'Amira Hassan', guest_initials: 'AH',
    reservation_id: 'res-107', property_name: 'Maison Plateau Familiale',
    channel: 'email', status: 'closed',
    subject: 'Avis 5 étoiles — Merci !',
    last_message: 'À très bientôt pour une prochaine visite !',
    last_message_at: '2026-07-26T09:00:00Z', unread_count: 0,
    messages: [
      { id: 'msg-008a', conversation_id: 'conv-008', sender: 'system', sender_name: 'PMS Auto', content: 'Bonjour Amira, nous espérons que votre séjour vous a plu ! Pourriez-vous laisser un avis ?', sent_at: '2026-07-25T12:00:00Z', read_at: '2026-07-25T14:00:00Z' },
      { id: 'msg-008b', conversation_id: 'conv-008', sender: 'guest', sender_name: 'Amira Hassan', content: 'Séjour parfait ! 5 étoiles sur Airbnb. Propriété impeccable !', sent_at: '2026-07-25T15:30:00Z', read_at: '2026-07-25T16:00:00Z' },
      { id: 'msg-008c', conversation_id: 'conv-008', sender: 'agent', sender_name: 'Admin PMS', content: 'Merci infiniment Amira ! Nous serons ravis de vous accueillir à nouveau.', sent_at: '2026-07-25T16:30:00Z', read_at: '2026-07-25T17:00:00Z' },
      { id: 'msg-008d', conversation_id: 'conv-008', sender: 'guest', sender_name: 'Amira Hassan', content: 'À très bientôt pour une prochaine visite !', sent_at: '2026-07-26T09:00:00Z' },
    ],
  },
];

export const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-001', tenant_id: 'tenant-demo', category: 'welcome', language: 'fr',
    name: 'Message de bienvenue',
    subject: 'Bienvenue, {{guest_first_name}} !',
    body: 'Bonjour {{guest_first_name}},\n\nNous sommes ravis de vous accueillir à {{property_name}} du {{checkin_date}} au {{checkout_date}}.\n\nCode accès : {{access_code}} — disponible à partir de {{checkin_time}}.\n\nCordialement,\n{{tenant_name}}',
    variables: [
      { key: 'guest_first_name', label: 'Prénom voyageur', example: 'Marie' },
      { key: 'property_name', label: 'Nom propriété', example: 'Le Loft Mile-End' },
      { key: 'checkin_date', label: 'Date arrivée', example: '24 juil. 2026' },
      { key: 'checkout_date', label: 'Date départ', example: '28 juil. 2026' },
      { key: 'access_code', label: 'Code accès', example: '#1847' },
      { key: 'checkin_time', label: 'Heure arrivée', example: '15h00' },
      { key: 'tenant_name', label: 'Nom société', example: 'PMS Locations QC' },
    ],
    channels: ['email', 'whatsapp'],
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'tpl-002', tenant_id: 'tenant-demo', category: 'checkin', language: 'fr',
    name: "Instructions d'arrivée",
    subject: "Votre arrivée à {{property_name}} — Instructions",
    body: 'Bonjour {{guest_first_name}},\n\nVotre séjour commence dans 24h !\n\n📍 Adresse : {{property_address}}\n🔑 Code porte : {{access_code}}\n⏰ Check-in dès : {{checkin_time}}\n📶 WiFi : {{wifi_name}} / {{wifi_password}}\n\nBonne arrivée !\n{{tenant_name}}',
    variables: [
      { key: 'guest_first_name', label: 'Prénom voyageur', example: 'Marie' },
      { key: 'property_name', label: 'Nom propriété', example: 'Le Loft Mile-End' },
      { key: 'property_address', label: 'Adresse', example: '123 Rue Saint-Laurent, Montréal' },
      { key: 'access_code', label: 'Code accès', example: '#1847' },
      { key: 'checkin_time', label: 'Heure arrivée', example: '15h00' },
      { key: 'wifi_name', label: 'Nom WiFi', example: 'LoftMileEnd_5G' },
      { key: 'wifi_password', label: 'Mot de passe WiFi', example: 'welcome2026' },
      { key: 'tenant_name', label: 'Nom société', example: 'PMS Locations QC' },
    ],
    channels: ['email', 'sms', 'whatsapp'],
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'tpl-003', tenant_id: 'tenant-demo', category: 'checkout', language: 'fr',
    name: 'Instructions de départ',
    subject: 'Votre départ demain — Quelques rappels',
    body: 'Bonjour {{guest_first_name}},\n\nNous espérons que vous avez passé un excellent séjour à {{property_name}} !\n\n⏰ Check-out avant : {{checkout_time}}\n🔑 Clés : {{key_return_instructions}}\n\nMerci et à bientôt !\n{{tenant_name}}',
    variables: [
      { key: 'guest_first_name', label: 'Prénom voyageur', example: 'Marie' },
      { key: 'property_name', label: 'Nom propriété', example: 'Le Loft Mile-End' },
      { key: 'checkout_time', label: 'Heure départ', example: '11h00' },
      { key: 'key_return_instructions', label: 'Instructions clés', example: 'Dans la boite à clés code #0000' },
      { key: 'tenant_name', label: 'Nom société', example: 'PMS Locations QC' },
    ],
    channels: ['email', 'sms'],
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'tpl-004', tenant_id: 'tenant-demo', category: 'review', language: 'fr',
    name: "Demande d'avis",
    subject: "Votre avis nous intéresse, {{guest_first_name}} !",
    body: 'Bonjour {{guest_first_name}},\n\nNous espérons que votre séjour à {{property_name}} vous a plu !\n\nVotre avis est très important pour nous.\n⭐ Laisser un avis : {{review_link}}\n\nMerci,\n{{tenant_name}}',
    variables: [
      { key: 'guest_first_name', label: 'Prénom voyageur', example: 'Marie' },
      { key: 'property_name', label: 'Nom propriété', example: 'Le Loft Mile-End' },
      { key: 'review_link', label: 'Lien avis', example: 'https://airbnb.com/review/...' },
      { key: 'tenant_name', label: 'Nom société', example: 'PMS Locations QC' },
    ],
    channels: ['email'],
    created_at: '2026-01-15T10:00:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getConversationById = (id: string): Conversation | undefined =>
  MOCK_CONVERSATIONS.find(c => c.id === id);

// ─── Display constants ────────────────────────────────────────────────────────
export const CONV_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', waiting_guest: 'Attente voyageur',
  waiting_agent: 'Attente agent', closed: 'Fermé',
};

export const CONV_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  waiting_guest: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  waiting_agent: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const CONV_CHANNEL_DISPLAY: Record<string, { label: string; color: string }> = {
  email: { label: 'Email', color: 'text-blue-400' },
  sms: { label: 'SMS', color: 'text-green-400' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-400' },
  in_app: { label: 'In-App', color: 'text-purple-400' },
};

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  welcome: 'Bienvenue', checkin: 'Arrivée', checkout: 'Départ',
  review: 'Avis', payment: 'Paiement', housekeeping: 'Ménage',
};

export const TEMPLATE_CATEGORY_COLORS: Record<string, string> = {
  welcome: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  checkin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checkout: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  payment: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  housekeeping: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};
