import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

let db;
const tenant = 'ross-tax-pro-software-company';
const actors = {};
const digest = value => createHash('sha256').update(value).digest('hex');
async function call(name, args) {
  const values = Object.values({ p_tenant: tenant, ...args });
  const query = `select public.${name}(${Object.keys({ p_tenant: tenant, ...args }).map((key, index) => key + ' => $' + (index + 1)).join(',')}) as result`;
  return (await db.query(query, values)).rows[0].result;
}
async function addActor(name, role, targetTenant = tenant) {
  const id = randomUUID(), providerSession = randomUUID(), secret = digest(randomUUID());
  await db.query('insert into auth.users(id,email,email_confirmed_at,is_anonymous) values($1,$2,now(),false)', [id, name + '@example.invalid']);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [providerSession, id]);
  if (role) await db.query('insert into public.staff_members(user_id,tenant,role,active) values($1,$2,$3,true)', [id, targetTenant, role]);
  const actor = { p_actor: id, p_provider_session: providerSession, p_secret: secret, p_aal: 'aal2' };
  actors[name] = actor; return actor;
}
async function login(actor, targetTenant = tenant) {
  const { p_aal, ...args } = actor;
  await call('rr_mgmt_login', { ...args, p_tenant: targetTenant });
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to service_role;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);`);
  const original = readFileSync('supabase/migrations/20261008_001_rentals.sql', 'utf8');
  const staff = original.match(/create table if not exists public.staff_members\([\s\S]*?\);/)[0];
  const audit = original.match(/create table if not exists public.audit_events\([\s\S]*?\);/)[0];
  const immutable = original.slice(original.indexOf('create or replace function public.rr_immutable_audit'), original.indexOf('do $$'));
  await db.exec(staff + audit + immutable);
  const security = readFileSync('supabase/migrations/20261010_003_enterprise_security.sql', 'utf8');
  await db.exec(security.slice(security.indexOf('alter table public.staff_members'), security.indexOf('-- Only ciphertext')));
  await db.exec(readFileSync('supabase/migrations/20261024014334_management_access.sql', 'utf8'));
  for (const [name, role] of [['owner','CORPORATE_OWNER'],['reviewer','SECURITY_ADMIN'],['manager','RENTAL_MANAGER'],['auditor','AUDITOR'],['invitee',null],['stranger',null],['expired',null],['revoked',null]]) await addActor(name, role);
  await addActor('other', 'CORPORATE_OWNER', 'other-tenant');
  await db.query('insert into rr_private.management_releases(tenant,approved_by,reviewed_by,evidence_reference,active) values($1,$2,$3,$4,true)', [tenant, actors.owner.p_actor, actors.reviewer.p_actor, 'local-test-evidence-only']);
  await db.query('insert into rr_private.management_releases(tenant,approved_by,reviewed_by,evidence_reference,active) values($1,$2,$3,$4,true)', ['other-tenant', actors.owner.p_actor, actors.reviewer.p_actor, 'other-local-test-only']);
  await db.exec('set role service_role');
  for (const name of ['owner','reviewer','manager','auditor']) await login(actors[name]);
  await login(actors.other, 'other-tenant');
});
after(async () => { await db?.close(); });

test('database migration denies public clients private tables and every management RPC', async () => {
  const functions = (await db.query("select proname,has_function_privilege('anon',p.oid,'EXECUTE') as anonymous,has_function_privilege('authenticated',p.oid,'EXECUTE') as customer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'rr_mgmt_%'")).rows;
  assert.ok(functions.length >= 13);
  assert.ok(functions.every(f => !f.anonymous && !f.customer));
  await db.exec('reset role; set role authenticated');
  await assert.rejects(db.query('select * from rr_private.management_sessions'), /permission denied/);
  await assert.rejects(db.query('select public.rr_mgmt_ready($1)', [tenant]), /permission denied/);
  await db.exec('reset role; set role service_role');
});
test('database checks live provider sessions, active membership and explicit tenant', async () => {
  const { p_aal, ...args } = actors.manager;
  assert.equal((await call('rr_mgmt_context', args)).role, 'RENTAL_MANAGER');
  await assert.rejects(call('rr_mgmt_context', { ...args, p_tenant: 'other-tenant' }), /release_not_approved|session_denied/);
  await assert.rejects(call('rr_mgmt_context', { ...args, p_provider_session: actors.owner.p_provider_session }), /session_denied/);
  await assert.rejects(login(actors.stranger), /session_denied/);
  await assert.rejects(login(actors.other), /session_denied/);
  const otherMembers = await call('rr_mgmt_list', { ...actors.other, p_tenant: 'other-tenant', p_kind: 'members' });
  assert.deepEqual(otherMembers.map(row => row.user_id), [actors.other.p_actor]);
  const members = await call('rr_mgmt_list', { ...actors.owner, p_kind: 'members' });
  assert.ok(!members.some(row => row.user_id === actors.other.p_actor));
});
test('rental manager cannot administer staff, approve access, or read private IAM audit', async () => {
  for (const p_kind of ['members','changes','audit']) await assert.rejects(call('rr_mgmt_list', { ...actors.manager, p_kind }), /permission_denied/);
  await assert.rejects(call('rr_mgmt_propose', { ...actors.manager, p_kind: 'INVITE', p_target: null, p_email: 'x@example.invalid', p_role: 'SECURITY_ADMIN', p_reason: 'not authorized', p_version: null }), /permission_denied/);
});
test('staff operations reject absent or first-factor-only MFA', async () => {
  for (const p_aal of ['aal1', null]) await assert.rejects(call('rr_mgmt_list', { ...actors.owner, p_aal, p_kind: 'members' }), /mfa_required/);
});
test('invitation requires independent approval, matching confirmed email, MFA, and single acceptance', async () => {
  const id = await call('rr_mgmt_propose', { ...actors.owner, p_kind: 'INVITE', p_target: null, p_email: 'invitee@example.invalid', p_role: 'RENTAL_MANAGER', p_reason: 'designated manager onboarding test', p_version: null });
  await assert.rejects(call('rr_mgmt_approve', { ...actors.owner, p_change: id }), /second_approver_required/);
  await assert.rejects(call('rr_mgmt_approve', { ...actors.auditor, p_change: id }), /permission_denied/);
  await call('rr_mgmt_approve', { ...actors.reviewer, p_change: id });
  await assert.rejects(login(actors.invitee), /session_denied/);
  await call('rr_mgmt_invitation', { ...actors.owner, p_invitation: id, p_operation: 'claim' });
  await assert.rejects(call('rr_mgmt_invitation', { ...actors.owner, p_invitation: id, p_operation: 'claim' }), /change_conflict/);
  await call('rr_mgmt_invitation', { ...actors.owner, p_invitation: id, p_operation: 'sent' });
  await assert.rejects(login(actors.stranger), /session_denied/);
  await login(actors.invitee);
  await assert.rejects(call('rr_mgmt_accept', { ...actors.invitee, p_aal: 'aal1' }), /mfa_required/);
  assert.equal(await call('rr_mgmt_accept', actors.invitee), 'RENTAL_MANAGER');
  await assert.rejects(call('rr_mgmt_accept', actors.invitee), /invitation_unavailable/);
});
test('role approval is atomic, rejects stale versions and revokes target sessions', async () => {
  const propose = () => call('rr_mgmt_propose', { ...actors.owner, p_kind: 'ROLE', p_target: actors.invitee.p_actor, p_email: null, p_role: 'FLEET_MANAGER', p_reason: 'approved scope adjustment test', p_version: 1 });
  const first = await propose(), stale = await propose();
  await call('rr_mgmt_approve', { ...actors.reviewer, p_change: first });
  await assert.rejects(call('rr_mgmt_approve', { ...actors.reviewer, p_change: stale }), /change_conflict/);
  const { p_aal, ...args } = actors.invitee;
  await assert.rejects(call('rr_mgmt_context', args), /session_denied/);
  assert.ok((await call('rr_mgmt_list', { ...actors.owner, p_kind: 'members' })).some(m => m.user_id === actors.invitee.p_actor && m.role === 'FLEET_MANAGER' && m.version === 2));
});
test('expired and revoked provider invitations cannot create a management session', async () => {
  for (const name of ['expired','revoked']) {
    const id = await call('rr_mgmt_propose', { ...actors.owner, p_kind: 'INVITE', p_target: null, p_email: name + '@example.invalid', p_role: 'RENTAL_MANAGER', p_reason: 'expiry and revocation test', p_version: null });
    await call('rr_mgmt_approve', { ...actors.reviewer, p_change: id });
    await call('rr_mgmt_invitation', { ...actors.owner, p_invitation: id, p_operation: 'claim' });
    await call('rr_mgmt_invitation', { ...actors.owner, p_invitation: id, p_operation: 'sent' });
    if (name === 'revoked') await call('rr_mgmt_invitation', { ...actors.owner, p_invitation: id, p_operation: 'revoke' });
    else { await db.exec('reset role'); await db.query("update rr_private.staff_invitations set expires_at=now()-interval '1 second' where id=$1", [id]); await db.exec('set role service_role'); }
    await assert.rejects(login(actors[name]), /session_denied/);
  }
});
test('owner protection, suspension and logout deny retained tokens immediately', async () => {
  await assert.rejects(call('rr_mgmt_suspend', { ...actors.reviewer, p_target: actors.owner.p_actor, p_version: 1 }), /last_owner_protected/);
  await assert.rejects(call('rr_mgmt_suspend', { ...actors.owner, p_target: actors.owner.p_actor, p_version: 1 }), /self_change_denied/);
  await call('rr_mgmt_suspend', { ...actors.owner, p_target: actors.manager.p_actor, p_version: 1 });
  const { p_aal, ...args } = actors.manager;
  await assert.rejects(call('rr_mgmt_context', args), /session_denied/);
  await assert.rejects(login({ ...actors.manager, p_secret: digest('fresh') }), /session_denied/);
  await call('rr_mgmt_logout', { p_secret: actors.auditor.p_secret, p_all: true });
  await assert.rejects(call('rr_mgmt_context', { p_actor: actors.auditor.p_actor, p_provider_session: actors.auditor.p_provider_session, p_secret: actors.auditor.p_secret }), /session_denied/);
});
test('audit records are append-only and scoped; audit failure rolls back privilege changes', async () => {
  const events = await call('rr_mgmt_list', { ...actors.owner, p_kind: 'audit' });
  assert.ok(events.some(e => e.action === 'management.invitation.accepted'));
  await assert.rejects(db.query("update public.audit_events set reason='tampered'"), /permission denied/);
  await db.exec('reset role');
  await assert.rejects(db.query("delete from public.audit_events"), /audit is append-only/);
  await db.exec('revoke insert on public.audit_events from service_role; set role service_role');
  await assert.rejects(call('rr_mgmt_suspend', { ...actors.owner, p_target: actors.reviewer.p_actor, p_version: 1 }), /permission denied/);
  const members = await call('rr_mgmt_list', { ...actors.owner, p_kind: 'members' });
  assert.equal(members.find(m => m.user_id === actors.reviewer.p_actor).active, true);
  await db.exec('reset role; grant insert on public.audit_events to service_role; set role service_role');
});
test('database rate limits persist across requests and idle/expired sessions are rejected', async () => {
  for (let n = 0; n < 20; n++) assert.equal(await call('rr_mgmt_rate', { p_bucket: digest('limit-test') }), true);
  assert.equal(await call('rr_mgmt_rate', { p_bucket: digest('limit-test') }), false);
  await db.exec('reset role');
  await db.query("update rr_private.management_sessions set last_seen_at=now()-interval '21 minutes' where secret_sha256=$1", [actors.reviewer.p_secret]);
  await db.exec('set role service_role');
  await assert.rejects(call('rr_mgmt_refresh_allowed', { p_secret: actors.reviewer.p_secret }), /session_denied/);
  await db.exec('reset role');
  await db.query('delete from auth.sessions where id=$1', [actors.owner.p_provider_session]);
  const { p_aal, ...args } = actors.owner;
  await assert.rejects(call('rr_mgmt_context', args), /session_denied/);
});
