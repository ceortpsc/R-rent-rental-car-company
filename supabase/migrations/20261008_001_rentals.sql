-- R-Rent v0.2.0 data model. Authored but NOT applied. Review and run ONLY in a dedicated approved R-Rent project.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create table if not exists public.vehicles(
 id text primary key,tenant text not null default 'ross-tax-pro-software-company',
 model text not null,daily_rate_cents int check(daily_rate_cents>=0),
 rate_approved boolean not null default false,availability_enabled boolean not null default false,
 vin_ciphertext bytea,created_at timestamptz not null default now());
create table if not exists public.applications(
 id uuid primary key default gen_random_uuid(), tenant text not null,user_id uuid not null,
 vehicle_id text not null references public.vehicles(id),pickup_at timestamptz not null,
 return_at timestamptz not null,days int not null check(days between 1 and 180),
 base_cents bigint not null check(base_cents>=0),state_tax_cents bigint not null check(state_tax_cents>=0),
 provisional_cents bigint not null check(provisional_cents>=0),final_invoice_cents bigint,
 final_invoice_hash text,
 status text not null default 'DRAFT' check(status in('DRAFT','SUBMITTED','IN_REVIEW','APPROVED','DECLINED','CANCELED','ACTIVE','RETURNED','CLOSED')),
 identity_status text not null default 'NOT_VERIFIED' check(identity_status in('NOT_VERIFIED','REVIEW','VERIFIED','REJECTED')),
 insurance_status text not null default 'NOT_VERIFIED' check(insurance_status in('NOT_VERIFIED','REVIEW','VERIFIED','REJECTED')),
 agreement_status text not null default 'NOT_SIGNED' check(agreement_status in('NOT_SIGNED','ISSUED','SIGNED','VOID')),
 payment_status text not null default 'NOT_PAID' check(payment_status in('NOT_PAID','PENDING','VERIFIED','REFUNDED','DISPUTED')),
 approved_by uuid,approved_at timestamptz,created_at timestamptz not null default now(),
 constraint chron_valid check(return_at>pickup_at));
-- An approved reservation cannot overlap another approved/active reservation for the same car.
alter table public.applications add constraint rr_no_active_overlap
 exclude using gist(vehicle_id with =,tstzrange(pickup_at,return_at,'[)') with &&)
 where(status in('APPROVED','ACTIVE'));
create index if not exists rr_app_owner_idx on public.applications(tenant,user_id,created_at desc);
create table if not exists public.staff_members(
 user_id uuid primary key,tenant text not null,
 role text not null check(role in('FLEET_AGENT','VERIFICATION_ANALYST','COMPLIANCE_OFFICER','BILLING_SPECIALIST','FLEET_MANAGER','CUSTOMER_SUPPORT','AUDITOR','DIVISION_ADMIN','CORPORATE_OWNER')),
 active boolean not null default false,assigned_by uuid,created_at timestamptz not null default now());
create table if not exists public.verification_cases(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 application_id uuid not null references public.applications(id),kind text not null,
 status text not null default 'PENDING',provider text,provider_reference text,
 evidence_hash text,reviewer_user_id uuid,reviewed_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.documents(
 id uuid primary key,tenant text not null,user_id uuid not null,
 application_id uuid not null references public.applications(id),
 document_type text not null,content_type text not null,size_bytes bigint not null check(size_bytes between 1 and 10485760),
 object_key text,sha256 text,scan_status text not null default 'PENDING_UPLOAD',
 review_status text not null default 'PENDING',expires_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.agreements(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 application_id uuid not null references public.applications(id),document_code text not null,
 revision text not null,content_sha256 text not null,signer_user_id uuid,
 provider_envelope_id text,status text not null default 'DRAFT',
 signed_at timestamptz,audit_certificate_key text,created_at timestamptz not null default now(),
 unique(application_id,document_code,revision));
create table if not exists public.payments(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 application_id uuid not null references public.applications(id),
 provider text not null check(provider in('STRIPE','PAYPAL')),provider_object_id text unique,
 provider_event_id text unique,amount_cents bigint not null check(amount_cents>=0),
 currency text not null default 'USD',status text not null default 'PENDING',
 captured_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.webhook_events(
 provider text not null,event_id text not null,tenant text not null,
 signature_verified boolean not null,payload_sha256 text not null,
 received_at timestamptz not null default now(),processed_at timestamptz,
 primary key(provider,event_id));
create table if not exists public.audit_events(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 application_id uuid,actor_id uuid,action text not null,reason text,
 evidence_sha256 text,recorded_at timestamptz not null default now());
create or replace function public.rr_immutable_audit() returns trigger language plpgsql as $$
begin raise exception 'audit is append-only';end;$$;
drop trigger if exists rr_no_audit_mutation on public.audit_events;
create trigger rr_no_audit_mutation before update or delete on public.audit_events
 for each row execute function public.rr_immutable_audit();
do $$
declare t text;
begin
 foreach t in array array['vehicles','applications','staff_members','verification_cases','documents','agreements','payments','webhook_events','audit_events']
 loop execute format('alter table public.%I enable row level security',t);end loop;
end $$;
revoke all on public.vehicles,public.applications,public.staff_members,
 public.verification_cases,public.documents,public.agreements,public.payments,
 public.webhook_events,public.audit_events from anon,authenticated;
-- Do NOT seed real customers or assumed coverage.
insert into public.vehicles(id,model,daily_rate_cents,rate_approved,availability_enabled)
 values('trailblazer-2026','2026 Chevrolet Trailblazer',5900,false,false),
 ('bronco-sport-big-bend-2026','2026 Ford Bronco Sport Big Bend',null,false,false)
on conflict(id) do nothing;
