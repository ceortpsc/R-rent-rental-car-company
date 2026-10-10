import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,FLEET} from '../lib/pricing.js';
import {stripeSignatureValid} from '../lib/providers.js';
import {createHmac} from 'node:crypto';
test('catalog has both vehicles without falsely live bookable status',()=>{
 assert.equal(FLEET.length,2);
 assert.equal(FLEET.every(v=>v.bookable===false),true);
});
test('7 x 59 plus 10% Texas state reference is 454.30',()=>{
 const q=calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00:00-05:00',return_at:'2026-10-14T10:00:00-05:00'});
 assert.equal(q.days,7);assert.equal(q.base_rental_cents,41300);
 assert.equal(q.provisional_state_tax_cents,4130);assert.equal(q.provisional_subtotal_cents,45430);
});
test('6 nights with same clock 07-13 is six 24-hour periods',()=>{
 const q=calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00:00-05:00',return_at:'2026-10-13T10:00:00-05:00'});
 assert.equal(q.days,6);assert.equal(q.provisional_subtotal_cents,38940);
});
test('partial extra day rounds up',()=>{
 const q=calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00:00Z',return_at:'2026-10-08T11:00:00Z'});
 assert.equal(q.days,2);
});
test('31-day illustrative Texas rate 6.25%',()=>{
 const q=calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-01T00:00:00Z',return_at:'2026-11-01T00:00:00Z'});
 assert.equal(q.days,31);assert.equal(q.provisional_state_tax_cents,11431);
});
test('returns must be later',()=>assert.throws(()=>calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00:00Z',return_at:'2026-10-06T10:00:00Z'}),/invalid_rental_period/));
test('timezone offsets mandatory',()=>assert.throws(()=>calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00',return_at:'2026-10-08T10:00'}),/timezone_required/));
test('Bronco Sport Big Bend is $89.99 per day with provisional $9 state tax',()=>{const q=calculate({vehicle_id:'bronco-sport-big-bend-2026',pickup_at:'2026-10-07T10:00:00Z',return_at:'2026-10-08T10:00:00Z'});assert.equal(q.base_rental_cents,8999);assert.equal(q.provisional_state_tax_cents,900);assert.equal(q.provisional_subtotal_cents,9899);assert.equal(q.payment_due,false);});
test('optional proposed $9 daily protection does not create active insurance',()=>{const q=calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00:00Z',return_at:'2026-10-09T10:00:00Z',insurance_selected:true});assert.equal(q.base_rental_cents,11800);assert.equal(q.optional_insurance_estimate_cents,1800);assert.equal(q.provisional_state_tax_cents,1180);assert.equal(q.provisional_subtotal_cents,14780);assert.equal(q.coverage_bound,false);assert.equal(q.insurance_status,'NOT_VERIFIED_NOT_BOUND');});
test('malformed optional selection cannot silently be interpreted',()=>assert.throws(()=>calculate({vehicle_id:'trailblazer-2026',pickup_at:'2026-10-07T10:00:00Z',return_at:'2026-10-09T10:00:00Z',insurance_selected:'yes'}),/invalid_insurance_selection/));
test('Stripe HMAC timing and payload checks',()=>{
 const now=Math.floor(Date.now()/1000),raw=Buffer.from('{"type":"test"}'),secret='whsec_testonly';
 const sig=createHmac('sha256',secret).update(now+'.').update(raw).digest('hex');
 assert.equal(stripeSignatureValid(raw,'t='+now+',v1='+sig,secret),true);
 assert.equal(stripeSignatureValid(Buffer.from('{}'),'t='+now+',v1='+sig,secret),false);
 assert.equal(stripeSignatureValid(raw,'t='+(now-601)+',v1='+sig,secret),false);
});
