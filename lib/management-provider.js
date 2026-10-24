import { createHash, randomBytes } from 'node:crypto';
import { TENANT } from './identity.js';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function rejected(code, status = 403) { return Object.assign(new Error(code), { code, status }); }
export function managementConfigured() {
  return process.env.RR_ENABLE_MANAGEMENT === 'true' && process.env.RR_ENABLE_RBAC === 'true' &&
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export async function provider(path, { method = 'GET', body, token, admin = false } = {}) {
  const base = new URL(process.env.SUPABASE_URL);
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash) throw rejected('provider_configuration', 503);
  const key = admin ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
  let response;
  try {
    response = await fetch(new URL('/auth/v1/' + path, base), {
      method, redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw rejected('identity_provider_unavailable', 503); }
  if (!response.ok) throw Object.assign(rejected(response.status === 429 ? 'rate_limited' : 'identity_request_denied', response.status === 429 ? 429 : 401), { providerStatus: response.status });
  const payload = await response.text();
  try { return payload ? JSON.parse(payload) : {}; } catch { throw rejected('identity_provider_unavailable', 503); }
}
export async function rpc(name, args = {}) {
  if (!/^rr_mgmt_[a-z_]+$/.test(name)) throw rejected('rpc_denied');
  let response;
  try {
    response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...args, p_tenant: TENANT }),
    });
  } catch { throw rejected('management_database_unavailable', 503); }
  if (!response.ok) {
    const fault = await response.json().catch(() => ({}));
    // Only explicitly enumerated, non-sensitive database errors reach the user.
    const codes = ['session_denied', 'mfa_required', 'permission_denied', 'second_approver_required',
      'self_change_denied', 'change_conflict', 'invitation_unavailable', 'last_owner_protected', 'release_not_approved', 'rate_limited'];
    const code = codes.includes(fault.message) ? fault.message : 'management_database_unavailable';
    throw rejected(code, code === 'rate_limited' ? 429 : code === 'change_conflict' ? 409 : code === 'session_denied' ? 401 : code === 'management_database_unavailable' || code === 'release_not_approved' ? 503 : 403);
  }
  const payload = await response.text();
  try { return payload ? JSON.parse(payload) : null; } catch { throw rejected('management_database_unavailable', 503); }
}
export function cookies(req) {
  const values = {};
  for (const entry of String(req.headers.cookie || '').split(';')) {
    const split = entry.indexOf('=');
    if (split < 0) continue;
    const key = entry.slice(0, split).trim(), value = entry.slice(split + 1).trim();
    if (Object.hasOwn(values, key)) throw rejected('ambiguous_cookie', 401);
    values[key] = value;
  }
  return values;
}
const names = { access: '__Host-rr_access', refresh: '__Host-rr_refresh', session: '__Host-rr_session' };
export function setSessionCookies(res, session, secret) {
  if (!session.access_token || !session.refresh_token || !/^[A-Za-z0-9._~-]+$/.test(session.access_token) || !/^[A-Za-z0-9._~-]+$/.test(session.refresh_token)) throw rejected('invalid_provider_session', 503);
  res.setHeader('Set-Cookie', [
    [names.access, session.access_token, Math.min(3600, session.expires_in || 3600)],
    [names.refresh, session.refresh_token, 28800], [names.session, secret, 28800],
  ].map(([key, value, age]) => `${key}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`));
}
export function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', Object.values(names).map(key => `${key}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`));
}
export async function verifiedIdentity(token) {
  if (!token || token.length > 10000) throw rejected('session_denied', 401);
  // Claims are read ONLY after the issuing Auth service validates this exact token.
  const user = await provider('user', { token });
  let claims;
  try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); }
  catch { throw rejected('session_denied', 401); }
  const expectedIssuer = process.env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1';
  if (!user.id || !user.email_confirmed_at || user.is_anonymous || claims.sub !== user.id ||
      claims.iss !== expectedIssuer || claims.aud !== 'authenticated' || claims.exp <= Date.now() / 1000 ||
      !/^[a-f0-9-]{36}$/i.test(claims.session_id || '')) throw rejected('session_denied', 401);
  return { id: user.id, email: user.email, aal: claims.aal, providerSession: claims.session_id, factors: user.factors || [] };
}
export async function createManagementSession(res, session) {
  const actor = await verifiedIdentity(session.access_token);
  const secret = randomBytes(32).toString('base64url');
  await rpc('rr_mgmt_login', { p_actor: actor.id, p_provider_session: actor.providerSession, p_secret: sha256(secret) });
  setSessionCookies(res, session, secret);
  return actor;
}
export async function sessionActor(req) {
  const jar = cookies(req), token = jar[names.access], secret = jar[names.session];
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) throw rejected('session_denied', 401);
  const actor = await verifiedIdentity(token);
  const context = await rpc('rr_mgmt_context', {
    p_actor: actor.id, p_provider_session: actor.providerSession, p_secret: sha256(secret),
  });
  return { ...actor, ...context, token, secret, args: { p_actor: actor.id,
    p_provider_session: actor.providerSession, p_secret: sha256(secret), p_aal: actor.aal } };
}
export async function refreshSession(req, res) {
  const jar = cookies(req), secret = jar[names.session];
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret) || !jar[names.refresh]) throw rejected('session_denied', 401);
  // Check local revocation/timeout before using the provider refresh token.
  await rpc('rr_mgmt_refresh_allowed', { p_secret: sha256(secret) });
  const refreshed = await provider('token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: jar[names.refresh] } });
  const actor = await verifiedIdentity(refreshed.access_token);
  await rpc('rr_mgmt_context', { p_actor: actor.id, p_provider_session: actor.providerSession, p_secret: sha256(secret) });
  setSessionCookies(res, refreshed, secret);
  return actor;
}
