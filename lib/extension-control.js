// R-Rent governed extension rules. Pure, deterministic, no payment calls or invented evidence.
export const TRAILBLAZER_EXTENSION=Object.freeze({
 vehicle_id:'trailblazer-2026',description:'Chevrolet Trailblazer - proposed seven-day extension',
 days:7,daily_rental_cents:5900,daily_insurance_cents:950,extension_fee_cents:5000,
 refundable_deposit_cents:5000,replacement_fob_cents:100000,tax_basis_points:1000
});
export const EXTENSION_STATES=Object.freeze([
 'REQUESTED','REVIEW_REQUIRED','ACCEPTANCE_PENDING','INVOICE_DRAFT','INVOICE_OPEN',
 'PAYMENT_PENDING','PAYMENT_CONFIRMED','ACTIVATION_PENDING','ACTIVE',
 'RETURN_DUE','RETURN_REVIEW','CLOSED','DECLINED','CANCELLED'
]);
const rules=Object.freeze({
 REQUESTED:['REVIEW_REQUIRED','CANCELLED'],
 REVIEW_REQUIRED:['ACCEPTANCE_PENDING','DECLINED','CANCELLED'],
 ACCEPTANCE_PENDING:['INVOICE_DRAFT','DECLINED','CANCELLED'],
 INVOICE_DRAFT:['INVOICE_OPEN','CANCELLED'],
 INVOICE_OPEN:['PAYMENT_PENDING','PAYMENT_CONFIRMED','CANCELLED'],
 PAYMENT_PENDING:['PAYMENT_CONFIRMED','CANCELLED'],
 PAYMENT_CONFIRMED:['ACTIVATION_PENDING'],
 ACTIVATION_PENDING:['ACTIVE','DECLINED'],
 ACTIVE:['RETURN_DUE'],RETURN_DUE:['RETURN_REVIEW'],RETURN_REVIEW:['CLOSED'],
 CLOSED:[],DECLINED:[],CANCELLED:[]
});
export const EVIDENCE_GATES=Object.freeze({
 create_invoice:['company_approval','renter_acceptance','agreement_signature','coverage_verified','tax_review','recipient_verified'],
 payment_confirmed:['signed_stripe_event','invoice_match','amount_match','currency_match','payment_reconciled'],
 activate:['driver_verified','coverage_verified','agreement_signature','company_approval','fleet_availability','payment_confirmed','inspection_verified','key_access_authorized'],
 close:['return_inspection','fee_reconciliation','deposit_disposition','receipt_delivered']
});
export const TASK_TRIGGERS=Object.freeze({
 'extension.requested':['staff.review_rental','fleet.check_overlap','billing.calculate_terms'],
 'extension.reviewed':['compliance.verify_coverage','contracts.prepare_addendum'],
 'extension.accepted':['billing.create_invoice_draft','compliance.archive_acceptance'],
 'invoice.open':['notifications.deliver_invoice','billing.track_due_date'],
 'invoice.payment_failed':['billing.retry_review','support.contact_renter'],
 'invoice.paid':['billing.reconcile_signed_webhook','billing.issue_payment_receipt','fleet.request_extension_activation'],
 'extension.activated':['fleet.update_return_due','notifications.send_confirmation','fleet.review_key_access'],
 'extension.return_due':['fleet.schedule_return_inspection','support.send_return_reminder'],
 'extension.returned':['fleet.inspect','billing.reconcile_incidentals','billing.review_deposit'],
 'deposit.disposed':['billing.issue_deposit_receipt','records.close_extension'],
 'key.loss_reported':['fleet.open_key_incident','staff.evaluate_documented_replacement_cost']
});
const cents=n=>Number.isSafeInteger(n)&&n>=0;
export function quoteExtension(options={}){
 const p=TRAILBLAZER_EXTENSION;
 const days=options.days===undefined?p.days:options.days;
 const contractedDays=options.contract_total_days;
 if(!Number.isSafeInteger(days)||days<1||days>180)throw Error('invalid_extension_days');
 // Contract duration may determine 10% vs 6.25%; do not silently change rates.
 const taxBps=Number.isSafeInteger(contractedDays)&&contractedDays>30?625:1000;
 const rent=days*p.daily_rental_cents, insurance=days*p.daily_insurance_cents;
 const taxable=rent+p.extension_fee_cents;
 const tax=Math.round(taxable*taxBps/10000);
 const due=rent+insurance+p.extension_fee_cents+tax+p.refundable_deposit_cents;
 return Object.freeze({
  currency:'USD',vehicle_id:p.vehicle_id,days,
  rental_cents:rent,insurance_cents:insurance,extension_fee_cents:p.extension_fee_cents,
  state_rental_tax_cents:tax,taxable_receipts_cents:taxable,
  refundable_deposit_cents:p.refundable_deposit_cents,
  total_due_cents:due,revenue_before_tax_cents:rent+insurance+p.extension_fee_cents,
  replacement_fob_contingent_cents:p.replacement_fob_cents,
  replacement_fob_included:false,
  tax_rate_label:taxBps===1000?'10%':'6.25%',
  tax_status:!Number.isSafeInteger(contractedDays)?'PROVISIONAL_CONTRACT_TERM_UNVERIFIED':'PROVISIONAL_LOCAL_TAX_REVIEW',
  insurance_status:'UNBOUND_PENDING_CARRIER_REVIEW',
  charge_status:'ESTIMATE_ONLY_NO_PAYMENT'
 });
}
export function missingEvidence(gate,evidence={}){
 if(!Object.hasOwn(EVIDENCE_GATES,gate))throw Error('unknown_gate');
 return EVIDENCE_GATES[gate].filter(key=>{
  const item=evidence[key];
  return item?.verified!==true||typeof item?.evidence_id!=='string'||item.evidence_id.length<8;
 });
}
export function transitionExtension(current,next,context={}){
 if(!rules[current]?.includes(next))return {ok:false,error:'transition_denied'};
 const gate=next==='INVOICE_OPEN'?'create_invoice':next==='PAYMENT_CONFIRMED'?'payment_confirmed':next==='ACTIVE'?'activate':next==='CLOSED'?'close':null;
 const missing=gate?missingEvidence(gate,context.evidence):[];
 if(missing.length)return {ok:false,error:'evidence_missing',missing};
 if(['INVOICE_OPEN','ACTIVE','CLOSED'].includes(next)&&context.actor?.mfa_verified!==true)return {ok:false,error:'mfa_staff_required'};
 if(next==='ACTIVE'&&context.actor?.human_approval!==true)return {ok:false,error:'human_release_required'};
 return {ok:true,from:current,to:next,gate,append_only_audit:true};
}
export function validateStripePayment(event,expected,verifiedSignature=false){
 if(verifiedSignature!==true)return {ok:false,error:'unsigned_provider_event'};
 if(!event||!expected||!['invoice.paid','invoice.payment_succeeded'].includes(event.type))return {ok:false,error:'unsupported_event'};
 const invoice=event.data?.object;
 if(typeof event.id!=='string'||!event.id.startsWith('evt_')||!invoice||typeof invoice.id!=='string')return {ok:false,error:'invalid_provider_evidence'};
 if(invoice.id!==expected.invoice_id||invoice.customer!==expected.customer_id||
    invoice.currency!=='usd'||invoice.amount_paid!==expected.total_due_cents||
    invoice.status!=='paid')return {ok:false,error:'payment_invoice_mismatch'};
 return {ok:true,event_id:event.id,invoice_id:invoice.id,requires_durable_idempotent_ledger:true,
  next_tasks:TASK_TRIGGERS['invoice.paid']};
}
export function taskPlan(trigger,rentalId){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(rentalId||''))throw Error('invalid_rental_reference');
 const types=TASK_TRIGGERS[trigger];if(!types)throw Error('unknown_trigger');
 return types.map((type,index)=>({type,queue:'restricted-rental-operations',
  dedupe_key:`${rentalId}:${trigger}:${index}`,requires_audit:true,
  state:'PLANNED_NOT_QUEUED'}));
}
export function keyFobAssessment(input={}){
 if(input.reported!==true)return {charge_allowed:false,amount_cents:0,reason:'no_verified_loss'};
 const items=['signed_fee_disclosure','incident_evidence','cost_documentation','authorized_review'];
 const missing=items.filter(k=>input[k]?.verified!==true||!input[k]?.evidence_id);
 return {charge_allowed:missing.length===0,maximum_proposed_cents:TRAILBLAZER_EXTENSION.replacement_fob_cents,
   amount_cents:0,missing,reason:missing.length?'requires_review':'manual_itemized_charge_review_required'};
}
