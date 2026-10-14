import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAILBLAZER_EXTENSION,quoteExtension,missingEvidence,transitionExtension,
 validateStripePayment,taskPlan,keyFobAssessment} from '../lib/extension-control.js';
test('seven days: correct integer-cent pricing and separate deposit',()=>{
 const q=quoteExtension();
 assert.equal(q.days,7);
 assert.equal(q.rental_cents,41300);
 assert.equal(q.insurance_cents,6650);
 assert.equal(q.extension_fee_cents,5000);
 assert.equal(q.state_rental_tax_cents,4630);
 assert.equal(q.refundable_deposit_cents,5000);
 assert.equal(q.total_due_cents,62580);
 assert.equal(q.replacement_fob_included,false);
 assert.equal(q.replacement_fob_contingent_cents,100000);
 assert.equal(q.charge_status,'ESTIMATE_ONLY_NO_PAYMENT');
});
test('insurance excluded from rental tax base, term needs review',()=>{
 const q=quoteExtension({contract_total_days:31});
 assert.equal(q.tax_rate_label,'6.25%');
 assert.equal(q.state_rental_tax_cents,2894);
 assert.equal(q.taxable_receipts_cents,46300);
 assert.match(quoteExtension().tax_status,/PROVISIONAL/);
 assert.throws(()=>quoteExtension({days:0}),/invalid_extension_days/);
});
test('gate denial and signer evidence cannot be replaced by checkboxes',()=>{
 assert.ok(missingEvidence('create_invoice',{}).includes('renter_acceptance'));
 assert.deepEqual(transitionExtension('REQUESTED','ACTIVE'),{ok:false,error:'transition_denied'});
 const gate=transitionExtension('INVOICE_DRAFT','INVOICE_OPEN',{actor:{mfa_verified:true},evidence:{renter_acceptance:{verified:true}}});
 assert.equal(gate.error,'evidence_missing');
 assert.ok(gate.missing.includes('agreement_signature'));
});
test('signed Stripe paid webhook must reconcile amount and customer',()=>{
 const expected={invoice_id:'in_confirmed',customer_id:'cus_confirmed',total_due_cents:62580};
 const event={id:'evt_confirmed',type:'invoice.paid',data:{object:{id:'in_confirmed',customer:'cus_confirmed',currency:'usd',amount_paid:62580,status:'paid'}}};
 assert.equal(validateStripePayment(event,expected,false).error,'unsigned_provider_event');
 assert.equal(validateStripePayment(event,expected,true).ok,true);
 event.data.object.amount_paid=57580;
 assert.equal(validateStripePayment(event,expected,true).error,'payment_invoice_mismatch');
});
test('task IDs deterministic and all tasks remain unqueued plans',()=>{
 const ts=taskPlan('invoice.paid','RRENT-DRAFT-20261007-TFJ');
 assert.equal(ts.length,3);assert.notEqual(ts[0].dedupe_key,ts[1].dedupe_key);
 assert.ok(ts.every(t=>t.state==='PLANNED_NOT_QUEUED'));
});
test('replacement fob charge requires distinct documented review',()=>{
 assert.equal(keyFobAssessment().charge_allowed,false);
 assert.equal(keyFobAssessment({reported:true}).amount_cents,0);
 assert.equal(TRAILBLAZER_EXTENSION.replacement_fob_cents,100000);
});
