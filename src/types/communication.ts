// Communication module types — PROMPT 12
export type MessageSender = 'guest' | 'agent' | 'system';
export type ConversationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';
export type ConversationStatus = 'open' | 'waiting_guest' | 'waiting_agent' | 'closed';
export type TemplateCategory = 'welcome' | 'checkin' | 'checkout' | 'review' | 'payment' | 'housekeeping';

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  sender_name: string;
  content: string;
  sent_at: string;
  read_at?: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  guest_id: string;
  guest_name: string;
  guest_initials: string;
  reservation_id?: string;
  property_name?: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  subject: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  messages: Message[];
}

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

export interface MessageTemplate {
  id: string;
  tenant_id: string;
  category: TemplateCategory;
  name: string;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  channels: ConversationChannel[];
  language: string;
  created_at: string;
}
