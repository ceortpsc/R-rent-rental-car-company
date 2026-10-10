-- RR-SEC-DB-003 · Enterprise tenant security and retention schema
-- DESIGN MIGRATION ONLY. NOT APPLIED. Run on dedicated reviewed Supabase project after backup and counsel approval.
create extension if not exists pgcrypto;
-- Extend staff roles: renter/additional driver must never be assigned as staff.
alter table public.staff_members drop constraint if exists staff_members_role_check;
alter table public.staff_members add constraint staff_members_role_check check(role in (
 'CORPORATE_OWNER','DIVISION_ADMIN','RENTAL_MANAGER','FLEET_MANAGER','FLEET_AGENT',
 'VERIFICATION_ANALYST','COMPLIANCE_OFFICER','BILLING_SPECIALIST','CUSTOMER_SUPPORT','AUDITOR','SECURITY_ADMIN'
));
create index if not exists rr_staff_tenant_lookup on public.staff_members(tenant,user_id,role) where active=true;
-- Only ciphertext envelopes, no plaintext ID scans or payment card numbers.
create table if not exists public.restricted_records(
 id uuid primary key default gen_random_uuid(),
 tenant text not null,subject_user_id uuid not null,application_id uuid references public.applications(id),
 field_class text not null check(field_class in ('driver_license','license_number','date_of_birth','identity_document','insurance_policy','insurance_declarations','bank_account','signed_contract','signature_image','government_identifier','incident_evidence')),
 envelope jsonb not null check(envelope ? 'alg' and envelope ? 'kid' and envelope ? 'iv' and envelope ? 'ct' and envelope ? 'tag'),
 checksum_sha256 text check(checksum_sha256 ~ '^[a-f0-9]{64}$'),
 key_id text not null,storage_region text,
 created_at timestamptz not null default now(),last_accessed_at timestamptz,
 retention_rule_id uuid,hold_count integer not null default 0,
 status text not null default 'ACTIVE' check(status in ('ACTIVE','QUARANTINED','ELIGIBLE_FOR_DISPOSAL','DISPOSED'))
);
create index if not exists rr_restricted_by_subject on public.restricted_records(tenant,subject_user_id,created_at desc);
create table if not exists public.security_incidents(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 classification text not null check(classification in('LOW','MEDIUM','HIGH','CRITICAL')),
 status text not null default 'OPEN' check(status in('OPEN','TRIAGE','CONTAINED','INVESTIGATING','RECOVERING','CLOSED')),
 summary_redacted text not null,opened_by uuid,assigned_to uuid,
 evidence_manifest_key text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.configuration_changes(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 scope text not null,config_key text not null,
 proposed_value_reference text,reason_redacted text,
 proposed_by uuid not null,reviewed_by uuid,approved_by uuid,
 previous_sha256 text,new_sha256 text,
 status text not null default 'PROPOSED' check(status in('PROPOSED','SECURITY_REVIEW','TESTED','APPROVED','APPLIED','ROLLED_BACK','REJECTED')),
 created_at timestamptz not null default now(),applied_at timestamptz,
 constraint rr_config_independent_approver check(approved_by is null or approved_by<>proposed_by)
);
create table if not exists public.legal_holds(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 hold_reference text not null,scope_type text not null,scope_reference text not null,
 reason_redacted text not null,created_by uuid not null,
 released_by uuid,created_at timestamptz not null default now(),released_at timestamptz,
 check(released_at is null or released_by is not null)
);
create table if not exists public.retention_rules(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 record_category text not null,revision text not null,
 trigger_event text not null,retention_days integer check(retention_days>=0),
 legal_approval_reference text,security_approval_reference text,
 is_approved boolean not null default false,created_at timestamptz not null default now(),
 unique(tenant,record_category,revision)
);
create table if not exists public.disposal_requests(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 object_category text not null,record_reference text not null,
 retention_rule_id uuid references public.retention_rules(id),
 proposed_by uuid not null,approved_by uuid,second_approved_by uuid,
 legal_hold_checked_at timestamptz,provider_delete_receipt_hash text,
 status text not null default 'PROPOSED' check(status in('PROPOSED','HOLD_CHECK','APPROVAL_PENDING','APPROVED','PURGING','VERIFICATION_PENDING','DISPOSED','BLOCKED')),
 created_at timestamptz not null default now(),completed_at timestamptz,
 constraint rr_disposal_independent_approvers check(approved_by is null or approved_by<>proposed_by),
 constraint rr_disposal_second_approval check(second_approved_by is null or (second_approved_by<>proposed_by and second_approved_by<>approved_by)),
 constraint rr_disposal_completion_requires_receipt check(status<>'DISPOSED' or (completed_at is not null and provider_delete_receipt_hash is not null and legal_hold_checked_at is not null))
);
create table if not exists public.privileged_events(
 id uuid primary key default gen_random_uuid(),tenant text not null,
 actor_user_id uuid,object_reference text,action text not null,
 decision text not null check(decision in('ALLOW','DENY','BLOCKED','REVIEW')),
 reason_redacted text,request_id uuid,evidence_sha256 text,
 occurred_at timestamptz not null default now()
);
create or replace function public.rr_append_only_privileged() returns trigger language plpgsql as $$
begin raise exception 'privileged audit is append-only';end;$$;
drop trigger if exists rr_privileged_event_immutable on public.privileged_events;
create trigger rr_privileged_event_immutable before update or delete on public.privileged_events for each row execute function public.rr_append_only_privileged();
do $$
declare t text;
begin
 foreach t in array array['restricted_records','security_incidents','configuration_changes','legal_holds','retention_rules','disposal_requests','privileged_events']
 loop execute format('alter table public.%I enable row level security',t);end loop;
end $$;
revoke all on public.restricted_records,public.security_incidents,public.configuration_changes,public.legal_holds,public.retention_rules,public.disposal_requests,public.privileged_events from anon,authenticated;
-- Grant only through dedicated server service function after verified JWT tenant membership, MFA, scope and object authorization.
-- No public policies. No sample PII, auto-approved retention windows or automatic purging seeded.
