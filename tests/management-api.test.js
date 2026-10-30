import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/v1/health.js';
import { managementAllowed, managementDescriptor } from '../lib/management-policy.js';
import { ROLE_NAMES } from '../lib/rbac.js';
import { TENANT } from '../lib/identity.js';
const originalFetch = global.fetch, originalEnv = { ...process.env };
const uid = '11111111-1111-4111-8111-111111111111', sid = '22222222-2222-4222-8222-222222222222';
const fid = '33333333-3333-4333-8333-333333333333';
const origin = 'https://rental.example.invalid', issuer = 'https://rr-test.supabase.co';
const jwt = (aal = 'aal2', extra = {}) => 'header.' + Buffer.from(JSON.stringify({ sub: uid, session_id: sid, aud: 'authenticated', iss: issuer + '/auth/v1', exp: Date.now() / 1000 + 3600, aal, ...extra })).toString('base64url') + '.signature';
afterEach(() => { global.fetch = originalFetch; for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]; Object.assign(process.env, originalEnv); });
function setup({ role = 'CORPORATE_OWNER', aal = 'aal2', override } = {}) {
  Object.assign(process.env, { RR_ENABLE_MANAGEMENT: 'true', RR_ENABLE_RBAC: 'true', RR_ALLOWED_ORIGIN: origin, SUPABASE_URL: issuer, SUPABASE_ANON_KEY: 'test-public-key', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' });
  const calls = [], token = jwt(aal);
  global.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname, body = options.body ? JSON.parse(options.body) : {};
    const call = { path, url: String(url), ...options, body }; calls.push(call);
    const replacement = override?.(call);
    if (replacement !== undefined) return replacement;
    if (path.endsWith('/user')) return Response.json({ id: uid, aud: 'authenticated', email: 'staff@example.invalid', email_confirmed_at: new Date().toISOString(), factors: [{ id: fid, factor_type: 'totp', status: 'verified' }] });
    if (path.endsWith('/token') || path.endsWith('/verify')) return Response.json({ access_token: token, refresh_token: 'test-refresh-token', expires_in: 3600 });
    if (path.includes('/rest/v1/rpc/')) {
      assert.equal(body.p_tenant, TENANT);
      assert.equal(options.headers.apikey, 'test-service-key');
      const name = path.split('/').at(-1);
      if (name === 'rr_mgmt_context') return Response.json({ active: true, role, version: 1, pending_invitation: false });
      if (name === 'rr_mgmt_list') return Response.json([]);
      if (name === 'rr_mgmt_invitation') return Response.json({ email: 'manager@example.invalid', role: 'RENTAL_MANAGER' });
      return Response.json(true);
    }
    if (path.endsWith('/challenge')) return Response.json({ id: sid });
    return Response.json({});
  };
  return { calls, token };
}
async function request(action, body, { token = jwt(), headers = {}, cookie = true, method } = {}) {
  const req = { url: '/api/v1/health?mode=management&action=' + action, method: method || (body === undefined ? 'GET' : 'POST'), body,
    socket: { remoteAddress: '127.0.0.1' }, headers: { 'content-type': 'application/json', origin, 'x-rrent-action': '1', 'sec-fetch-site': 'same-origin',
      ...(cookie ? { cookie: `__Host-rr_access=${token}; __Host-rr_refresh=test-refresh-token; __Host-rr_session=${'a'.repeat(43)}` } : {}), ...headers } };
  const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, end(value) { this.body = JSON.parse(value); } };
  await handler(req, res); return res;
}
test('management policy reconciles all 13 roles without owner or manager execution bypasses', () => {
  for (const role of ROLE_NAMES) {
    const actor = { role, aal: 'aal2', active: true };
    assert.equal(managementAllowed(actor, 'rental.release'), false);
    assert.equal(managementAllowed(actor, 'unknown'), false);
    const descriptor = managementDescriptor(actor);
    if (['RENTER','ADDITIONAL_DRIVER'].includes(role)) assert.equal(descriptor, null);
    else for (const key of ['vehicle_release','binding_signatures','financial_transactions','insurance_verification']) assert.equal(descriptor[key], false);
  }
  assert.equal(managementAllowed({ role: 'RENTAL_MANAGER', aal: 'aal2', active: true }, 'changes.propose'), false);
  assert.equal(managementAllowed({ role: 'CORPORATE_OWNER', aal: 'aal1', active: true }, 'changes.propose'), false);
});
test('unconfigured deployment displays a locked status and never calls an identity provider', async () => {
  const { calls } = setup(); process.env.RR_ENABLE_MANAGEMENT = 'false';
  const status = await request('status'); assert.equal(status.body.approved_for_management, false);
  const login = await request('login', { email: 'staff@example.invalid', password: 'test-only-password' });
  assert.equal(login.statusCode, 503); assert.equal(calls.length, 0);
});
test('login issues only host-bound HttpOnly Secure cookies and no session secrets in JSON', async () => {
  const { calls, token } = setup();
  const response = await request('login', { email: 'staff@example.invalid', password: 'test-only-password' }, { cookie: false });
  assert.equal(response.statusCode, 200); assert.equal(response.headers['set-cookie'].length, 3);
  for (const cookie of response.headers['set-cookie']) { assert.match(cookie, /^__Host-rr_/); assert.match(cookie, /Path=\/; HttpOnly; Secure; SameSite=Strict/); }
  assert.ok(!JSON.stringify(response.body).includes(token));
  assert.ok(calls.some(call => call.path.endsWith('rr_mgmt_login')));
});
test('successful PostgREST void RPCs with empty HTTP 204 bodies are supported', async () => {
  setup({ override: call => ['rr_mgmt_login', 'rr_mgmt_audit'].some(name => call.path.endsWith(name)) ? new Response(null, { status: 204 }) : undefined });
  const response = await request('login', { email: 'staff@example.invalid', password: 'test-only-password' }, { cookie: false });
  assert.equal(response.statusCode, 200);
  assert.equal((await request('session')).statusCode, 200);
});
test('cross-origin, forged role, unsupported tenant and wrong HTTP method requests are rejected', async () => {
  setup();
  assert.equal((await request('login', { email: 'staff@example.invalid', password: 'x' }, { headers: { origin: 'https://attacker.invalid' } })).statusCode, 403);
  assert.equal((await request('login', { email: 'staff@example.invalid', password: 'x', role: 'CORPORATE_OWNER' })).statusCode, 422);
  assert.equal((await request('propose', { tenant: 'attacker' })).statusCode, 422);
  assert.equal((await request('approve', undefined, { method: 'GET' })).statusCode, 405);
  assert.equal((await request('session', undefined, { cookie: false })).statusCode, 401);
});
test('provider rejection and mismatched verified claims cannot be used as staff authentication', async () => {
  setup({ override: call => call.path.endsWith('/user') ? Response.json({ error: 'raw private provider failure' }, { status: 401 }) : undefined });
  const denied = await request('members'); assert.equal(denied.statusCode, 401);
  assert.ok(!JSON.stringify(denied.body).includes('raw private'));
  setup(); assert.equal((await request('members', undefined, { token: jwt('aal2', { sub: sid }) })).statusCode, 401);
  assert.equal((await request('members', undefined, { token: jwt('aal2', { exp: 1 }) })).statusCode, 401);
});
test('MFA-pending sessions reveal only their own enrollment state and deny staff records', async () => {
  const { token, calls } = setup({ aal: 'aal1' });
  const session = await request('session', undefined, { token });
  assert.equal(session.body.management, null); assert.equal(session.body.aal, 'aal1');
  const denied = await request('members', undefined, { token }); assert.equal(denied.statusCode, 403);
  assert.ok(calls.some(call => call.path.endsWith('rr_mgmt_audit') && call.body.p_reason === 'mfa_required'));
});
test('rental manager receives assigned policy, cannot administer privileges and generates denial audit', async () => {
  const { calls } = setup({ role: 'RENTAL_MANAGER' });
  const session = await request('session'); assert.equal(session.body.management.role, 'RENTAL_MANAGER');
  assert.equal((await request('members')).statusCode, 403);
  assert.equal((await request('approve', { id: sid })).statusCode, 403);
  assert.ok(!calls.some(call => call.path.endsWith('rr_mgmt_approve')));
  assert.ok(calls.some(call => call.body.p_action === 'management.access.denied'));
});
test('MFA challenge is bound to an owned factor and accepts only a provider-validated AAL2 upgrade', async () => {
  let upgraded = false;
  const { token } = setup({ aal: 'aal1', override: call => {
    if (call.path.endsWith('/verify') && call.path.includes('/factors/')) { upgraded = true; return Response.json({ access_token: jwt(), refresh_token: 'new-refresh-token', expires_in: 3600 }); }
  } });
  assert.equal((await request('mfa-verify', { factor_id: sid, code: '123456' }, { token })).statusCode, 403);
  const result = await request('mfa-verify', { factor_id: fid, code: '123456' }, { token });
  assert.equal(result.statusCode, 200); assert.equal(upgraded, true); assert.equal(result.body.mfa_verified, true);
  assert.ok(!JSON.stringify(result.body).includes('new-refresh-token'));
});
test('refresh checks local revocation before contacting the provider and preserves cookie secrecy', async () => {
  const { calls } = setup();
  const result = await request('refresh', {}); assert.equal(result.statusCode, 200);
  assert.ok(calls.findIndex(call => call.path.endsWith('rr_mgmt_refresh_allowed')) < calls.findIndex(call => call.path.endsWith('/token')));
  setup({ override: call => call.path.endsWith('rr_mgmt_refresh_allowed') ? Response.json({ message: 'session_denied' }, { status: 400 }) : undefined });
  assert.equal((await request('refresh', {})).statusCode, 401);
});
test('invitation delivery contains no passwords or tokens and does not claim acceptance', async () => {
  const { calls } = setup();
  const response = await request('send-invitation', { id: sid });
  assert.equal(response.statusCode, 200); assert.equal(response.body.accepted, false);
  const sent = calls.find(call => call.path.endsWith('/invite'));
  assert.deepEqual(sent.body, { email: 'manager@example.invalid' });
  assert.equal(sent.headers.apikey, 'test-service-key');
  assert.ok(calls.some(call => call.body.p_operation === 'sent'));
});
test('logout revokes local sessions even when the identity provider is unavailable', async () => {
  const { calls } = setup({ override: call => call.path.endsWith('/logout') ? Response.json({}, { status: 503 }) : undefined });
  const response = await request('logout', { all: true });
  assert.equal(response.body.signed_out, true);
  assert.ok(calls.some(call => call.path.endsWith('rr_mgmt_logout') && call.body.p_all));
  assert.ok(response.headers['set-cookie'].every(cookie => cookie.includes('Max-Age=0')));
});
test('audit outages block privileged responses and shared rate limiting blocks provider requests', async () => {
  setup({ override: call => call.path.endsWith('rr_mgmt_audit') ? Response.json({}, { status: 503 }) : undefined });
  assert.equal((await request('members')).statusCode, 503);
  const { calls } = setup({ override: call => call.path.endsWith('rr_mgmt_rate') ? Response.json(false) : undefined });
  assert.equal((await request('login', { email: 'staff@example.invalid', password: 'test-only-password' })).statusCode, 429);
  assert.ok(!calls.some(call => call.path.endsWith('/token')));
});
