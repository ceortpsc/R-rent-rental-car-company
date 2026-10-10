import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLE_DEFINITIONS,ROLE_NAMES,ROLE_SCREENS,publicCatalog,hasPermission,routeViewAllowed,authorizeAction} from '../lib/rbac.js';
import {encryptRestricted,decryptRestricted,encryptionReady,redacted,safeAuditMetadata} from '../lib/crypto-vault.js';
import {TASK_TYPES,TRANSITIONS,transition,dispatchPlan} from '../lib/orchestration.js';
const actor={verified:true,tenant_verified:true,role:'CORPORATE_OWNER',aal:'aal2'};
test('all thirteen roles have explicit bounded views, no superuser wildcard',()=>{
 assert.equal(ROLE_NAMES.length,13);
 for(const name of ROLE_NAMES){assert.ok(ROLE_SCREENS[name]?.length);assert.ok(Array.isArray(ROLE_DEFINITIONS[name].permissions));}
 assert.equal(publicCatalog().length,13);
 assert.equal(hasPermission('RENTER','payments.read'),false);
 assert.equal(routeViewAllowed('RENTER','security'),false);
 assert.equal(hasPermission('OTHER','fleet.read'),false);
 assert.equal(ROLE_DEFINITIONS.CORPORATE_OWNER.permissions.includes('*'),false);
});
test('privileged action requires verified role MFA and business/provider evidence',()=>{
 assert.equal(authorizeAction(null,'rental.release').allowed,false);
 assert.equal(authorizeAction({...actor,aal:'aal1'},'rental.release',{human_review_verified:true,provider_evidence_verified:true}).allowed,false);
 assert.equal(authorizeAction(actor,'rental.release',{human_review_verified:true}).allowed,false);
 assert.equal(authorizeAction(actor,'rental.release',{human_review_verified:true,provider_evidence_verified:true}).allowed,true);
 assert.equal(authorizeAction(actor,'access.assign',{second_approver_verified:false}).allowed,false);
 assert.equal(authorizeAction(actor,'access.assign',{second_approver_verified:true}).allowed,true);
 assert.equal(authorizeAction(actor,'records.dispose',{second_approver_verified:true,legal_hold_cleared:false}).allowed,false);
 assert.equal(authorizeAction(actor,'rental.make_magic').allowed,false);
});
test('AES-256-GCM encrypts with tenant/record/field binding and tamper detection',()=>{
 const key0=process.env.RR_ENCRYPTION_KEY_B64,kid0=process.env.RR_ENCRYPTION_KEY_ID;
 try {
  delete process.env.RR_ENCRYPTION_KEY_B64;delete process.env.RR_ENCRYPTION_KEY_ID;
  assert.equal(encryptionReady(),false);
  assert.throws(()=>encryptRestricted('sensitive',{tenant:'rr-tenant',recordId:'record123',field:'driver_license'}),/key/);
  process.env.RR_ENCRYPTION_KEY_B64=Buffer.alloc(32,7).toString('base64');
  process.env.RR_ENCRYPTION_KEY_ID='v1';
  assert.equal(encryptionReady(),true);
  const context={tenant:'rr-tenant',recordId:'record123',field:'driver_license'};
  const a=encryptRestricted('private secret for test',context),b=encryptRestricted('private secret for test',context);
  assert.notEqual(a.ct+':'+a.iv,b.ct+':'+b.iv);
  assert.equal(decryptRestricted(a,context),'private secret for test');
  assert.throws(()=>decryptRestricted(a,{...context,tenant:'another-tenant'}),/ciphertext_authentication_failed/);
  assert.throws(()=>decryptRestricted({...a,tag:Buffer.alloc(16).toString('base64')},context),/ciphertext_authentication_failed/);
  assert.throws(()=>encryptRestricted('hello',{...context,field:'unsupported_field'}),/encryption_context_invalid/);
 } finally {
  if(key0===undefined)delete process.env.RR_ENCRYPTION_KEY_B64;else process.env.RR_ENCRYPTION_KEY_B64=key0;
  if(kid0===undefined)delete process.env.RR_ENCRYPTION_KEY_ID;else process.env.RR_ENCRYPTION_KEY_ID=kid0;
 }
});
test('audit scrub does not leak confidential values',()=>{
 assert.equal(redacted('123'),'[REDACTED]');
 const meta=safeAuditMetadata({licenseNumber:'SECRET',accessToken:'SECRET',status:'pending',cardNumber:'SECRET',count:2});
 assert.equal(meta.licenseNumber,'[REDACTED]');
 assert.equal(meta.accessToken,'[REDACTED]');
 assert.equal(meta.cardNumber,'[REDACTED]');
 assert.equal(meta.status,'pending');
 assert.equal(meta.count,2);
});
test('release transition is fail closed without verified evidence and role',()=>{
 assert.equal(TRANSITIONS.DRAFT.includes('ACTIVE'),false);
 assert.equal(transition('DRAFT','ACTIVE').ok,false);
 assert.equal(transition('AWAITING_HUMAN_APPROVAL','AUTHORIZED_FOR_RELEASE',{}).ok,false);
 const evidence=Object.fromEntries(['driver_verified','coverage_verified','contract_completed','payment_captured_verified','final_invoice_reconciled','human_release_approved','inspection_verified','inventory_exclusive'].map(k=>[k,{verified:true,evidence_id:'verified123'}]));
 assert.equal(transition('AWAITING_HUMAN_APPROVAL','AUTHORIZED_FOR_RELEASE',{evidence,actor}).ok,true);
 assert.equal(transition('AWAITING_HUMAN_APPROVAL','AUTHORIZED_FOR_RELEASE',{evidence,actor:{...actor,role:'CUSTOMER_SUPPORT'}}).ok,false);
});
test('worker requires real trusted context and idempotency',()=>{
 assert.ok(TASK_TYPES.includes('records.purge_and_certify'));
 const job={type:'identity.provider_verify',idempotency_key:'rr_job_12345',tenant:'rr-tenant'};
 assert.equal(dispatchPlan(job,{}).accepted,false);
 assert.equal(dispatchPlan(job,{trustedWorker:true,tenant:'rr-tenant',actor}).accepted,true);
 assert.equal(dispatchPlan({...job,type:'records.purge_and_certify'},{trustedWorker:true,tenant:'rr-tenant',actor}).accepted,false);
 assert.equal(dispatchPlan({...job,idempotency_key:'bad'},{trustedWorker:true,tenant:'rr-tenant',actor}).accepted,false);
});
