-- R-Rent Sign v0.3: Prepared envelope storage only. NOT APPLIED.
-- Apply only in a dedicated encrypted R-Rent Supabase project after access/retention review.
-- Consent, delivery and signature execution must remain DISABLED until qualified audit and storage integrations exist.
create table if not exists public.envelopes(
 id uuid primary key default gen_random_uuid(),
 tenant text not null,
 created_by uuid not null,
 title text not null check(length(title) between 3 and 120),
 document_codes jsonb not null,
 recipients_json jsonb not null,
 revision_sha256 text not null check(revision_sha256 ~ '^[a-f0-9]{64}$'),
 expires_in_days integer not null check(expires_in_days between 1 and 30),
 status text not null default 'DRAFT' check(status in(
 'DRAFT','PENDING_INTERNAL_APPROVAL','READY_FOR_DELIVERY','ISSUED','VIEWED',
 'PARTIALLY_SIGNED','COMPLETED','DECLINED','VOID','EXPIRED')),
 finalized_artifact_sha256 text,
 issued_at timestamptz,completed_at timestamptz,created_at timestamptz not null default now()
);
create index if not exists rr_envelopes_creator on public.envelopes(tenant,created_by,created_at desc);
create table if not exists public.envelope_events(
 id uuid primary key default gen_random_uuid(),
 envelope_id uuid not null references public.envelopes(id),
 tenant text not null,
 actor_id uuid,
 action text not null,
 provider_id text,
 evidence_digest text,
 consent_revision text,
 happened_at timestamptz not null default now()
);
create or replace function public.rr_envelope_appendonly() returns trigger language plpgsql as $$
begin raise exception 'envelope events are append-only'; end; $$;
drop trigger if exists rr_envelope_event_immutability on public.envelope_events;
create trigger rr_envelope_event_immutability before update or delete on public.envelope_events
 for each row execute function public.rr_envelope_appendonly();
alter table public.envelopes enable row level security;
alter table public.envelope_events enable row level security;
revoke all on public.envelopes, public.envelope_events from anon,authenticated;
-- No browser SELECT/INSERT policies until tenant-scoped rights and end-user access are tested.
-- The backend service role may insert a DRAFT only after a live MFA-enabled, authorized staff session.
