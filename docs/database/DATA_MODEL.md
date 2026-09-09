# DATA MODEL V1 — PMS SaaS Agentique

**Phase**: PROMPT 05 | **ADR**: ADR-006 | **Tables**: 80 | **Date**: 2026-08-09

## Conventions Globales

```
id           UUID PK DEFAULT gen_random_uuid()
tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE  -- toutes tables métier
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
created_by   UUID REFERENCES user_profile(id)
version      INTEGER NOT NULL DEFAULT 1   -- optimistic locking
deleted_at   TIMESTAMPTZ                  -- soft delete sur entités critiques
```
- Montants : `NUMERIC(12,4)` — jamais FLOAT
- Enums : `TEXT + CHECK(IN ...)` — flexibilité sans ALTER TYPE
- Indexes : systématique sur tenant_id, FK, colonnes filtrées fréquemment

---

## Domain 1 — SAAS (6 tables)

### tenant
```sql
id UUID PK | slug TEXT UNIQUE NN | name TEXT NN
status TEXT DEFAULT 'trial'  -- trial|active|suspended|pending_deletion|deleted|migrating
plan_id UUID FK→plan | data_region TEXT DEFAULT 'ca-central-1'
trial_ends_at TIMESTAMPTZ | suspended_at TIMESTAMPTZ | suspension_reason TEXT
deleted_at TIMESTAMPTZ | created_at | updated_at
-- INDEX: slug, status
```

### tenant_settings
```sql
tenant_id UUID PK FK→tenant
default_language TEXT DEFAULT 'fr' | default_currency TEXT DEFAULT 'CAD'
timezone TEXT DEFAULT 'America/Montreal'
check_in_time TIME DEFAULT '15:00' | check_out_time TIME DEFAULT '11:00'
cleaning_buffer_hours INT DEFAULT 2 | commission_default NUMERIC(5,4) DEFAULT 0.20
allow_owner_portal BOOL DEFAULT true | allow_guest_portal BOOL DEFAULT true
require_inspection BOOL DEFAULT true | auto_send_access_codes BOOL DEFAULT true
updated_at
```

### plan
```sql
id UUID PK | name TEXT UNIQUE NN | display_name TEXT NN
max_properties INT DEFAULT 3 | max_units INT DEFAULT 5 | max_members INT DEFAULT 2
max_channels INT DEFAULT 1 | max_ai_agents INT DEFAULT 0
max_api_calls_per_day INT DEFAULT 1000 | max_storage_gb INT DEFAULT 5
price_monthly NUMERIC(10,4) | price_yearly NUMERIC(10,4) | currency TEXT DEFAULT 'CAD'
is_active BOOL DEFAULT true | created_at | updated_at
-- -1 = illimité
```

### subscription
```sql
id UUID PK | tenant_id FK→tenant NN | plan_id FK→plan NN
status TEXT CHECK(IN 'trial','active','past_due','cancelled','expired')
current_period_start TIMESTAMPTZ | current_period_end TIMESTAMPTZ
cancel_at_period_end BOOL DEFAULT false
stripe_subscription_id TEXT UNIQUE | stripe_customer_id TEXT
created_at | updated_at | created_by
-- INDEX: tenant_id, status
```

### feature
```sql
id UUID PK | key TEXT UNIQUE NN | display_name TEXT | description TEXT
is_beta BOOL DEFAULT false | created_at
-- keys: "channel_manager"|"ai_agents"|"smart_locks"|"transport"
```

### usage_metric
```sql
id UUID PK | tenant_id FK→tenant NN | metric_date DATE NN
properties_count INT DEFAULT 0 | units_count INT DEFAULT 0
reservations_count INT DEFAULT 0 | api_calls_count INT DEFAULT 0
storage_bytes BIGINT DEFAULT 0 | agent_runs_count INT DEFAULT 0
created_at | updated_at
UNIQUE(tenant_id, metric_date)
```

---

## Domain 2 — IDENTITY (6 tables)

### user_profile
```sql
id UUID PK REFERENCES auth.users(id)
email TEXT NN | full_name TEXT NN | avatar_url TEXT | phone TEXT
preferred_language TEXT DEFAULT 'fr' | preferred_currency TEXT DEFAULT 'CAD'
timezone TEXT DEFAULT 'America/Montreal' | is_active BOOL DEFAULT true
mfa_enabled BOOL DEFAULT false | last_login_at TIMESTAMPTZ
created_at | updated_at
-- No tenant_id — user exists across tenants
```

### tenant_membership
```sql
id UUID PK | tenant_id FK→tenant NN | user_id FK→user_profile NN
role TEXT NN | status TEXT DEFAULT 'invited'  -- invited|active|inactive|suspended
permissions_override JSONB DEFAULT '{}'  -- {grant:[...], deny:[...]}
properties_scope UUID[]  -- NULL = all properties
invited_at TIMESTAMPTZ | invited_by FK→user_profile | joined_at TIMESTAMPTZ
UNIQUE(tenant_id, user_id)
-- INDEX: tenant_id, user_id, role
```

### role
```sql
id UUID PK | tenant_id FK→tenant  -- NULL = system role
name TEXT NN | display_name TEXT NN | is_system BOOL DEFAULT false
created_at | updated_at
UNIQUE(tenant_id, name)
```

### permission
```sql
id UUID PK | resource TEXT NN | action TEXT NN
name TEXT UNIQUE NN  -- "property.read"
is_sensitive BOOL DEFAULT false | description TEXT | created_at
```

### role_permission
```sql
id UUID PK | role TEXT NN FK→role(name) | permission TEXT NN FK→permission(name)
conditions JSONB DEFAULT NULL  -- {own_properties_only:true}|{assigned_only:true}
UNIQUE(role, permission)
```

### tenant_secret
```sql
id UUID PK | tenant_id FK→tenant NN | key_name TEXT NN
encrypted_value TEXT NN | rotated_at TIMESTAMPTZ | expires_at TIMESTAMPTZ
created_at | updated_at | created_by
UNIQUE(tenant_id, key_name)
-- Edge Functions ONLY — never exposed to frontend
```

---

## Domain 3 — OWNER (2 tables)

### owner
```sql
id UUID PK | tenant_id FK→tenant NN | user_id FK→user_profile
first_name TEXT NN | last_name TEXT NN | email TEXT NN | phone TEXT
company_name TEXT | tax_id TEXT | bank_account_iban TEXT  -- encrypted
preferred_currency TEXT DEFAULT 'CAD' | preferred_language TEXT DEFAULT 'fr'
notes TEXT | is_active BOOL DEFAULT true | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by | version
UNIQUE(tenant_id, email)
```

### owner_contract
```sql
id UUID PK | tenant_id FK→tenant NN | owner_id FK→owner NN
contract_type TEXT  -- full_management|co_host|guaranteed_revenue
commission_rate NUMERIC(5,4) NN | cleaning_fee_split NUMERIC(5,4) DEFAULT 0
management_fee_structure TEXT | flat_fee_amount NUMERIC(10,4)
payment_frequency TEXT DEFAULT 'monthly' | payment_day INT DEFAULT 1
start_date DATE NN | end_date DATE | auto_renew BOOL DEFAULT true
status TEXT DEFAULT 'active'  -- draft|active|expired|terminated
signed_at TIMESTAMPTZ | document_url TEXT
created_at | updated_at | created_by | version
```

---

## Domain 4 — PROPERTY (8 tables)

### property
```sql
id UUID PK | tenant_id FK→tenant NN | owner_id FK→owner NN
name TEXT NN | property_type TEXT  -- house|condo|apartment|chalet|riad|villa
status TEXT DEFAULT 'inactive'  -- inactive|active|maintenance|unlisted
description TEXT | check_in_instructions TEXT
wifi_name TEXT | wifi_password TEXT  -- encrypted
max_guests INT | parking_spaces INT DEFAULT 0
is_entire_place BOOL DEFAULT true | address_id FK→address
primary_photo_url TEXT | notes TEXT | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by | version
-- INDEX: tenant_id, owner_id, status
```

### unit
```sql
id UUID PK | tenant_id FK→tenant NN | property_id FK→property NN
name TEXT NN | unit_number TEXT | floor INT | surface_m2 NUMERIC(8,2)
bedrooms INT DEFAULT 1 | bathrooms NUMERIC(3,1) DEFAULT 1
max_adults INT DEFAULT 2 | max_children INT DEFAULT 0 | max_total_guests INT DEFAULT 2
base_rate_per_night NUMERIC(10,4) | cleaning_fee NUMERIC(10,4) DEFAULT 0
status TEXT DEFAULT 'inactive' | sort_order INT DEFAULT 0
deleted_at TIMESTAMPTZ | created_at | updated_at | created_by | version
-- INDEX: tenant_id, property_id, status
```

### address
```sql
id UUID PK | tenant_id FK→tenant NN
line1 TEXT NN | line2 TEXT | city TEXT NN | state_province TEXT
postal_code TEXT | country_code CHAR(2) DEFAULT 'CA'
latitude NUMERIC(10,7) | longitude NUMERIC(10,7) | google_place_id TEXT
created_at | updated_at
```

### amenity
```sql
id UUID PK | category TEXT NN | name TEXT NN | icon TEXT | created_at
```

### property_amenity
```sql
id UUID PK | tenant_id FK→tenant NN
property_id FK→property NN | amenity_id FK→amenity NN | unit_id FK→unit
notes TEXT
UNIQUE(property_id, amenity_id, unit_id)
```

### property_document
```sql
id UUID PK | tenant_id FK→tenant NN | property_id FK→property NN
doc_type TEXT | name TEXT NN | storage_path TEXT NN
file_size_bytes BIGINT | mime_type TEXT | expires_at TIMESTAMPTZ
is_visible_to_owner BOOL DEFAULT false
uploaded_at TIMESTAMPTZ DEFAULT now() | uploaded_by FK→user_profile
deleted_at TIMESTAMPTZ
```

### property_registration
```sql
id UUID PK | tenant_id FK→tenant NN | property_id FK→property NN
registration_type TEXT  -- str_license|tax_number|insurance_number
registration_number TEXT NN | issuing_authority TEXT
issue_date DATE | expiry_date DATE | status TEXT DEFAULT 'active'
document_url TEXT | created_at | updated_at | created_by
```

### property_insurance
```sql
id UUID PK | tenant_id FK→tenant NN | property_id FK→property NN
insurance_type TEXT | provider_name TEXT NN | policy_number TEXT NN
coverage_amount NUMERIC(12,4) | currency TEXT DEFAULT 'CAD'
premium_amount NUMERIC(10,4)
start_date DATE NN | end_date DATE NN | document_url TEXT
created_at | updated_at | created_by
```

---

## Domain 5 — CHANNEL (5 tables)

### channel
```sql
id UUID PK | slug TEXT UNIQUE NN  -- airbnb|booking|vrbo|ical|direct
name TEXT NN | level INT NN  -- 1=iCal, 2=certified, 3=direct_api
capabilities TEXT[]  -- reservations|availability|rates|listings
is_active BOOL DEFAULT true | created_at
```

### channel_account
```sql
id UUID PK | tenant_id FK→tenant NN | channel_id FK→channel NN
account_name TEXT | external_account_id TEXT
status TEXT DEFAULT 'pending'  -- pending|connected|error|suspended
last_sync_at TIMESTAMPTZ | error_message TEXT
credential_secret_key TEXT  -- → tenant_secret.key_name
created_at | updated_at | created_by
UNIQUE(tenant_id, channel_id, external_account_id)
```

### channel_connection
```sql
id UUID PK | tenant_id FK→tenant NN
channel_account_id FK→channel_account NN | unit_id FK→unit NN
external_listing_id TEXT | status TEXT DEFAULT 'pending'
ical_url TEXT | last_pull_at TIMESTAMPTZ | last_push_at TIMESTAMPTZ
sync_cursor TEXT | created_at | updated_at
UNIQUE(tenant_id, channel_account_id, unit_id)
```

### listing
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN
title TEXT NN | description TEXT | house_rules TEXT | check_in_method TEXT
check_in_instructions TEXT | photos JSONB DEFAULT '[]'
min_nights INT DEFAULT 1 | max_nights INT
instant_book BOOL DEFAULT false
status TEXT DEFAULT 'draft'  -- draft|active|inactive|suspended
created_at | updated_at | created_by | version
```

### channel_listing_mapping
```sql
id UUID PK | tenant_id FK→tenant NN
listing_id FK→listing NN | channel_connection_id FK→channel_connection NN
external_listing_id TEXT | sync_status TEXT DEFAULT 'pending'
last_sync_at TIMESTAMPTZ | sync_errors JSONB DEFAULT '[]'
created_at | updated_at
UNIQUE(listing_id, channel_connection_id)
```

---

## Domain 6 — CALENDAR (5 tables)

### availability
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN | date DATE NN
status TEXT NN DEFAULT 'available'
  -- available|reserved|owner_block|maintenance|manual_block|housekeeping|check_in|check_out
reservation_id FK→reservation | rate NUMERIC(10,4) | min_nights INT | notes TEXT
UNIQUE(tenant_id, unit_id, date)
-- INDEX: tenant_id, unit_id, date, status
```

### calendar_block
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN
block_type TEXT NN  -- owner_block|maintenance|cleaning|manual
start_date DATE NN | end_date DATE NN | reason TEXT
reservation_id FK→reservation | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by
CHECK(end_date >= start_date)
-- INDEX: tenant_id, unit_id, start_date, end_date
```

### rate_plan
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit
name TEXT NN | base_rate NUMERIC(10,4) NN | currency TEXT DEFAULT 'CAD'
is_default BOOL DEFAULT false | is_active BOOL DEFAULT true
created_at | updated_at | created_by | version
```

### rate_rule
```sql
id UUID PK | tenant_id FK→tenant NN | rate_plan_id FK→rate_plan NN
rule_type TEXT NN  -- seasonal|weekday|los_discount|last_minute|early_bird
start_date DATE | end_date DATE | days_of_week INT[]
min_nights INT | max_nights INT
adjustment_type TEXT NN  -- percentage|fixed
adjustment_value NUMERIC(10,4) NN | priority INT DEFAULT 0
is_active BOOL DEFAULT true | created_at | updated_at
```

### restriction
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN
rate_plan_id FK→rate_plan | start_date DATE NN | end_date DATE NN
min_nights INT | max_nights INT
closed_to_arrival BOOL DEFAULT false | closed_to_departure BOOL DEFAULT false
advance_booking_min_days INT | advance_booking_max_days INT
created_at | updated_at | created_by
CHECK(end_date >= start_date)
```

---

## Domain 7 — RESERVATION (8 tables)

### guest
```sql
id UUID PK | tenant_id FK→tenant NN
email TEXT NN | first_name TEXT NN | last_name TEXT NN | phone TEXT
nationality TEXT | date_of_birth DATE | passport_number TEXT  -- encrypted
preferred_language TEXT DEFAULT 'en' | communication_preference TEXT DEFAULT 'email'
vip_status BOOL DEFAULT false | blacklisted BOOL DEFAULT false
blacklist_reason TEXT | external_ids JSONB DEFAULT '{}'
notes TEXT | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by | version
UNIQUE(tenant_id, email)
```

### reservation
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN
guest_id FK→guest NN | channel_id FK→channel | channel_account_id FK→channel_account
external_reservation_id TEXT
idempotency_key TEXT UNIQUE  -- SHA256(provider+account+ext_id)
status TEXT NN DEFAULT 'pending'
  -- pending|confirmed|modified|checked_in|checked_out|cancelled|no_show
check_in_date DATE NN | check_out_date DATE NN
check_in_time TIME DEFAULT '15:00' | check_out_time TIME DEFAULT '11:00'
actual_check_in_at TIMESTAMPTZ | actual_check_out_at TIMESTAMPTZ
nights INT GENERATED ALWAYS AS (check_out_date - check_in_date) STORED
adults INT DEFAULT 1 | children INT DEFAULT 0 | total_guests INT DEFAULT 1
base_amount NUMERIC(12,4) NN DEFAULT 0
fees_amount NUMERIC(12,4) NN DEFAULT 0
taxes_amount NUMERIC(12,4) NN DEFAULT 0
total_amount NUMERIC(12,4) NN DEFAULT 0
currency TEXT DEFAULT 'CAD' | payment_status TEXT DEFAULT 'pending'
booking_source TEXT | booking_notes TEXT | internal_notes TEXT
calendar_version INT  -- version at time of booking (concurrency control)
cancelled_at TIMESTAMPTZ | cancellation_reason TEXT | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by | version
CHECK(check_out_date > check_in_date)
-- INDEX: tenant_id, unit_id, status, check_in_date, check_out_date
```

### reservation_guest
```sql
id UUID PK | tenant_id FK→tenant NN
reservation_id FK→reservation NN | guest_id FK→guest NN
is_primary BOOL DEFAULT false
UNIQUE(reservation_id, guest_id)
```

### reservation_charge
```sql
id UUID PK | tenant_id FK→tenant NN | reservation_id FK→reservation NN
charge_type TEXT NN  -- accommodation|cleaning_fee|extra_guest_fee|pet_fee|service_fee
description TEXT | amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
quantity INT DEFAULT 1 | unit_price NUMERIC(12,4) | is_taxable BOOL DEFAULT true
created_at | updated_at
```

### reservation_tax
```sql
id UUID PK | tenant_id FK→tenant NN | reservation_id FK→reservation NN
tax_type TEXT NN  -- tps|tvq|tva|tourist_tax|city_tax
rate NUMERIC(6,5) NN | taxable_amount NUMERIC(12,4) NN
tax_amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
created_at
```

### reservation_status_history
```sql
id UUID PK | tenant_id FK→tenant NN | reservation_id FK→reservation NN
previous_status TEXT | new_status TEXT NN
changed_by FK→user_profile | changed_by_type TEXT  -- user|agent|system|channel
reason TEXT | correlation_id UUID
created_at
-- APPEND-ONLY: no UPDATE/DELETE
```

### cancellation
```sql
id UUID PK | tenant_id FK→tenant NN
reservation_id FK→reservation NN UNIQUE
cancelled_by FK→user_profile | cancelled_by_type TEXT  -- guest|manager|channel|system
reason TEXT NN | cancellation_policy TEXT
refund_amount NUMERIC(12,4) NN DEFAULT 0 | refund_status TEXT DEFAULT 'pending'
channel_cancellation_id TEXT | created_at
```

### refund
```sql
id UUID PK | tenant_id FK→tenant NN
reservation_id FK→reservation NN | payment_id FK→payment
amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
reason TEXT NN | status TEXT DEFAULT 'pending'
stripe_refund_id TEXT UNIQUE | processed_at TIMESTAMPTZ
created_at | updated_at | created_by
```

---

## Domain 8 — COMMUNICATION (4 tables)

### conversation
```sql
id UUID PK | tenant_id FK→tenant NN
reservation_id FK→reservation | guest_id FK→guest
channel_id FK→channel | channel_thread_id TEXT
subject TEXT | status TEXT DEFAULT 'open'  -- open|closed|archived|spam
last_message_at TIMESTAMPTZ | unread_count INT DEFAULT 0
assigned_to FK→user_profile
created_at | updated_at
-- INDEX: tenant_id, reservation_id, guest_id, status
```

### message
```sql
id UUID PK | tenant_id FK→tenant NN | conversation_id FK→conversation NN
sender_type TEXT NN  -- manager|guest|agent|system
sender_id UUID | body TEXT NN | body_html TEXT
channel TEXT  -- email|sms|platform|whatsapp
direction TEXT NN  -- outbound|inbound
status TEXT DEFAULT 'sent'  -- draft|sent|delivered|read|failed
external_message_id TEXT | is_ai_generated BOOL DEFAULT false
ai_reviewed_by FK→user_profile
sent_at TIMESTAMPTZ DEFAULT now() | read_at TIMESTAMPTZ
created_at | updated_at
```

### message_template
```sql
id UUID PK | tenant_id FK→tenant NN
name TEXT NN | slug TEXT NN
trigger_event TEXT  -- ReservationConfirmed|CheckIn-24h|...
language TEXT DEFAULT 'fr' | subject TEXT | body TEXT NN
channel TEXT DEFAULT 'email' | auto_send BOOL DEFAULT false
delay_hours INT DEFAULT 0 | is_active BOOL DEFAULT true
created_at | updated_at | created_by
UNIQUE(tenant_id, slug, language)
```

### notification
```sql
id UUID PK | tenant_id FK→tenant NN | recipient_id FK→user_profile NN
notification_type TEXT NN | title TEXT NN | body TEXT NN
action_url TEXT | is_read BOOL DEFAULT false | read_at TIMESTAMPTZ
channel TEXT DEFAULT 'in_app' | created_at
-- INDEX: tenant_id, recipient_id, is_read
```

---

## Domain 9 — OPERATIONS (7 tables)

### task
```sql
id UUID PK | tenant_id FK→tenant NN
task_type TEXT NN  -- housekeeping|inspection|maintenance|transport|generic
title TEXT NN | description TEXT
status TEXT DEFAULT 'pending'  -- pending|assigned|in_progress|completed|failed|cancelled
priority TEXT DEFAULT 'normal'  -- low|normal|high|urgent
property_id FK→property | unit_id FK→unit | reservation_id FK→reservation
due_date TIMESTAMPTZ | due_time TIME | completed_at TIMESTAMPTZ
correlation_id UUID | parent_task_id FK→task
created_at | updated_at | created_by | version
-- INDEX: tenant_id, status, task_type, due_date
```

### assignment
```sql
id UUID PK | tenant_id FK→tenant NN | task_id FK→task NN
assignee_id FK→user_profile NN | role TEXT NN
status TEXT DEFAULT 'pending'  -- pending|accepted|declined|in_progress|completed
assigned_at TIMESTAMPTZ DEFAULT now() | accepted_at TIMESTAMPTZ
started_at TIMESTAMPTZ | completed_at TIMESTAMPTZ | notes TEXT
UNIQUE(task_id, assignee_id)
```

### housekeeping_job
```sql
id UUID PK | tenant_id FK→tenant NN | task_id FK→task NN
unit_id FK→unit NN | reservation_id FK→reservation
next_reservation_id FK→reservation
job_type TEXT DEFAULT 'checkout_clean'  -- checkout_clean|mid_stay|deep_clean|pre_arrival
scheduled_start TIMESTAMPTZ | scheduled_end TIMESTAMPTZ
actual_start TIMESTAMPTZ | actual_end TIMESTAMPTZ | duration_minutes INT
status TEXT DEFAULT 'pending' | checklist_id FK→checklist
quality_score NUMERIC(3,1) | notes TEXT
created_at | updated_at | created_by
```

### checklist
```sql
id UUID PK | tenant_id FK→tenant NN | name TEXT NN
checklist_type TEXT DEFAULT 'housekeeping'  -- housekeeping|inspection
property_id FK→property | is_template BOOL DEFAULT false
is_active BOOL DEFAULT true | created_at | updated_at | created_by
```

### checklist_item
```sql
id UUID PK | tenant_id FK→tenant NN | checklist_id FK→checklist NN
label TEXT NN | category TEXT | sort_order INT DEFAULT 0
is_required BOOL DEFAULT true | requires_photo BOOL DEFAULT false
completed BOOL DEFAULT false | completed_by FK→user_profile
completed_at TIMESTAMPTZ | photo_url TEXT | notes TEXT
```

### inspection
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN
housekeeping_job_id FK→housekeeping_job | reservation_id FK→reservation
inspector_id FK→user_profile
inspection_type TEXT DEFAULT 'post_cleaning'
  -- post_cleaning|pre_checkin|routine|damage
scheduled_at TIMESTAMPTZ | started_at TIMESTAMPTZ | completed_at TIMESTAMPTZ
status TEXT DEFAULT 'pending'
  -- pending|in_progress|passed|failed|requires_maintenance
overall_score NUMERIC(3,1) | pass_threshold NUMERIC(3,1) DEFAULT 7.0
notes TEXT | property_ready BOOL DEFAULT false
created_at | updated_at | created_by
```

### inspection_finding
```sql
id UUID PK | tenant_id FK→tenant NN | inspection_id FK→inspection NN
category TEXT  -- cleanliness|damage|missing_item|maintenance
severity TEXT NN  -- minor|major|critical
title TEXT NN | description TEXT | photo_urls TEXT[]
requires_maintenance BOOL DEFAULT false
maintenance_ticket_id FK→maintenance_ticket
resolved BOOL DEFAULT false | resolved_at TIMESTAMPTZ | resolved_by FK→user_profile
created_at | updated_at
```

---

## Domain 10 — TRANSPORT (4 tables)

### driver
```sql
id UUID PK | tenant_id FK→tenant NN | user_id FK→user_profile NN
license_number TEXT | license_expiry DATE | is_available BOOL DEFAULT true
notes TEXT | deleted_at TIMESTAMPTZ | created_at | updated_at | created_by
```

### vehicle
```sql
id UUID PK | tenant_id FK→tenant NN
make TEXT NN | model TEXT NN | year INT | color TEXT
license_plate TEXT NN | capacity_persons INT DEFAULT 4
status TEXT DEFAULT 'active'  -- active|maintenance|retired
created_at | updated_at
UNIQUE(tenant_id, license_plate)
```

### transport_trip
```sql
id UUID PK | tenant_id FK→tenant NN | task_id FK→task
driver_id FK→driver | vehicle_id FK→vehicle
trip_type TEXT NN  -- staff_pickup|guest_transfer|supply_run
status TEXT DEFAULT 'pending'
scheduled_at TIMESTAMPTZ NN | started_at TIMESTAMPTZ | completed_at TIMESTAMPTZ
notes TEXT | created_at | updated_at | created_by
```

### transport_stop
```sql
id UUID PK | tenant_id FK→tenant NN | trip_id FK→transport_trip NN
stop_order INT NN | address_id FK→address
person_id FK→user_profile | stop_type TEXT DEFAULT 'pickup'  -- pickup|dropoff|waypoint
scheduled_at TIMESTAMPTZ | arrived_at TIMESTAMPTZ
UNIQUE(trip_id, stop_order)
```

---

## Domain 11 — MAINTENANCE (4 tables)

### maintenance_ticket
```sql
id UUID PK | tenant_id FK→tenant NN | property_id FK→property NN
unit_id FK→unit | reported_by FK→user_profile NN
category TEXT NN  -- plumbing|electrical|hvac|appliance|structural|other
title TEXT NN | description TEXT NN
severity TEXT DEFAULT 'minor'  -- minor|moderate|major|critical
status TEXT DEFAULT 'open'
  -- open|assigned|in_progress|waiting_parts|resolved|closed|cancelled
photo_urls TEXT[] | inspection_finding_id FK→inspection_finding
resolved_at TIMESTAMPTZ | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by | version
-- INDEX: tenant_id, property_id, status, severity
```

### work_order
```sql
id UUID PK | tenant_id FK→tenant NN | ticket_id FK→maintenance_ticket NN
vendor_id FK→vendor | assigned_technician_id FK→user_profile
title TEXT NN | scope_of_work TEXT
estimated_cost NUMERIC(10,4) | actual_cost NUMERIC(10,4) | currency TEXT DEFAULT 'CAD'
status TEXT DEFAULT 'draft'
  -- draft|pending_approval|approved|in_progress|completed|invoiced
approval_request_id FK→approval_request
scheduled_at TIMESTAMPTZ | completed_at TIMESTAMPTZ | invoice_url TEXT
created_at | updated_at | created_by | version
```

### vendor
```sql
id UUID PK | tenant_id FK→tenant NN | company_name TEXT NN
contact_name TEXT | email TEXT | phone TEXT
specialties TEXT[] | hourly_rate NUMERIC(10,4) | currency TEXT DEFAULT 'CAD'
rating NUMERIC(3,2) | is_preferred BOOL DEFAULT false
is_active BOOL DEFAULT true | notes TEXT | deleted_at TIMESTAMPTZ
created_at | updated_at | created_by
```

### vendor_quote
```sql
id UUID PK | tenant_id FK→tenant NN
work_order_id FK→work_order NN | vendor_id FK→vendor NN
amount NUMERIC(10,4) NN | currency TEXT DEFAULT 'CAD'
valid_until DATE | document_url TEXT
status TEXT DEFAULT 'pending'  -- pending|accepted|rejected|expired
created_at | updated_at
```

---

## Domain 12 — ACCESS (3 tables)

### smart_lock
```sql
id UUID PK | tenant_id FK→tenant NN | unit_id FK→unit NN
device_id TEXT NN | provider TEXT NN  -- schlage|yale|august|nuki
lock_name TEXT | battery_level INT | is_online BOOL DEFAULT true
last_seen_at TIMESTAMPTZ | status TEXT DEFAULT 'active'
created_at | updated_at
UNIQUE(tenant_id, device_id)
```

### access_code
```sql
id UUID PK | tenant_id FK→tenant NN | smart_lock_id FK→smart_lock NN
reservation_id FK→reservation
code TEXT NN  -- NEVER generated by LLM
code_type TEXT DEFAULT 'pin'  -- pin|rfid|digital
valid_from TIMESTAMPTZ NN | valid_until TIMESTAMPTZ NN
is_active BOOL DEFAULT true | revoked_at TIMESTAMPTZ
revoked_by FK→user_profile | revocation_reason TEXT
created_by FK→user_profile | created_at
-- Code generated by ISmartLockProvider ONLY
```

### access_event
```sql
id UUID PK | tenant_id FK→tenant NN | smart_lock_id FK→smart_lock NN
event_type TEXT NN  -- access_granted|access_denied|code_created|code_revoked|lock|unlock
actor_type TEXT | actor_id UUID | reservation_id FK→reservation
access_code_id FK→access_code
occurred_at TIMESTAMPTZ NN | raw_event JSONB
created_at
-- APPEND-ONLY: no UPDATE/DELETE
-- INDEX: tenant_id, smart_lock_id, occurred_at
```

---

## Domain 13 — FINANCE (6 tables)

### payment
```sql
id UUID PK | tenant_id FK→tenant NN | reservation_id FK→reservation NN
amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
payment_method TEXT | payment_source TEXT  -- stripe|airbnb_collect|booking_collect
status TEXT DEFAULT 'pending'
stripe_payment_intent_id TEXT UNIQUE | ota_payment_id TEXT
paid_at TIMESTAMPTZ | failure_reason TEXT | metadata JSONB DEFAULT '{}'
created_at | updated_at | created_by
-- INDEX: tenant_id, reservation_id, status
```

### payout
```sql
id UUID PK | tenant_id FK→tenant NN
recipient_type TEXT NN  -- owner|vendor | recipient_id UUID NN
amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
payout_method TEXT DEFAULT 'bank_transfer'
status TEXT DEFAULT 'pending'
owner_statement_id FK→owner_statement | stripe_transfer_id TEXT
bank_reference TEXT | notes TEXT | processed_at TIMESTAMPTZ
approval_request_id FK→approval_request
created_at | updated_at | created_by
```

### expense
```sql
id UUID PK | tenant_id FK→tenant NN | property_id FK→property
category TEXT NN  -- cleaning|maintenance|supplies|utilities|insurance
description TEXT NN | amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
paid_at DATE | vendor_id FK→vendor | work_order_id FK→work_order
receipt_url TEXT | is_owner_chargeable BOOL DEFAULT false
owner_id FK→owner | approval_request_id FK→approval_request
created_at | updated_at | created_by
```

### commission_rule
```sql
id UUID PK | tenant_id FK→tenant NN | name TEXT NN
rule_type TEXT NN  -- percentage|flat|tiered
applies_to TEXT DEFAULT 'all'  -- all|direct|ota
channel_id FK→channel | owner_id FK→owner
rate NUMERIC(6,5) | flat_amount NUMERIC(10,4)
min_nights INT | start_date DATE | end_date DATE
priority INT DEFAULT 0 | is_active BOOL DEFAULT true
created_at | updated_at | created_by
```

### owner_statement
```sql
id UUID PK | tenant_id FK→tenant NN | owner_id FK→owner NN
period_start DATE NN | period_end DATE NN
total_revenue NUMERIC(12,4) NN DEFAULT 0
total_commissions NUMERIC(12,4) NN DEFAULT 0
total_expenses NUMERIC(12,4) NN DEFAULT 0
net_payout NUMERIC(12,4) NN DEFAULT 0
currency TEXT DEFAULT 'CAD'
status TEXT DEFAULT 'draft'  -- draft|review|approved|sent|paid
pdf_url TEXT | approved_at TIMESTAMPTZ | approved_by FK→user_profile | sent_at TIMESTAMPTZ
UNIQUE(tenant_id, owner_id, period_start, period_end)
created_at | updated_at | created_by | version
```

### ledger_entry
```sql
id UUID PK | tenant_id FK→tenant NN
entry_type TEXT NN  -- revenue|commission|expense|payout|refund|adjustment
debit_account TEXT NN | credit_account TEXT NN
amount NUMERIC(12,4) NN | currency TEXT DEFAULT 'CAD'
reference_type TEXT | reference_id UUID | description TEXT NN
entry_date DATE NN | owner_id FK→owner | reservation_id FK→reservation
created_by FK→user_profile | created_at
-- APPEND-ONLY: no UPDATE/DELETE
-- INDEX: tenant_id, entry_date, reference_type
```

---

## Domain 14 — AGENTIC (6 tables)

### agent
```sql
id UUID PK | tenant_id FK→tenant  -- NULL = platform agent
name TEXT NN | slug TEXT NN | role TEXT NN | objective TEXT
is_active BOOL DEFAULT true | config JSONB DEFAULT '{}'
created_at | updated_at | created_by
UNIQUE(tenant_id, slug)
```

### agent_policy
```sql
id UUID PK | tenant_id FK→tenant NN | agent_id FK→agent NN
allowed_tools TEXT[] NN DEFAULT '{}'
forbidden_tools TEXT[] NN DEFAULT '{}'
max_actions_per_run INT DEFAULT 10
require_approval_for TEXT[]
auto_approve_below_amount NUMERIC(12,4)
max_spend_per_run NUMERIC(12,4) | context_window_hours INT DEFAULT 24
created_at | updated_at | created_by
```

### agent_run
```sql
id UUID PK | tenant_id FK→tenant NN | agent_id FK→agent NN
trigger_event TEXT | trigger_id UUID | correlation_id UUID NN
status TEXT DEFAULT 'running'
  -- running|completed|failed|cancelled|awaiting_approval
started_at TIMESTAMPTZ DEFAULT now() | completed_at TIMESTAMPTZ
total_steps INT DEFAULT 0 | total_tool_calls INT DEFAULT 0
error_message TEXT | created_by FK→user_profile
```

### agent_step
```sql
id UUID PK | tenant_id FK→tenant NN | run_id FK→agent_run NN
step_number INT NN | step_type TEXT NN
  -- reasoning|tool_call|decision|approval_request
input JSONB | output JSONB | status TEXT DEFAULT 'pending'
duration_ms INT | created_at
UNIQUE(run_id, step_number)
```

### agent_tool_call
```sql
id UUID PK | tenant_id FK→tenant NN
run_id FK→agent_run NN | step_id FK→agent_step NN
tool_name TEXT NN | input_params JSONB NN | output_result JSONB
status TEXT DEFAULT 'pending'  -- pending|success|error|blocked
error_message TEXT | duration_ms INT | created_at
-- Tool calls → Tool Registry → PMS API (NEVER direct DB)
```

### agent_decision
```sql
id UUID PK | tenant_id FK→tenant NN | run_id FK→agent_run NN
decision_type TEXT NN  -- action_taken|escalated_to_human|blocked_by_policy
description TEXT NN | confidence NUMERIC(3,2) | rationale TEXT
action_taken TEXT | human_override BOOL DEFAULT false
human_reviewer_id FK→user_profile | created_at
```

---

## Domain 15 — GOVERNANCE (6 tables)

### approval_request
```sql
id UUID PK | tenant_id FK→tenant NN
request_type TEXT NN  -- payout|expense|work_order|cancellation_refund|agent_action
title TEXT NN | description TEXT
requestor_id FK→user_profile NN | requestor_type TEXT DEFAULT 'user'
reference_type TEXT | reference_id UUID
amount NUMERIC(12,4) | currency TEXT DEFAULT 'CAD'
required_approvers TEXT[]
status TEXT DEFAULT 'pending'  -- pending|approved|rejected|expired|cancelled
expires_at TIMESTAMPTZ | metadata JSONB DEFAULT '{}'
created_at | updated_at
-- INDEX: tenant_id, status, request_type
```

### approval_decision
```sql
id UUID PK | tenant_id FK→tenant NN
approval_request_id FK→approval_request NN
approver_id FK→user_profile NN
decision TEXT NN  -- approved|rejected
comments TEXT | decided_at TIMESTAMPTZ DEFAULT now()
-- APPEND-ONLY: no UPDATE/DELETE
```

### audit_event
```sql
id UUID PK | tenant_id FK→tenant
event_type TEXT NN | resource_type TEXT NN | resource_id UUID
actor_id FK→user_profile | actor_type TEXT DEFAULT 'user'
correlation_id UUID | ip_address INET | user_agent TEXT
changes JSONB | metadata JSONB DEFAULT '{}'
occurred_at TIMESTAMPTZ NN DEFAULT now()
-- APPEND-ONLY, IMMUTABLE — 3 ans minimum
-- INDEX: tenant_id, event_type, resource_type, occurred_at
```

### integration_event
```sql
id UUID PK | tenant_id FK→tenant NN
channel_id FK→channel | channel_account_id FK→channel_account
event_type TEXT NN | external_event_id TEXT
idempotency_key TEXT UNIQUE  -- SHA256(provider+account+event_id)
payload JSONB NN
status TEXT DEFAULT 'received'  -- received|processing|processed|failed|duplicate
reservation_id FK→reservation | error_message TEXT
retry_count INT DEFAULT 0 | processed_at TIMESTAMPTZ
received_at TIMESTAMPTZ DEFAULT now()
-- INDEX: tenant_id, idempotency_key, status
```

### sync_conflict
```sql
id UUID PK | tenant_id FK→tenant NN
conflict_type TEXT NN  -- double_booking|availability_mismatch|rate_mismatch
unit_id FK→unit NN | channel_id FK→channel
reservation_id_a FK→reservation | reservation_id_b FK→reservation
start_date DATE | end_date DATE
status TEXT DEFAULT 'open'  -- open|resolved|ignored
resolution TEXT | resolved_by FK→user_profile | resolved_at TIMESTAMPTZ
created_at
```

### incident
```sql
id UUID PK | tenant_id FK→tenant NN
severity TEXT NN  -- low|medium|high|critical
category TEXT NN  -- maintenance|guest_issue|system|security|financial
title TEXT NN | description TEXT NN
property_id FK→property | unit_id FK→unit | reservation_id FK→reservation
reported_by FK→user_profile NN | assigned_to FK→user_profile
status TEXT DEFAULT 'open'  -- open|investigating|resolved|closed
resolution TEXT | resolved_at TIMESTAMPTZ
maintenance_ticket_id FK→maintenance_ticket
approval_request_id FK→approval_request
created_at | updated_at | created_by | version
```

---

## ERD Synthèse

```
tenant ──< tenant_membership >── user_profile
tenant ──< owner ──< owner_contract
owner ──< property ──< unit
unit ──< availability         [Calendar — source of truth]
unit ──< calendar_block
unit ──< listing ──< channel_listing_mapping
unit ──< reservation >── guest
reservation ──< housekeeping_job ──< inspection ──< inspection_finding
housekeeping_job ──< checklist ──< checklist_item
inspection_finding ──> maintenance_ticket ──< work_order ──< vendor_quote
reservation ──< access_code >── smart_lock
reservation ──< payment ──< refund
owner ──< owner_statement ──< payout
[events] ──> task ──< assignment >── user_profile
[events] ──> transport_trip ──< transport_stop
agent ──< agent_policy
agent ──< agent_run ──< agent_step ──< agent_tool_call
agent_run ──< agent_decision
[actions] ──> approval_request ──< approval_decision
[all] ──> audit_event
[channels] ──> integration_event
```

---

## Table Count

| Domain | Count |
|--------|-------|
| SaaS | 6 |
| Identity | 6 |
| Owner | 2 |
| Property | 8 |
| Channel | 5 |
| Calendar | 5 |
| Reservation | 8 |
| Communication | 4 |
| Operations | 7 |
| Transport | 4 |
| Maintenance | 4 |
| Access | 3 |
| Finance | 6 |
| Agentic | 6 |
| Governance | 6 |
| **TOTAL** | **80** |
