import { ROLE_DEFINITIONS, ROLE_SCREENS, hasPermission } from './rbac.js';

// The published thirteen-role catalog remains authoritative. Management access
// does not delegate rental execution or infer authority from an email address.
export const STAFF_ROLES = Object.freeze(Object.keys(ROLE_DEFINITIONS)
  .filter(role => !['RENTER', 'ADDITIONAL_DRIVER'].includes(role)));
export const ASSIGNABLE_ROLES = Object.freeze(STAFF_ROLES.filter(role => role !== 'CORPORATE_OWNER'));
export const MANAGEMENT_ACTIONS = Object.freeze({
  'members.read': 'rbac.read',
  'changes.read': 'rbac.read',
  'changes.propose': 'rbac.propose',
  'changes.approve': 'rbac.propose',
  'invitations.send': 'rbac.propose',
  'invitations.revoke': 'rbac.propose',
  'members.suspend': 'security.incident_manage',
  'audit.read': 'audit.read',
});
export function managementAllowed(actor, action) {
  return Boolean(actor?.active === true && actor.aal === 'aal2' &&
    STAFF_ROLES.includes(actor.role) && hasPermission(actor.role, MANAGEMENT_ACTIONS[action]));
}
export function managementDescriptor(actor) {
  if (!actor?.active || actor.aal !== 'aal2' || !STAFF_ROLES.includes(actor.role)) return null;
  return { role: actor.role, label: ROLE_DEFINITIONS[actor.role].label,
    permissions: ROLE_DEFINITIONS[actor.role].permissions, screens: ROLE_SCREENS[actor.role],
    actions: Object.keys(MANAGEMENT_ACTIONS).filter(action => managementAllowed(actor, action)),
    vehicle_release: false, binding_signatures: false, financial_transactions: false,
    insurance_verification: false };
}
