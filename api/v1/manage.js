import { reply } from '../../lib/http.js';
import { managementAllowed, managementDescriptor, ASSIGNABLE_ROLES } from '../../lib/management-policy.js';
import { managementConfigured, provider, rpc, rejected, sha256, cookies,
  verifiedIdentity, sessionActor, createManagementSession, refreshSession,
  setSessionCookies, clearSessionCookies } from '../../lib/management-provider.js';

const READS = new Set(['status', 'session', 'members', 'changes', 'audit']);
const WRITES = new Set(['login', 'confirm', 'request-code', 'verify-code', 'refresh', 'logout',
  'mfa-enroll', 'mfa-verify', 'accept-invitation', 'propose', 'approve', 'send-invitation',
  'revoke-invitation', 'suspend', 'password']);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const uuid = value => { if (typeof value !== 'string' || !UUID.test(value)) throw rejected('invalid_identifier', 422); return value; };
function fields(body, keys) {
  if (Object.keys(body).some(key => !keys.includes(key))) throw rejected('unsupported_fields', 422);
}
function email(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw rejected('invalid_email', 422);
  return value.trim().toLowerCase();
}
async function readBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw rejected('json_required', 415);
  let body = req.body;
  if (body === undefined) {
    const chunks = []; let total = 0;
    for await (const part of req) { total += Buffer.byteLength(part); if (total > 12000) throw rejected('body_too_large', 413); chunks.push(part); }
    body = Buffer.concat(chunks.map(part => Buffer.from(part))).toString();
  }
  if (typeof body === 'string') { if (Buffer.byteLength(body) > 12000) throw rejected('body_too_large', 413); try { body = JSON.parse(body); } catch { throw rejected('invalid_json', 400); } }
  if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 12000) throw rejected('invalid_json', 400);
  return body;
}
function checkOrigin(req) {
  const expected = process.env.RR_ALLOWED_ORIGIN || 'https://rtpscrentalcars.com';
  if (!expected.startsWith('https://') || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) throw rejected('cross_origin_forbidden');
  if (req.method !== 'GET' && (req.headers.origin !== expected || req.headers['x-rrent-action'] !== '1')) throw rejected('cross_origin_forbidden');
}
async function throttle(req, action, identity = '') {
  const ip = req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unavailable';
  for (const bucket of [action + ':ip:' + String(ip).slice(0, 100), action + ':subject:' + identity]) {
    if (!await rpc('rr_mgmt_rate', { p_bucket: sha256(bucket) })) throw rejected('rate_limited', 429);
  }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  let actor, action;
  try {
    action = new URL(req.url, 'https://rtpscrentalcars.com').searchParams.get('action') || 'status';
    if (!READS.has(action) && !WRITES.has(action)) return reply(res, 404, { error: 'unknown_management_action' });
    const expectedMethod = READS.has(action) ? 'GET' : 'POST';
    if (req.method !== expectedMethod) { res.setHeader('Allow', expectedMethod); return reply(res, 405, { error: 'method_not_allowed' }); }
    checkOrigin(req);
    if (action === 'status') {
      const configured = managementConfigured();
      const approved = configured ? await rpc('rr_mgmt_ready') : false;
      return reply(res, 200, { configured, approved_for_management: approved === true,
        production_access_verified: false, mfa_required: true, consequential_actions_enabled: false,
        state: approved ? 'PROVIDER_AND_USER_ACCEPTANCE_TESTS_REQUIRED' : 'MANAGEMENT_LOCKED' });
    }
    if (!managementConfigured() || !await rpc('rr_mgmt_ready')) throw rejected('management_not_configured', 503);
    const body = expectedMethod === 'POST' ? await readBody(req) : {};
    if (['login', 'confirm', 'request-code', 'verify-code'].includes(action)) {
      let session;
      if (action === 'login') {
        fields(body, ['email', 'password']);
        const address = email(body.email);
        if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 256) throw rejected('invalid_credentials', 422);
        await throttle(req, 'login', address);
        session = await provider('token?grant_type=password', { method: 'POST', body: { email: address, password: body.password } });
      } else if (action === 'request-code') {
        fields(body, ['email']); const address = email(body.email);
        await throttle(req, 'request_code', address);
        // Account existence and allowlist status are never disclosed here.
        try { await provider('otp', { method: 'POST', body: { email: address, create_user: false } }); }
        catch (problem) { if (problem.status === 429 || problem.status === 503) throw problem; }
        await rpc('rr_mgmt_audit', { p_actor: null, p_action: 'management.code.requested', p_reason: 'generic_response' });
        return reply(res, 202, { message: 'If an eligible account exists, check its email for the one-time sign-in code.' });
      } else if (action === 'verify-code') {
        fields(body, ['email', 'code']); const address = email(body.email);
        if (!/^\d{6,10}$/.test(body.code || '')) throw rejected('invalid_code', 422);
        await throttle(req, 'verify_code', address);
        session = await provider('verify', { method: 'POST', body: { email: address, token: body.code, type: 'email' } });
      } else {
        fields(body, ['token_hash', 'type']);
        if (!/^[a-zA-Z0-9_-]{20,200}$/.test(body.token_hash || '') || !['invite', 'email'].includes(body.type)) throw rejected('invalid_confirmation', 422);
        await throttle(req, 'confirm');
        session = await provider('verify', { method: 'POST', body: { token_hash: body.token_hash, type: body.type } });
      }
      actor = await createManagementSession(res, session);
      return reply(res, 200, { authenticated: true, mfa_required: true });
    }
    if (action === 'refresh') {
      fields(body, []); await throttle(req, 'refresh'); await refreshSession(req, res);
      return reply(res, 200, { refreshed: true });
    }
    if (action === 'logout') {
      fields(body, ['all']);
      const jar = cookies(req), secret = jar['__Host-rr_session'];
      if (secret && /^[A-Za-z0-9_-]{43}$/.test(secret)) {
        await rpc('rr_mgmt_logout', { p_secret: sha256(secret), p_all: body.all === true });
        // Local revocation is authoritative even when the provider is unavailable.
        if (jar['__Host-rr_access']) await provider('logout?scope=' + (body.all ? 'global' : 'local'), { method: 'POST', token: jar['__Host-rr_access'] }).catch(() => {});
      }
      clearSessionCookies(res);
      return reply(res, 200, { signed_out: true, scope: 'R-Rent management sessions' });
    }
    actor = await sessionActor(req);
    const audit = (event, reason) => rpc('rr_mgmt_audit', { p_actor: actor.id, p_action: 'management.' + event, p_reason: reason });
    if (action === 'session') {
      await audit('session.inspected', actor.aal === 'aal2' ? 'mfa_verified' : 'mfa_pending');
      return reply(res, 200, { authenticated: true, user: { id: actor.id, email: actor.email },
        aal: actor.aal, pending_invitation: actor.pending_invitation,
        factors: actor.factors.map(f => ({ id: f.id, type: f.factor_type, status: f.status })),
        management: managementDescriptor(actor), assignable_roles: managementAllowed(actor, 'changes.propose') ? ASSIGNABLE_ROLES : [],
        production_access_verified: false });
    }
    if (action === 'mfa-enroll') {
      fields(body, []); await throttle(req, 'mfa', actor.id);
      if (actor.factors.some(f => f.status === 'verified') && actor.aal !== 'aal2') throw rejected('existing_mfa_required');
      const factor = await provider('factors', { method: 'POST', token: actor.token,
        body: { factor_type: 'totp', friendly_name: 'R-Rent management', issuer: 'R-Rent' } });
      await audit('mfa.enrolled', 'totp_verification_pending');
      // Enrollment secret is delivered once to its authenticated user; never stored or logged by R-Rent.
      return reply(res, 200, { id: factor.id, secret: factor.totp.secret });
    }
    if (action === 'mfa-verify') {
      fields(body, ['factor_id', 'code']); const factor = uuid(body.factor_id);
      if (!/^\d{6}$/.test(body.code || '')) throw rejected('invalid_code', 422);
      await throttle(req, 'mfa', actor.id);
      if (!actor.factors.some(f => f.id === factor && f.factor_type === 'totp')) throw rejected('factor_not_owned');
      const challenge = await provider(`factors/${factor}/challenge`, { method: 'POST', token: actor.token, body: {} });
      const upgraded = await provider(`factors/${factor}/verify`, { method: 'POST', token: actor.token, body: { challenge_id: challenge.id, code: body.code } });
      const verified = await verifiedIdentity(upgraded.access_token);
      if (verified.id !== actor.id || verified.providerSession !== actor.providerSession || verified.aal !== 'aal2') throw rejected('invalid_mfa_session');
      await audit('mfa.verified', 'provider_aal2_verified');
      setSessionCookies(res, upgraded, actor.secret);
      return reply(res, 200, { mfa_verified: true });
    }
    if (actor.aal !== 'aal2') throw rejected('mfa_required');
    if (action === 'accept-invitation') {
      fields(body, []);
      const role = await rpc('rr_mgmt_accept', actor.args);
      return reply(res, 200, { accepted: true, role });
    }
    if (action === 'password') {
      fields(body, ['password']);
      if (!actor.active || typeof body.password !== 'string' || body.password.length < 14 || body.password.length > 128) throw rejected('password_requirements', 422);
      await throttle(req, 'password', actor.id);
      await audit('password.requested', 'authenticated_aal2');
      await provider('user', { method: 'PUT', token: actor.token, body: { password: body.password } });
      await rpc('rr_mgmt_logout', { p_secret: sha256(actor.secret), p_all: true });
      clearSessionCookies(res);
      return reply(res, 200, { password_updated: true, signed_out: true });
    }
    const permissionAction = ({ members: 'members.read', changes: 'changes.read', audit: 'audit.read',
      propose: 'changes.propose', approve: 'changes.approve', 'send-invitation': 'invitations.send',
      'revoke-invitation': 'invitations.revoke', suspend: 'members.suspend' })[action];
    if (!managementAllowed(actor, permissionAction)) throw rejected('permission_denied');
    await audit('access.granted', permissionAction);
    if (['members', 'changes', 'audit'].includes(action)) {
      const items = await rpc('rr_mgmt_list', { ...actor.args, p_kind: action });
      return reply(res, 200, { items, limit: 100 });
    }
    if (action === 'propose') {
      fields(body, ['kind', 'target_user_id', 'email', 'role', 'reason', 'expected_version']);
      if (!['INVITE', 'ROLE', 'REACTIVATE'].includes(body.kind) || !ASSIGNABLE_ROLES.includes(body.role) ||
          typeof body.reason !== 'string' || body.reason.trim().length < 8 || body.reason.length > 500 ||
          (body.kind !== 'INVITE' && (!Number.isSafeInteger(body.expected_version) || body.expected_version < 1))) throw rejected('invalid_change', 422);
      const id = await rpc('rr_mgmt_propose', { ...actor.args, p_kind: body.kind,
        p_target: body.kind === 'INVITE' ? null : uuid(body.target_user_id), p_email: body.kind === 'INVITE' ? email(body.email) : null,
        p_role: body.role, p_reason: body.reason.trim(), p_version: body.kind === 'INVITE' ? null : body.expected_version });
      return reply(res, 201, { id, state: 'PROPOSED', independent_approval_required: true });
    }
    if (action === 'approve') {
      fields(body, ['id']); await rpc('rr_mgmt_approve', { ...actor.args, p_change: uuid(body.id) });
      return reply(res, 200, { approved: true });
    }
    if (['send-invitation', 'revoke-invitation'].includes(action)) {
      fields(body, ['id']); const id = uuid(body.id);
      const invitation = await rpc('rr_mgmt_invitation', { ...actor.args, p_invitation: id, p_operation: action === 'send-invitation' ? 'claim' : 'revoke' });
      if (action === 'send-invitation') {
        // Provider sends the secret directly to the verified mailbox. No link or token is returned to the caller.
        try { await provider('invite', { method: 'POST', admin: true, body: { email: invitation.email } }); }
        catch (problem) {
          if (problem.providerStatus !== 422) throw problem;
          // Existing confirmed users use the existing-user email OTP flow.
          await provider('otp', { method: 'POST', body: { email: invitation.email, create_user: false } });
        }
        await rpc('rr_mgmt_invitation', { ...actor.args, p_invitation: id, p_operation: 'sent' });
      }
      return reply(res, 200, { state: action === 'send-invitation' ? 'SENT_BY_IDENTITY_PROVIDER' : 'REVOKED', accepted: false });
    }
    if (action === 'suspend') {
      fields(body, ['user_id', 'expected_version']);
      if (!Number.isSafeInteger(body.expected_version) || body.expected_version < 1) throw rejected('invalid_version', 422);
      await rpc('rr_mgmt_suspend', { ...actor.args, p_target: uuid(body.user_id), p_version: body.expected_version });
      return reply(res, 200, { suspended: true, management_sessions_revoked: true });
    }
    throw rejected('permission_denied');
  } catch (problem) {
    let status = problem.status || 503;
    // Denial audit must persist in a separate transaction after a rolled-back RPC.
    if (managementConfigured()) {
      try { await rpc('rr_mgmt_audit', { p_actor: actor?.id || null, p_action: 'management.access.denied',
        p_reason: /^[a-z_]{1,60}$/.test(problem.code || '') ? problem.code : 'service_unavailable' }); }
      catch { status = 503; }
    }
    if (status === 401 && action === 'refresh') clearSessionCookies(res);
    const code = /^[a-z_]{1,60}$/.test(problem.code || '') ? problem.code : 'management_unavailable';
    return reply(res, status, { error: code, message: 'Management access could not be completed. No rental action was authorized.' });
  }
}
