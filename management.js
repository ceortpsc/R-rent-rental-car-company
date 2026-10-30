const $ = id => document.getElementById(id);
let session = null, enrollment = null, available = false;
const notice = value => { $('message').textContent = value; };
async function api(action, body, retry = true) {
  const response = await fetch('/api/v1/manage?action=' + encodeURIComponent(action), {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-RRent-Action': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && retry && !['status', 'login', 'confirm', 'request-code', 'verify-code', 'refresh', 'logout'].includes(action)) {
      await api('refresh', {}, false); return api(action, body, false);
    }
    if (response.status === 401) { session = null; render(); }
    throw new Error((result.error || 'Access unavailable').replaceAll('_', ' '));
  }
  return result;
}
function clearSetup() { enrollment = null; $('totp-secret').textContent = ''; $('enrollment').hidden = true; }
function render() {
  const authenticated = session?.authenticated === true;
  $('sign-in').hidden = !available || authenticated;
  $('signed-in').hidden = !authenticated;
  // Drop private rendered records on logout or reduced privileges.
  for (const id of ['members', 'changes', 'audit']) $(id).replaceChildren();
  if (!authenticated) { clearSetup(); return; }
  $('identity').textContent = session.user.email;
  $('session-state').textContent = session.aal === 'aal2' ? 'Authenticator verified for this session.' : 'Email verified. Authenticator verification required.';
  $('mfa').hidden = session.aal === 'aal2';
  $('enroll').hidden = session.factors.some(f => f.status === 'verified');
  const picker = $('factor'); picker.replaceChildren();
  for (const factor of session.factors.filter(f => f.type === 'totp')) {
    const option = document.createElement('option'); option.value = factor.id; option.textContent = 'Authenticator · ' + factor.status; picker.append(option);
  }
  if (enrollment && ![...picker.options].some(option => option.value === enrollment)) {
    const option = document.createElement('option'); option.value = enrollment; option.textContent = 'New authenticator'; picker.append(option);
  }
  $('verify-mfa').hidden = !picker.options.length;
  $('pending-invitation').hidden = !session.pending_invitation || session.aal !== 'aal2' || !!session.management;
  $('workspace').hidden = !session.management;
  if (!session.management) return;
  const management = session.management, actions = management.actions;
  $('role-name').textContent = management.label;
  $('assigned-screens').textContent = 'Assigned views: ' + management.screens.join(', ');
  $('permissions').replaceChildren();
  for (const permission of management.permissions) { const node = document.createElement('span'); node.className = 'permission'; node.textContent = permission; $('permissions').append(node); }
  for (const [id, action] of [['team-tools', 'members.read'], ['proposal-tools', 'changes.propose'], ['approval-tools', 'changes.read'], ['audit-tools', 'audit.read']]) $(id).hidden = !actions.includes(action);
  $('assign-role').replaceChildren();
  for (const role of session.assignable_roles) { const node = document.createElement('option'); node.value = role; node.textContent = role.replaceAll('_', ' '); $('assign-role').append(node); }
}
async function loadSession() {
  session = await api('session'); render();
  notice(session.management ? 'Management account access verified by the server. Rental actions remain locked.' : 'Complete authenticator verification to continue.');
}
function bindForm(id, action, transform = value => value, after = loadSession) {
  $(id).addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (form.elements.password) form.elements.password.value = '';
    const button = form.querySelector('button'); button.disabled = true;
    try { const result = await api(action, transform(values)); form.reset(); await after(result); }
    catch (error) { notice(error.message); } finally { button.disabled = false; }
  });
}
function bindButton(id, run) {
  $(id).addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await run(); } catch (error) { notice(error.message); } finally { button.disabled = false; }
  });
}
function records(container, items, buttons = () => []) {
  container.replaceChildren();
  if (!items.length) { container.textContent = 'No matching records.'; return; }
  for (const item of items) {
    const article = document.createElement('article'); article.className = 'record';
    for (const [key, value] of Object.entries(item)) { if (value === null) continue; const p = document.createElement('p'); p.textContent = key.replaceAll('_', ' ') + ': ' + value; article.append(p); }
    for (const [label, action] of buttons(item)) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn outline'; button.textContent = label;
      button.addEventListener('click', async () => { button.disabled = true; try { await action(); } catch (error) { notice(error.message); } finally { button.disabled = false; } }); article.append(button);
    }
    container.append(article);
  }
}
bindForm('login', 'login'); bindForm('verify-code', 'verify-code');
bindForm('request-code', 'request-code', value => value, async result => notice(result.message));
bindForm('verify-mfa', 'mfa-verify', value => value, async () => { clearSetup(); await loadSession(); });
bindForm('password', 'password', value => value, async () => { session = null; render(); notice('Password updated. All management sessions were signed out.'); });
bindForm('propose', 'propose', value => value.kind === 'INVITE' ? { kind: value.kind, email: value.email, role: value.role, reason: value.reason } :
  { kind: value.kind, target_user_id: value.target_user_id, expected_version: Number(value.expected_version), role: value.role, reason: value.reason },
async result => notice('Access request ' + result.id + ' awaits an independent approver.'));
bindButton('enroll', async () => { const factor = await api('mfa-enroll', {}); enrollment = factor.id; $('totp-secret').textContent = factor.secret; $('enrollment').hidden = false; render(); notice('Add the setup secret to your authenticator and verify its six-digit code.'); });
bindButton('hide-secret', async () => clearSetup());
bindButton('accept-invitation', async () => { await api('accept-invitation', {}); await loadSession(); });
bindButton('refresh', async () => { await api('refresh', {}); await loadSession(); });
for (const id of ['logout', 'logout-all']) bindButton(id, async () => { await api('logout', { all: id === 'logout-all' }); session = null; render(); notice('Management session signed out.'); });
bindButton('load-members', async () => {
  const data = await api('members');
  records($('members'), data.items, item => session.management.actions.includes('members.suspend') && item.user_id !== session.user.id && item.role !== 'CORPORATE_OWNER' && item.active ?
    [['Suspend account and revoke access', async () => { await api('suspend', { user_id: item.user_id, expected_version: item.version }); notice('Account suspended. Management sessions revoked.'); $('members').replaceChildren(); }]] : []);
});
bindButton('load-changes', async () => {
  const data = await api('changes');
  records($('changes'), data.items, item => {
    const buttons = [], actions = session.management.actions;
    if (item.status === 'PROPOSED' && item.proposed_by !== session.user.id && item.target_user_id !== session.user.id && actions.includes('changes.approve')) buttons.push(['Approve request', async () => { await api('approve', { id: item.id }); notice('Request approved. Refresh the list for its current state.'); $('changes').replaceChildren(); }]);
    if (item.kind === 'INVITE' && ['APPROVED', 'SENDING'].includes(item.delivery_status) && actions.includes('invitations.send')) buttons.push(['Send provider invitation', async () => { await api('send-invitation', { id: item.id }); notice('Identity provider accepted the invitation email. Recipient acceptance is pending.'); $('changes').replaceChildren(); }]);
    if (item.kind === 'INVITE' && ['APPROVED', 'SENDING', 'SENT'].includes(item.delivery_status) && actions.includes('invitations.revoke')) buttons.push(['Revoke invitation', async () => { await api('revoke-invitation', { id: item.id }); notice('Invitation revoked.'); $('changes').replaceChildren(); }]);
    return buttons;
  });
});
bindButton('load-audit', async () => records($('audit'), (await api('audit')).items));
// Confirmation hashes are removed before any network request. No token enters
// localStorage, sessionStorage, analytics, referrers, or application logs.
const fragment = new URLSearchParams(location.hash.slice(1));
const confirmation = fragment.get('token_hash'), type = fragment.get('type');
if (location.hash) history.replaceState(null, '', location.pathname);
try {
  const status = await api('status'); available = status.approved_for_management === true; render();
  if (!available) notice('Management is locked while the dedicated database, identity provider, email delivery, and independent release review are configured.');
  else if (confirmation) { await api('confirm', { token_hash: confirmation, type }); await loadSession(); }
  else { try { await loadSession(); } catch { notice('Sign in with your invited staff email.'); } }
} catch (error) { available = false; render(); notice(error.message); }
document.addEventListener('visibilitychange', () => { if (document.hidden) clearSetup(); });
