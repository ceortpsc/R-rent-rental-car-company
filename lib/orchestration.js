// R-Rent process orchestration contracts: no timers, scraping, external dispatch or autonomous legal approval.
import {hasPermission,authorizeAction} from "./rbac.js";
export const TASK_TYPES=Object.freeze([
 "intake.validate","quote.finalize","identity.provider_verify","insurance.carrier_verify","risk.payment_screen",
 "contracts.require_counsel_approval","contracts.prepare_packet","contracts.issue_signed_invitation",
 "signing.record_verified_provider_event","signing.generate_signed_pdf","signing.generate_certificate",
 "signing.deliver_renter_copy","signing.deliver_company_copy","billing.reconcile_signed_webhook",
 "fleet.confirm_availability","fleet.complete_pretrip_inspection","fleet.human_release_review",
 "support.open_case","support.assign_review","security.triage_incident","security.rotate_key",
 "records.identify_retention","records.verify_legal_hold","records.approve_disposal","records.purge_and_certify"
]);
export const STATES=Object.freeze(["DRAFT","SUBMITTED","AWAITING_IDENTITY","AWAITING_INSURANCE","AWAITING_CONTRACT","AWAITING_PAYMENT","AWAITING_HUMAN_APPROVAL","AUTHORIZED_FOR_RELEASE","ACTIVE","RETURNED","CLOSED","DECLINED","EXPIRED","VOID"]);
export const TRANSITIONS=Object.freeze({
 DRAFT:["SUBMITTED","VOID"],SUBMITTED:["AWAITING_IDENTITY","DECLINED"],
 AWAITING_IDENTITY:["AWAITING_INSURANCE","DECLINED"],
 AWAITING_INSURANCE:["AWAITING_CONTRACT","DECLINED"],
 AWAITING_CONTRACT:["AWAITING_PAYMENT","DECLINED"],
 AWAITING_PAYMENT:["AWAITING_HUMAN_APPROVAL","DECLINED"],
 AWAITING_HUMAN_APPROVAL:["AUTHORIZED_FOR_RELEASE","DECLINED"],
 AUTHORIZED_FOR_RELEASE:["ACTIVE","VOID"],ACTIVE:["RETURNED"],RETURNED:["CLOSED"],
 CLOSED:[],DECLINED:[],EXPIRED:[],VOID:[]
});
export function transition(current,next,context={}){
 if(!TRANSITIONS[current]?.includes(next))return {ok:false,error:"transition_not_allowed"};
 const highRisk=["AUTHORIZED_FOR_RELEASE","ACTIVE"];
 if(highRisk.includes(next)){
  const required=["driver_verified","coverage_verified","contract_completed","payment_captured_verified","final_invoice_reconciled","human_release_approved","inspection_verified","inventory_exclusive"];
  const missing=required.filter(k=>context.evidence?.[k]?.verified!==true||!context.evidence?.[k]?.evidence_id);
  if(missing.length)return {ok:false,error:"missing_verified_evidence",missing};
  const a=authorizeAction(context.actor,"rental.release",{human_review_verified:true,provider_evidence_verified:true});
  if(!a.allowed)return {ok:false,error:a.reason};
 }
 return {ok:true,from:current,to:next,requiresAudit:true};
}
const JOB_PERMISSIONS=Object.freeze({
 "contracts.issue_signed_invitation":"contracts.issue",
 "signing.record_verified_provider_event":"contracts.issue",
 "billing.reconcile_signed_webhook":"payments.read",
 "fleet.human_release_review":"dispatch.review",
 "security.rotate_key":"security.incident_manage",
 "records.approve_disposal":"retention.review",
 "records.purge_and_certify":"retention.review"
});
export function dispatchPlan(job,ctx={}){
 if(!TASK_TYPES.includes(job?.type))return {accepted:false,error:"unknown_job"};
 if(!job.idempotency_key||!/^[-a-zA-Z0-9_]{10,100}$/.test(job.idempotency_key))return {accepted:false,error:"idempotency_key_required"};
 if(!ctx.trustedWorker||!ctx.actor?.verified||!ctx.actor?.tenant_verified||!ctx.tenant||ctx.tenant!==job.tenant)return {accepted:false,error:"trusted_tenant_context_required"};
 const perm=JOB_PERMISSIONS[job.type];
 if(perm&&!hasPermission(ctx.actor.role,perm))return {accepted:false,error:"role_denied"};
 if(/verify|signed_pdf|certificate|deliver_|reconcile|release|purge|rotate/.test(job.type)){
  if(ctx.providerEvidenceVerified!==true)return {accepted:false,error:"provider_evidence_required"};
 }
 return {accepted:true,task:job.type,queue:"private-restricted-operations",persistBeforeEnqueue:true,maxAttempts:3,backoff:"exponential_jitter",deadLetterQueue:"private-dead-letter",auditRequired:true};
}
export const TASK_RULES=Object.freeze({
 "idempotency":"Unique tenant and operation key; duplicates return prior operation result without repeating financial or legal actions.",
 "authorization":"Every worker revalidates tenant, role, owner/assignee, evidence and MFA; browser state does not grant permissions.",
 "approval":"Counsel/insurer approval, final invoice, signer and operator decisions are explicit human/provider evidence, never AI inference.",
 "privacy":"Queue payload contains IDs and non-sensitive references, never raw license, signature, insurance documents or PAN.",
 "integrity":"Signed webhooks, scoped immutable documents, integrity digests, verified send receipts and append-only event logs.",
 "resilience":"Lease locks, retry classification, dead-letter monitoring, clock-safe expiry and outbox after DB commit.",
 "disposal":"Legal-hold and category retention verification, dual approval, purge evidence and immutable disposal certificate."
});
