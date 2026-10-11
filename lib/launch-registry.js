// R-Rent release gate and platform integration registry, revision 1.0.
// Public observability only: it cannot authorize a financial, rental, or signer action.
// Any provider configured flag is a prerequisite, not successful vendor verification.
export const LAUNCH_MODULES=Object.freeze([
 {id:"website",name:"Public website and fleet",phase:"public",risk:"low",route:"/",api:"/api/v1/vehicles",requirements:[]},
 {id:"quote",name:"Nonbinding rental quote",phase:"public",risk:"low",route:"/book",api:"/api/v1/quote",requirements:[]},
 {id:"guides",name:"Signing and return guides",phase:"public",risk:"low",route:"/resources",api:null,requirements:[]},
 {id:"support",name:"Andreaa public policy assistant",phase:"public",risk:"low",route:"/support/chat",api:"/api/v1/support/chat",requirements:[]},
 {id:"rbac",name:"Identity, MFA and 13-role authorization",phase:"restricted",risk:"critical",route:"/operations",api:"/api/v1/operations",requirements:["RR_ENABLE_RBAC","RR_ENABLE_OAUTH"],evidence:["dedicated_active_database","tenant_rls_independently_tested","staff_mfa_tested","server_role_scope_tested"]},
 {id:"application",name:"Renter applications and availability",phase:"restricted",risk:"high",route:"/book",api:"/api/v1/applications",requirements:["RR_ENABLE_APPLICATIONS","RR_ENABLE_OAUTH"],evidence:["fleet_rights_verified","anti_double_booking_transaction_tested","owner_scoped_records_verified"]},
 {id:"vault",name:"Private documents and encrypted vault",phase:"restricted",risk:"critical",route:"/requirements",api:"/api/v1/documents",requirements:["RR_ENABLE_PRIVATE_VAULT","RR_ENABLE_SECURE_UPLOADS","RR_ENABLE_MALWARE_SCAN"],evidence:["encryption_key_vault_approved","private_bucket_verified","malware_quarantine_verified","retention_and_legal_hold_approved"]},
 {id:"insurance",name:"Commercial insurance and driver eligibility",phase:"restricted",risk:"critical",route:"/requirements",api:null,requirements:["RR_INSURANCE_PROGRAM_APPROVED"],evidence:["fleet_policy_issued_and_active","allowed_vehicle_use_verified","driver_validation_vendor_approved"]},
 {id:"esign",name:"Native in-house e-sign and immutable copies",phase:"restricted",risk:"critical",route:"/signing",api:"/api/v1/envelopes",requirements:["RR_ENABLE_INHOUSE_ESIGN","RR_ENABLE_SIGNING","RR_ENABLE_INHOUSE_PDF_FINALIZER","RR_ENABLE_INHOUSE_AUDIT_STORE"],evidence:["signed_template_legally_approved","verified_signer_auth_and_consent","private_final_pdf_renderer_tested","immutable_certificate_and_delivery_tested"]},
 {id:"stripe",name:"Stripe hosted payment settlement",phase:"restricted",risk:"critical",route:"/fees",api:"/api/v1/payments/stripe",requirements:["RR_ENABLE_PAYMENTS"],evidence:["approved_live_merchant","pci_hosted_checkout_verified","signed_webhook_and_reconciliation_tested","final_invoice_tax_reviewed"]},
 {id:"paypal",name:"PayPal hosted payment settlement",phase:"restricted",risk:"critical",route:"/fees",api:"/api/v1/payments/paypal",requirements:["RR_ENABLE_PAYMENTS"],evidence:["approved_live_merchant","webhook_signature_and_replay_tested","payment_ledger_tested"]},
 {id:"refunds",name:"Receipts, disputed charges and approved refunds",phase:"restricted",risk:"high",route:"/disputes",api:"/api/v1/support-cases",requirements:["RR_ENABLE_CASES","RR_ENABLE_ENCRYPTED_CASE_STORAGE"],evidence:["cash_bank_reconciliation_verified","independent_refund_approver","chargeback_dispute_controls_tested"]},
 {id:"dispatch",name:"Vehicle release and return inspections",phase:"restricted",risk:"critical",route:"/requirements",api:"/api/v1/admin/release",requirements:["RR_ENABLE_RELEASE"],evidence:["verified_coverage_and_driver","actual_signed_agreement","final_invoice_and_payment_verified","pickup_inspection_and_operator_approval"]},
 {id:"audit",name:"Audit logs, legal holds and data disposal",phase:"restricted",risk:"critical",route:"/operations",api:null,requirements:["RR_ENABLE_RBAC"],evidence:["append_only_audit_storage_tested","security_incident_owner_assigned","records_retention_counsel_approved","verified_delete_receipts"]},
 {id:"cloudflare",name:"Cloudflare Zero Trust edge and Wrangler",phase:"restricted",risk:"high",route:"/operations",api:null,requirements:[],evidence:["correct_account_bound","all_traffic_access_aud_approved","staging_worker_authenticated_and_tested","worker_no_public_route_verified"]},
 {id:"governance",name:"Corporate policy and release approvals",phase:"restricted",risk:"high",route:"/operations",api:null,requirements:[],evidence:["corporate_policy_formally_adopted","independent_review_and_release_approval","insurance_and_texas_counsel_approval"]},
 {id:"cicd",name:"Protected GitHub PR and verified deploy pipeline",phase:"restricted",risk:"high",route:"/operations",api:null,requirements:[],evidence:["github_runner_online_and_checks_pass","pr_independent_approval","vercel_production_release_verified"]}
]);
export const LAUNCH_POLICY=Object.freeze({
 version:"1.0.0",
 platform:"R-Rent / Ross Tax Pro Software Company",
 noSimulation:true,
 noAutoEnable:true,
 sensitiveProductionActions:"DENY_UNTIL_INDEPENDENTLY_VERIFIED",
 policyBoundary:"CONFIGURED_IS_NOT_VERIFIED",
 publicRecordAccess:false
});
const CHECKED=new Set(LAUNCH_MODULES.map(x=>x.id));
if(CHECKED.size!==LAUNCH_MODULES.length)throw new Error("duplicate_launch_module");
export function evaluateLaunch(options={}){
 const flags=options.flags||{};
 const evidence=options.evidence||{};
 const trusted=options.trustedEvidence===true;
 const statuses=LAUNCH_MODULES.map(mod=>{
   const missingFlags=(mod.requirements||[]).filter(key=>flags[key]!==true);
   const missingEvidence=(mod.evidence||[]).filter(key=>{
     const e=evidence[key];
     return !trusted||e?.verified!==true||typeof e.evidence_id!=="string"||!e.evidence_id||!e.verified_at;
   });
   const configured=missingFlags.length===0;
   // Application logic alone never certifies live external accounts or approved legal obligations.
   const status=mod.phase==="public"?"SOURCE_IMPLEMENTED_RUNTIME_UNVERIFIED":
      (missingFlags.length?"LOCKED_CONFIGURATION_MISSING":missingEvidence.length?"LOCKED_EVIDENCE_MISSING":"REQUIRES_INDEPENDENT_RELEASE_APPROVAL");
   return {id:mod.id,name:mod.name,phase:mod.phase,risk:mod.risk,route:mod.route,api:mod.api,
     status,configured,verified:false,actions_enabled:false,
     missing_configuration:missingFlags,missing_evidence:missingEvidence};
 });
 return {
  ...LAUNCH_POLICY,
  generated_at:typeof options.generatedAt==="string"?options.generatedAt:null,
  release_status:"NOT_CERTIFIED_FOR_FULL_TRANSACTIONS",
  public_code_modules:statuses.filter(s=>s.phase==="public").length,
  restricted_locked:statuses.filter(s=>s.phase==="restricted").length,
  modules:statuses,
  declaration:"Feature flags, code deployment or credentials do not prove vendor, legal, insurance, payment or e-sign authorization. No customer transaction is authorized by this report."
 };
}
export function validateManifest(){
 if(LAUNCH_MODULES.some(m=>!m.id||!m.name||!m.route||!["public","restricted"].includes(m.phase)))return false;
 return LAUNCH_MODULES.every(m=>m.phase==="public"||Array.isArray(m.evidence)&&m.evidence.length>0);
}
