import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseSigningSubmission,signingReadiness,eventProof,hashPayload,SIGNING_STATES} from '../lib/inhouse-signing.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uuid='831d30ad-6cb5-4e22-951d-53a7f29cab9b';
const docHash='a'.repeat(64),disclosureHash='b'.repeat(64);
const sample=()=>({
 envelope_id:uuid,document_sha256:docHash,idempotency_key:uuid,
 signer_display_name:'Example Signer',intent:'SIGN_THIS_DOCUMENT',
 reviewed_document_codes:['RR-001','RR-002','RR-003','RR-004','RR-005','RR-006','RR-007','RR-008','RR-009','RR-010'],
 initials:Object.fromEntries(Array.from({length:8},(_,i)=>['RR-00'+(i+1),'ES'])),
 waiver_election:'DECLINE',
 consent:{accepted:true,paper_alternative_acknowledged:true,withdrawal_notice_acknowledged:true,
 disclosure_revision:'RR-ESIGN-1',disclosure_sha256:disclosureHash},
 signature:{mode:'DRAW',strokes:[[[.10,.20],[.40,.50],[.70,.80]]]}
});
test('valid first-party sign request normalizes all ten acknowledgments and strokes',()=>{
 const result=parseSigningSubmission(sample());
 assert.equal(result.intent,'SIGN_THIS_DOCUMENT');assert.equal(result.reviewed_document_codes.length,10);
 assert.equal(result.initials['RR-001'],'ES');assert.equal(result.signature.strokes.length,1);
 assert.equal(result.consent.accepted,true);assert.equal(result.waiver_election,'DECLINE');
 assert.ok(SIGNING_STATES.includes('SIGNED_PENDING_ARTIFACT'));
});
test('typed signature must match signer identity string and explicit intent',()=>{
 const data=sample();
 data.signature={mode:'TYPE',typed_name:'Example Signer'};
 assert.equal(parseSigningSubmission(data).signature.mode,'TYPE');
 data.signature.typed_name='Different Person';
 assert.throws(()=>parseSigningSubmission(data),/typed_signature_must_match/);
 data.signature.typed_name='Example Signer';data.intent='CLICKED';
 assert.throws(()=>parseSigningSubmission(data),/explicit_signing_intent_required/);
});
test('no silent consent, opt-in or waiver acceptance',()=>{
 const data=sample();
 delete data.consent;assert.throws(()=>parseSigningSubmission(data),/consent/);
 data.consent=sample().consent;data.consent.paper_alternative_acknowledged=false;
 assert.throws(()=>parseSigningSubmission(data),/consent/);
 data.consent=sample().consent;data.waiver_election=undefined;
 assert.throws(()=>parseSigningSubmission(data),/separate_waiver_election_required/);
 data.waiver_election='ACCEPT';data.reviewed_document_codes=data.reviewed_document_codes.slice(0,9);
 assert.throws(()=>parseSigningSubmission(data),/all_documents_must_be_reviewed/);
});
test('reject malicious/oversize stroke payloads, missing initials and invalid ids',()=>{
 const d=sample();d.signature.strokes=[[[2,0],[.1,.1],[.2,.2]]];
 assert.throws(()=>parseSigningSubmission(d),/signature_strokes_invalid/);
 d.signature=sample().signature;delete d.initials['RR-001'];
 assert.throws(()=>parseSigningSubmission(d),/all_required_initials_missing/);
 d.initials=sample().initials;d.envelope_id='not-an-id';
 assert.throws(()=>parseSigningSubmission(d),/invalid_envelope_revision_or_idempotency/);
 d.envelope_id=uuid;d.signature={mode:'DRAW',strokes:Array.from({length:81},()=>[[.1,.2],[.2,.3],[.3,.4]])};
 assert.throws(()=>parseSigningSubmission(d),/signature_strokes_invalid/);
});
test('HMAC changes if authenticated event or signer changes; no fake digest',()=>{
 const secret=Buffer.alloc(32,37).toString('base64');
 const e={tenant:'rr-tenant',envelope_id:uuid,user_id:uuid,document_sha256:docHash,
 consent_hash:hashPayload({consent:true}),signature_hash:hashPayload({ink:12}),
 server_recorded_at:'2026-10-10T20:00:00Z',idempotency_key:uuid};
 const a=eventProof(e,secret),b=eventProof({...e,user_id:'changed'},secret);
 assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);
 assert.throws(()=>eventProof(e,'1234'),/missing_event_proof_secret/);
});
test('production signing remains default-deny without vault and identity environment',()=>{
 const result=signingReadiness();assert.equal(result.external_provider_required,false);
 assert.equal(result.engine,'R-RENT_FIRST_PARTY');
 if(!process.env.RR_ENABLE_INHOUSE_ESIGN)assert.equal(result.ready,false);
 assert.ok(result.missing.includes('RR_ENABLE_INHOUSE_ESIGN')||result.ready);
});
test('signature pad, authenticated session and exact-document actions wired but disabled without auth',()=>{
 const ui=read('inhouse-signing-ui.js'),markup=read('signing.html'),api=read('api/v1/envelopes.js'),sql=read('supabase/migrations/20261010_005_inhouse_esign.sql');
 assert.ok(markup.includes('inhouse-signature-canvas'));
 assert.ok(markup.includes('inhouse-sign-submit')&&markup.includes('disabled'));
 assert.ok(ui.includes('window.RRentAuth'));
 assert.ok(ui.includes('/api/v1/envelopes?action=inhouse-session'));
 assert.ok(ui.includes('/api/v1/envelopes?action=inhouse-sign'));
 assert.match(api,/signingReadiness\(\)/);
 assert.match(api,/getInhouseSession\(req\)/);
 assert.match(sql,/signature evidence is append-only/i);
 assert.match(sql,/for update/i);
 assert.match(sql,/revoke all on public.inhouse_envelopes/);
 assert.match(sql,/NOT APPLIED/i);
});
