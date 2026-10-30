-- SOURCE ONLY: not applied to any connected database. No identities or approvals are seeded.
-- CLI scaffold created before telemetry was blocked; no further CLI execution.
begin;
create schema if not exists rr_private;
revoke all on schema rr_private from public, anon, authenticated;
grant usage on schema rr_private to service_role;
alter table public.staff_members add column if not exists version integer not null default 1;
create table rr_private.management_releases (
 tenant text primary key, approved_by uuid not null, reviewed_by uuid not null,
 evidence_reference text not null check(length(evidence_reference) between 8 and 200),
 approved_at timestamptz not null default now(), active boolean not null default false,
 check(approved_by <> reviewed_by)
);
create table rr_private.management_sessions (
 secret_sha256 text primary key check(secret_sha256 ~ '^[a-f0-9]{64}$'),
 tenant text not null, user_id uuid not null references auth.users(id),
 provider_session_id uuid not null, created_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '8 hours',
 revoked_at timestamptz
);
create index rr_mgmt_sessions_user on rr_private.management_sessions(tenant,user_id);
create table rr_private.access_changes (
 id uuid primary key default gen_random_uuid(), tenant text not null,
 kind text not null check(kind in ('INVITE','ROLE','REACTIVATE')),
 target_user_id uuid, email text, role text not null,
 expected_version integer, proposed_by uuid not null, approved_by uuid,
 reason text not null check(length(reason) between 8 and 500),
 status text not null default 'PROPOSED' check(status in ('PROPOSED','APPROVED','APPLIED','REVOKED')),
 expires_at timestamptz not null default now()+interval '24 hours', created_at timestamptz not null default now(),
 check(approved_by is null or (approved_by<>proposed_by and approved_by is distinct from target_user_id)),
 check(role in ('DIVISION_ADMIN','RENTAL_MANAGER','FLEET_MANAGER','FLEET_AGENT','VERIFICATION_ANALYST',
 'COMPLIANCE_OFFICER','BILLING_SPECIALIST','CUSTOMER_SUPPORT','AUDITOR','SECURITY_ADMIN')),
 check((kind='INVITE' and email is not null and target_user_id is null) or (kind<>'INVITE' and target_user_id is not null))
);
create table rr_private.staff_invitations (
 id uuid primary key references rr_private.access_changes(id), tenant text not null,
 email text not null, role text not null, proposed_by uuid not null, approved_by uuid not null,
 status text not null default 'APPROVED' check(status in ('APPROVED','SENDING','SENT','ACCEPTED','REVOKED')),
 expires_at timestamptz not null default now()+interval '7 days', sent_at timestamptz,
 claimed_at timestamptz, accepted_by uuid, accepted_at timestamptz,
 check(proposed_by<>approved_by)
);
create unique index rr_one_open_invite on rr_private.staff_invitations(tenant,email)
 where status in ('APPROVED','SENDING','SENT');
create table rr_private.management_rates (
 tenant text not null, bucket text not null, window_start timestamptz not null default now(),
 attempts integer not null default 1, primary key(tenant,bucket)
);
-- Private schema, no Data API exposure. RLS is additional defense; only server service role has grants.
alter table rr_private.management_releases enable row level security;
alter table rr_private.management_sessions enable row level security;
alter table rr_private.access_changes enable row level security;
alter table rr_private.staff_invitations enable row level security;
alter table rr_private.management_rates enable row level security;
grant select on rr_private.management_releases to service_role;
grant select,insert,update on rr_private.management_sessions,rr_private.access_changes,
 rr_private.staff_invitations,rr_private.management_rates to service_role;
grant select,insert,update on public.staff_members to service_role;
grant select,insert on public.audit_events to service_role;
grant select(id,email,email_confirmed_at,is_anonymous) on auth.users to service_role;
grant select(id,user_id,not_after) on auth.sessions to service_role;

create function public.rr_mgmt_ready(p_tenant text) returns boolean language sql stable as $$
 select exists(select 1 from rr_private.management_releases where tenant=p_tenant and active and approved_by<>reviewed_by);
$$;
create function public.rr_mgmt_audit(p_tenant text,p_actor uuid,p_action text,p_reason text) returns void language plpgsql as $$
begin
 if p_action !~ '^management\.[a-z_.]+$' or length(p_reason)>120 then raise exception 'permission_denied'; end if;
 insert into public.audit_events(tenant,actor_id,action,reason) values(p_tenant,p_actor,p_action,p_reason);
end; $$;
create function public.rr_mgmt_rate(p_tenant text,p_bucket text) returns boolean language plpgsql as $$
declare n integer;
begin
 if p_bucket !~ '^[a-f0-9]{64}$' then raise exception 'permission_denied'; end if;
 insert into rr_private.management_rates as r(tenant,bucket) values(p_tenant,p_bucket)
 on conflict(tenant,bucket) do update set
 attempts=case when r.window_start<now()-interval '10 minutes' then 1 else r.attempts+1 end,
 window_start=case when r.window_start<now()-interval '10 minutes' then now() else r.window_start end
 returning attempts into n;
 return n<=20;
end; $$;
create function public.rr_mgmt_login(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text) returns void language plpgsql as $$
begin
 if not public.rr_mgmt_ready(p_tenant) then raise exception 'release_not_approved'; end if;
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
 where s.id=p_provider_session and s.user_id=p_actor and (s.not_after is null or s.not_after>now())
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) then raise exception 'session_denied'; end if;
 if not exists(select 1 from public.staff_members where tenant=p_tenant and user_id=p_actor and active)
 and not exists(select 1 from rr_private.staff_invitations i join auth.users u on lower(u.email)=i.email
 where i.tenant=p_tenant and u.id=p_actor and i.status='SENT' and i.expires_at>now()
 and not exists(select 1 from public.staff_members where user_id=p_actor)) then raise exception 'session_denied'; end if;
 insert into rr_private.management_sessions(secret_sha256,tenant,user_id,provider_session_id) values(p_secret,p_tenant,p_actor,p_provider_session);
 perform public.rr_mgmt_audit(p_tenant,p_actor,'management.login','provider_identity_verified');
end; $$;
create function public.rr_mgmt_refresh_allowed(p_tenant text,p_secret text) returns boolean language plpgsql as $$
begin
 if not exists(select 1 from rr_private.management_sessions where tenant=p_tenant and secret_sha256=p_secret
 and revoked_at is null and expires_at>now() and last_seen_at>now()-interval '20 minutes') then raise exception 'session_denied'; end if;
 return true;
end; $$;
create function public.rr_mgmt_context(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text) returns jsonb language plpgsql as $$
declare m public.staff_members; pending boolean;
begin
 if not public.rr_mgmt_ready(p_tenant) then raise exception 'release_not_approved'; end if;
 perform public.rr_mgmt_refresh_allowed(p_tenant,p_secret);
 if not exists(select 1 from rr_private.management_sessions r join auth.sessions s on s.id=r.provider_session_id
 where r.tenant=p_tenant and r.secret_sha256=p_secret and r.user_id=p_actor and s.user_id=p_actor
 and s.id=p_provider_session and (s.not_after is null or s.not_after>now())) then raise exception 'session_denied'; end if;
 select * into m from public.staff_members where tenant=p_tenant and user_id=p_actor;
 select exists(select 1 from rr_private.staff_invitations i join auth.users u on lower(u.email)=i.email
 where i.tenant=p_tenant and u.id=p_actor and i.status='SENT' and i.expires_at>now()) into pending;
 -- Suspended members cannot regain access through a fresh invitation.
 if (m.user_id is not null and not m.active) or (m.user_id is null and not pending) then raise exception 'session_denied'; end if;
 update rr_private.management_sessions set last_seen_at=now() where secret_sha256=p_secret and tenant=p_tenant;
 return jsonb_build_object('role',m.role,'active',coalesce(m.active,false),'pending_invitation',pending,'version',m.version);
end; $$;
create function rr_private.require_actor(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text,p_roles text[])
 returns text language plpgsql as $$
declare c jsonb; locked_role text;
begin
 c:=public.rr_mgmt_context(p_tenant,p_actor,p_provider_session,p_secret);
 if p_aal is distinct from 'aal2' then raise exception 'mfa_required'; end if;
 if not (c->>'active')::boolean or not (c->>'role'=any(p_roles)) then raise exception 'permission_denied'; end if;
 -- Hold the active membership through the entire operation so a concurrent
 -- suspension/role change cannot race a previously authorized mutation.
 select role into locked_role from public.staff_members where tenant=p_tenant and user_id=p_actor and active and role=any(p_roles) for share;
 if locked_role is null then raise exception 'permission_denied'; end if;
 return locked_role;
end; $$;
create function public.rr_mgmt_list(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text,p_kind text)
 returns jsonb language plpgsql as $$
declare result jsonb;
begin
 if p_kind='audit' then
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','DIVISION_ADMIN','COMPLIANCE_OFFICER','AUDITOR','SECURITY_ADMIN']);
 select coalesce(jsonb_agg(row_to_json(x)),'[]') into result from (select id,actor_id,action,reason,recorded_at from public.audit_events where tenant=p_tenant and action like 'management.%' order by recorded_at desc,id desc limit 100) x;
 elsif p_kind='members' then
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','DIVISION_ADMIN','SECURITY_ADMIN']);
 select coalesce(jsonb_agg(row_to_json(x)),'[]') into result from (select user_id,role,active,version,created_at from public.staff_members where tenant=p_tenant order by created_at desc,user_id limit 100) x;
 elsif p_kind='changes' then
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','DIVISION_ADMIN','SECURITY_ADMIN']);
 select coalesce(jsonb_agg(row_to_json(x)),'[]') into result from (select c.*,i.status as delivery_status from rr_private.access_changes c left join rr_private.staff_invitations i on i.id=c.id and i.tenant=c.tenant where c.tenant=p_tenant order by c.created_at desc,c.id limit 100) x;
 else raise exception 'permission_denied'; end if;
 return result;
end; $$;
create function public.rr_mgmt_propose(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text,p_kind text,p_target uuid,p_email text,p_role text,p_reason text,p_version integer)
 returns uuid language plpgsql as $$
declare change_id uuid; m public.staff_members;
begin
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','SECURITY_ADMIN']);
 if p_target=p_actor then raise exception 'self_change_denied'; end if;
 if p_kind<>'INVITE' then
 select * into m from public.staff_members where tenant=p_tenant and user_id=p_target for update;
 if m.user_id is null or m.version<>p_version then raise exception 'change_conflict'; end if;
 if m.role='CORPORATE_OWNER' then raise exception 'last_owner_protected'; end if;
 end if;
 insert into rr_private.access_changes(tenant,kind,target_user_id,email,role,expected_version,proposed_by,reason)
 values(p_tenant,p_kind,p_target,lower(p_email),p_role,p_version,p_actor,p_reason) returning id into change_id;
 perform public.rr_mgmt_audit(p_tenant,p_actor,'management.change.proposed',change_id::text);
 return change_id;
end; $$;
create function public.rr_mgmt_approve(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text,p_change uuid)
 returns uuid language plpgsql as $$
declare c rr_private.access_changes; m public.staff_members;
begin
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','SECURITY_ADMIN']);
 select * into c from rr_private.access_changes where id=p_change and tenant=p_tenant for update;
 if c.id is null or c.status<>'PROPOSED' or c.expires_at<=now() then raise exception 'change_conflict'; end if;
 if c.proposed_by=p_actor or c.target_user_id=p_actor then raise exception 'second_approver_required'; end if;
 if not exists(select 1 from public.staff_members where tenant=p_tenant and user_id=c.proposed_by and active and role in ('CORPORATE_OWNER','SECURITY_ADMIN')) then raise exception 'permission_denied'; end if;
 if c.kind='INVITE' then
 update rr_private.staff_invitations set status='REVOKED' where tenant=p_tenant and email=c.email and status in ('APPROVED','SENDING','SENT') and expires_at<=now();
 insert into rr_private.staff_invitations(id,tenant,email,role,proposed_by,approved_by) values(c.id,p_tenant,c.email,c.role,c.proposed_by,p_actor);
 else
 select * into m from public.staff_members where tenant=p_tenant and user_id=c.target_user_id for update;
 if m.user_id is null or m.version<>c.expected_version then raise exception 'change_conflict'; end if;
 if m.role='CORPORATE_OWNER' then raise exception 'last_owner_protected'; end if;
 update public.staff_members set role=c.role,active=true,version=version+1,assigned_by=p_actor where tenant=p_tenant and user_id=c.target_user_id;
 update rr_private.management_sessions set revoked_at=now() where tenant=p_tenant and user_id=c.target_user_id and revoked_at is null;
 end if;
 update rr_private.access_changes set approved_by=p_actor,status=case when c.kind='INVITE' then 'APPROVED' else 'APPLIED' end where id=c.id;
 perform public.rr_mgmt_audit(p_tenant,p_actor,'management.change.approved',c.id::text);
 return c.id;
end; $$;
create function public.rr_mgmt_invitation(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text,p_invitation uuid,p_operation text)
 returns jsonb language plpgsql as $$
declare i rr_private.staff_invitations;
begin
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','SECURITY_ADMIN']);
 select * into i from rr_private.staff_invitations where id=p_invitation and tenant=p_tenant for update;
 if i.id is null or i.expires_at<=now() or i.status in ('ACCEPTED','REVOKED') then raise exception 'invitation_unavailable'; end if;
 if p_operation='claim' then
 if i.status<>'APPROVED' and not(i.status='SENDING' and i.claimed_at<now()-interval '10 minutes') then raise exception 'change_conflict'; end if;
 update rr_private.staff_invitations set status='SENDING',claimed_at=now() where id=i.id;
 elsif p_operation='sent' then
 if i.status<>'SENDING' then raise exception 'change_conflict'; end if;
 update rr_private.staff_invitations set status='SENT',sent_at=now() where id=i.id;
 elsif p_operation='revoke' then
 update rr_private.staff_invitations set status='REVOKED' where id=i.id;
 else raise exception 'permission_denied'; end if;
 perform public.rr_mgmt_audit(p_tenant,p_actor,'management.invitation.'||p_operation,i.id::text);
 return jsonb_build_object('id',i.id,'email',i.email,'role',i.role);
end; $$;
create function public.rr_mgmt_accept(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text)
 returns text language plpgsql as $$
declare i rr_private.staff_invitations; c jsonb;
begin
 c:=public.rr_mgmt_context(p_tenant,p_actor,p_provider_session,p_secret);
 if p_aal is distinct from 'aal2' then raise exception 'mfa_required'; end if;
 select x.* into i from rr_private.staff_invitations x join auth.users u on lower(u.email)=x.email
 where x.tenant=p_tenant and u.id=p_actor and u.email_confirmed_at is not null and x.status='SENT' and x.expires_at>now() for update of x;
 if i.id is null or exists(select 1 from public.staff_members where user_id=p_actor) then raise exception 'invitation_unavailable'; end if;
 if i.proposed_by=p_actor or i.approved_by=p_actor then raise exception 'self_change_denied'; end if;
 if (select count(*) from public.staff_members where tenant=p_tenant and user_id in(i.proposed_by,i.approved_by) and active and role in('CORPORATE_OWNER','SECURITY_ADMIN'))<>2 then raise exception 'permission_denied'; end if;
 insert into public.staff_members(user_id,tenant,role,active,assigned_by) values(p_actor,p_tenant,i.role,true,i.approved_by);
 update rr_private.staff_invitations set status='ACCEPTED',accepted_by=p_actor,accepted_at=now() where id=i.id;
 perform public.rr_mgmt_audit(p_tenant,p_actor,'management.invitation.accepted',i.id::text);
 return i.role;
end; $$;
create function public.rr_mgmt_suspend(p_tenant text,p_actor uuid,p_provider_session uuid,p_secret text,p_aal text,p_target uuid,p_version integer)
 returns void language plpgsql as $$
declare m public.staff_members;
begin
 perform rr_private.require_actor(p_tenant,p_actor,p_provider_session,p_secret,p_aal,array['CORPORATE_OWNER','SECURITY_ADMIN']);
 if p_target=p_actor then raise exception 'self_change_denied'; end if;
 select * into m from public.staff_members where tenant=p_tenant and user_id=p_target for update;
 if m.user_id is null or m.version<>p_version then raise exception 'change_conflict'; end if;
 if m.role='CORPORATE_OWNER' then raise exception 'last_owner_protected'; end if;
 update public.staff_members set active=false,version=version+1 where tenant=p_tenant and user_id=p_target;
 update rr_private.management_sessions set revoked_at=now() where tenant=p_tenant and user_id=p_target and revoked_at is null;
 perform public.rr_mgmt_audit(p_tenant,p_actor,'management.member.suspended',p_target::text);
end; $$;
create function public.rr_mgmt_logout(p_tenant text,p_secret text,p_all boolean default false) returns void language plpgsql as $$
declare r rr_private.management_sessions;
begin
 select * into r from rr_private.management_sessions where tenant=p_tenant and secret_sha256=p_secret;
 if r.secret_sha256 is null then return; end if;
 update rr_private.management_sessions set revoked_at=now() where tenant=p_tenant and revoked_at is null
 and (secret_sha256=p_secret or (p_all and user_id=r.user_id));
 perform public.rr_mgmt_audit(p_tenant,r.user_id,'management.logout',case when p_all then 'all_sessions_revoked' else 'session_revoked' end);
end; $$;
-- No SECURITY DEFINER functions: the backend service role has only the required
-- Auth column grants. Every RPC is explicitly revoked from public clients.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='public' and p.proname like 'rr_mgmt_%') or (n.nspname='rr_private' and p.proname='require_actor')
 loop
 execute 'revoke all on function '||f.signature||' from public, anon, authenticated';
 execute 'grant execute on function '||f.signature||' to service_role';
 end loop;
end; $$;
commit;
