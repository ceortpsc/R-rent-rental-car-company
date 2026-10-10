-- R-Rent customer-care operational records. Reviewed deployment only; NOT APPLIED.
-- Run exclusively on the dedicated approved R-Rent Supabase project.
create table if not exists public.support_cases(
 id uuid primary key default gen_random_uuid(),
 tenant text not null,
 user_id uuid not null,
 kind text not null check(kind in ('FEEDBACK','REVIEW','COMPLAINT','CHARGE_DISPUTE')),
 category text not null check(length(category) between 1 and 80),
 reference text check(length(reference)<=48),
 description text not null check(length(description) between 15 and 3000),
 amount_cents bigint check(amount_cents between 0 and 99999999),
 rating smallint check(rating between 1 and 5),
 status text not null default 'SUBMITTED' check(status in('SUBMITTED','ACKNOWLEDGED','UNDER_REVIEW','NEEDS_INFORMATION','RESOLVED','CLOSED')),
 assigned_to uuid,
 resolution_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists rr_case_owner_idx on public.support_cases(tenant,user_id,created_at desc);
create table if not exists public.support_case_events(
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.support_cases(id),
 tenant text not null,
 actor_id uuid,
 action text not null,
 details text,
 recorded_at timestamptz not null default now()
);
create or replace function public.rr_support_event_immutable() returns trigger language plpgsql as $$
begin raise exception 'support audit is append-only'; end; $$;
drop trigger if exists rr_support_no_mutation on public.support_case_events;
create trigger rr_support_no_mutation before update or delete on public.support_case_events
for each row execute function public.rr_support_event_immutable();
alter table public.support_cases enable row level security;
alter table public.support_case_events enable row level security;
revoke all on public.support_cases,public.support_case_events from anon,authenticated;
-- All access through authenticated server functions using service role, strictly scoped by TENANT and verified user.id.
-- Add required operations role workflows, rotation, retention, DSAR and encrypted attachment storage before enabling public intake.
