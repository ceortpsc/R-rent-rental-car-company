// RTPSC R-Rent authoritative permission catalog v1.0; deny by default.
// NEVER accept role/tenant claims from a browser query or request header. Server verifies JWT + staff membership.
export const ROLE_DEFINITIONS=Object.freeze({
 RENTER:{label:"Renter",scope:"own",permissions:["fleet.read","quotes.create","applications.own","documents.own","agreements.own","support.own"]},
 ADDITIONAL_DRIVER:{label:"Additional Driver",scope:"assigned",permissions:["fleet.read","documents.own","agreements.own"]},
 CORPORATE_OWNER:{label:"Corporate Owner",scope:"tenant",permissions:["fleet.read","quotes.create","applications.read","applications.review","fleet.manage","drivers.review","insurance.review","contracts.draft","contracts.review","contracts.issue","payments.read","payments.disputes","payments.refund_review","support.read","support.manage","reports.read","audit.read","config.read","config.propose","rbac.read","rbac.propose","security.read","security.incident_manage","retention.review","dispatch.review"]},
 DIVISION_ADMIN:{label:"Division Administrator",scope:"tenant",permissions:["fleet.read","quotes.create","applications.read","applications.review","fleet.manage","drivers.review","insurance.review","contracts.draft","contracts.review","contracts.issue","payments.read","payments.disputes","support.read","support.manage","reports.read","audit.read","config.read","config.propose","rbac.read","dispatch.review"]},
 RENTAL_MANAGER:{label:"Rental Operations Manager",scope:"tenant",permissions:["fleet.read","applications.read","applications.review","fleet.manage","contracts.draft","contracts.review","payments.read","support.read","support.manage","reports.read","dispatch.review"]},
 FLEET_MANAGER:{label:"Fleet Manager",scope:"tenant",permissions:["fleet.read","fleet.manage","applications.read","reports.read","dispatch.review"]},
 FLEET_AGENT:{label:"Fleet Agent",scope:"assigned",permissions:["fleet.read","applications.read","fleet.checkin","fleet.checkout","documents.read_assigned","dispatch.review"]},
 VERIFICATION_ANALYST:{label:"Verification Analyst",scope:"assigned",permissions:["applications.read","drivers.review","insurance.review","documents.read_restricted","audit.read_assigned"]},
 COMPLIANCE_OFFICER:{label:"Compliance Officer",scope:"tenant",permissions:["applications.read","insurance.review","contracts.draft","contracts.review","contracts.issue","payments.read","audit.read","security.read","retention.review","reports.read"]},
 BILLING_SPECIALIST:{label:"Billing Specialist",scope:"tenant",permissions:["payments.read","payments.disputes","payments.refund_review","applications.read_minimal","reports.read_financial","audit.read_financial"]},
 CUSTOMER_SUPPORT:{label:"Customer Support",scope:"assigned",permissions:["support.read","support.manage","applications.read_minimal","documents.read_safe"]},
 AUDITOR:{label:"Auditor",scope:"tenant",permissions:["audit.read","reports.read","config.read","security.read","retention.review"]},
 SECURITY_ADMIN:{label:"Security Administrator",scope:"tenant",permissions:["security.read","security.incident_manage","audit.read","config.read","config.propose","rbac.read","rbac.propose","retention.review"]}
});
export const ROLE_NAMES=Object.freeze(Object.keys(ROLE_DEFINITIONS));
export const ROLE_SCREENS=Object.freeze({
 RENTER:["account","own-rentals","own-documents","own-support"],
 ADDITIONAL_DRIVER:["assigned-documents"],
 CORPORATE_OWNER:["executive","applications","fleet","verification","agreements","billing","support","audit","configuration","security","retention"],
 DIVISION_ADMIN:["operations","applications","fleet","verification","agreements","billing","support","audit","configuration"],
 RENTAL_MANAGER:["operations","applications","fleet","agreements","support"],
 FLEET_MANAGER:["fleet","vehicle-inspections","fleet-reports"],
 FLEET_AGENT:["vehicle-inspections","dispatch-review"],
 VERIFICATION_ANALYST:["verification","driver-review","coverage-review"],
 COMPLIANCE_OFFICER:["compliance","agreements","audit","retention"],
 BILLING_SPECIALIST:["billing","charge-disputes","refund-review"],
 CUSTOMER_SUPPORT:["support","cases"],
 AUDITOR:["audit","reports","compliance"],
 SECURITY_ADMIN:["security","incidents","configuration","access-review","retention"]
});
export const ACTION_POLICIES=Object.freeze({
 "rental.release":{permission:"dispatch.review",requiresMfa:true,requiresHuman:true,requiresVerifiedEvidence:true},
 "contract.issue":{permission:"contracts.issue",requiresMfa:true,requiresHuman:true,requiresVerifiedEvidence:true},
 "payment.refund":{permission:"payments.refund_review",requiresMfa:true,requiresHuman:true,requiresVerifiedEvidence:true},
 "access.assign":{permission:"rbac.propose",requiresMfa:true,requiresDualApproval:true},
 "config.publish":{permission:"config.propose",requiresMfa:true,requiresDualApproval:true},
 "records.dispose":{permission:"retention.review",requiresMfa:true,requiresDualApproval:true,requiresLegalHoldCheck:true}
});
export const SENSITIVITY=Object.freeze(["PUBLIC","INTERNAL","CONFIDENTIAL","RESTRICTED","PAYMENT_TOKEN"]);
export function hasPermission(role,permission){return Boolean(ROLE_DEFINITIONS[role]?.permissions?.includes(permission));}
export function routeViewAllowed(role,screen){return Boolean(ROLE_SCREENS[role]?.includes(screen));}
export function authorizeAction(actor,action,context={}){
 const p=ACTION_POLICIES[action];
 if(!p)return {allowed:false,reason:"unrecognized_action"};
 if(!actor||actor.verified!==true||actor.tenant_verified!==true||!hasPermission(actor.role,p.permission))return {allowed:false,reason:"role_or_identity_denied"};
 if(p.requiresMfa&&actor.aal!=="aal2")return {allowed:false,reason:"mfa_required"};
 if(p.requiresHuman&&context.human_review_verified!==true)return {allowed:false,reason:"human_review_required"};
 if(p.requiresVerifiedEvidence&&context.provider_evidence_verified!==true)return {allowed:false,reason:"verified_evidence_required"};
 if(p.requiresDualApproval&&context.second_approver_verified!==true)return {allowed:false,reason:"second_approver_required"};
 if(p.requiresLegalHoldCheck&&context.legal_hold_cleared!==true)return {allowed:false,reason:"legal_hold_clearance_required"};
 return {allowed:true,reason:null};
}
export function publicCatalog(){return ROLE_NAMES.map(role=>({role,label:ROLE_DEFINITIONS[role].label,screens:ROLE_SCREENS[role],scope:ROLE_DEFINITIONS[role].scope}));}
