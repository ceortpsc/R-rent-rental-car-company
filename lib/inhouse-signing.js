// R-Rent first-party signing engine. No third-party e-sign vendor required.
// A signature can only be recorded by the authenticated API after all legal,
// business, identity, revision, secure storage, and certificate gates pass.
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {dbReady,dbQuery,userFromRequest,TENANT} from './identity.js';
import {encryptionReady,encryptRestricted} from './crypto-vault.js';
import {enabled} from './http.js';

const HEX64=/^[a-f0-9]{64}$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_FLAGS=Object.freeze([
 'RR_ENABLE_INHOUSE_ESIGN','RR_ENABLE_RBAC','RR_ENABLE_OAUTH','RR_ENABLE_ENCRYPTED_ENVELOPES',
 'RR_ENABLE_PRIVATE_VAULT','RR_ENABLE_INHOUSE_PDF_FINALIZER','RR_ENABLE_INHOUSE_AUDIT_STORE',
 'RR_CONTRACTS_LEGAL_APPROVED','RR_ENABLE_SIGNING'
]);
const SERVER_SECRETS=Object.freeze([
 'SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY',
 'RR_ENCRYPTION_KEY_B64','RR_ENCRYPTION_KEY_ID','RR_SIGN_EVENT_HMAC_KEY_B64'
]);
export const SIGNING_STATES=Object.freeze([
 'DRAFT','APPROVED','ISSUED','VIEWED','PARTIALLY_SIGNED',
 'SIGNED_PENDING_ARTIFACT','COMPLETED','DECLINED','VOID','EXPIRED'
]);
export function signingReadiness(){
 const missing=[...REQUIRED_FLAGS.filter(x=>!enabled(x)),...SERVER_SECRETS.filter(x=>!process.env[x])];
 if(!dbReady())missing.push('dedicated_auth_database');
 if(!encryptionReady())missing.push('valid_encryption_key');
 // These flags are set only after a deployed internal artifact renderer and
 // independently tested storage/immutable event SQL are verified.
 return {ready:missing.length===0,missing:[...new Set(missing)],engine:'R-RENT_FIRST_PARTY',external_provider_required:false};
}
function invalid(code){const e=new Error(code);e.code=code;return e;}
function str(v,min,max){return typeof v==='string'&&v.length>=min&&v.length<=max?v:null;}
function safePoint(p){
 return Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1);
}
function acceptedRecord(body){
 const c=body?.consent;
 if(!c||c.accepted!==true||c.paper_alternative_acknowledged!==true||c.withdrawal_notice_acknowledged!==true||
  !str(c.disclosure_revision,2,64)||!HEX64.test(c.disclosure_sha256||''))throw invalid('valid_electronic_records_consent_required');
 return {accepted:true,paper_alternative_acknowledged:true,withdrawal_notice_acknowledged:true,disclosure_revision:c.disclosure_revision,disclosure_sha256:c.disclosure_sha256.toLowerCase()};
}
export function parseSigningSubmission(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>95000)throw invalid('invalid_signing_payload');
 if(!UUID.test(body.envelope_id||'')||!HEX64.test(body.document_sha256||'')||!UUID.test(body.idempotency_key||''))throw invalid('invalid_envelope_revision_or_idempotency');
 if(!str(body.signer_display_name,2,120)||body.signer_display_name.trim().length<2)throw invalid('signer_name_required');
 if(body.intent!=='SIGN_THIS_DOCUMENT')throw invalid('explicit_signing_intent_required');
 const consent=acceptedRecord(body);
 const election=body.waiver_election;
 if(!['ACCEPT','DECLINE'].includes(election))throw invalid('separate_waiver_election_required');
 const initials=body.initials;
 if(!initials||typeof initials!=='object'||Array.isArray(initials))throw invalid('initials_required');
 for(const code of ['RR-001','RR-002','RR-003','RR-004','RR-005','RR-006','RR-007','RR-008']){
  if(!/^[a-z]{1,8}$/i.test(initials[code]||''))throw invalid('all_required_initials_missing');
 }
 const mode=body.signature?.mode;
 let signature;
 if(mode==='DRAW'){
  const strokes=body.signature?.strokes;
  if(!Array.isArray(strokes)||strokes.length<1||strokes.length>80)throw invalid('signature_strokes_invalid');
  let total=0;
  for(const stroke of strokes){
   if(!Array.isArray(stroke)||stroke.length<1||stroke.length>300||!stroke.every(safePoint))throw invalid('signature_strokes_invalid');
   total+=stroke.length;
  }
  if(total<3||total>4500)throw invalid('signature_strokes_invalid');
  signature={mode:'DRAW',strokes:strokes.map(s=>s.map(p=>p.map(x=>Math.round(x*10000)/10000)))};
 }else if(mode==='TYPE'){
  const typed=str(body.signature?.typed_name,2,120);
  if(!typed||typed.trim().toLocaleLowerCase()!==body.signer_display_name.trim().toLocaleLowerCase())throw invalid('typed_signature_must_match');
  signature={mode:'TYPE',typed_name:typed.trim()};
 }else throw invalid('signature_mode_required');
 const document_ack=body.reviewed_document_codes;
 if(!Array.isArray(document_ack)||document_ack.length!==10||
  new Set(document_ack).size!==10||!['RR-001','RR-002','RR-003','RR-004','RR-005','RR-006','RR-007','RR-008','RR-009','RR-010'].every(c=>document_ack.includes(c)))throw invalid('all_documents_must_be_reviewed');
 return Object.freeze({
  envelope_id:body.envelope_id,document_sha256:body.document_sha256.toLowerCase(),
  idempotency_key:body.idempotency_key,signer_display_name:body.signer_display_name.trim(),
  intent:body.intent,waiver_election:election,
  initials:Object.fromEntries(Object.entries(initials).filter(([k])=>/^RR-00[1-8]$/.test(k)).map(([k,v])=>[k,v.toUpperCase()])),
  reviewed_document_codes:document_ack.slice(),consent,signature
 });
}
export function eventProof(event,secret){
 if(!secret||typeof secret!=='string'||!HEX64.test(event.document_sha256||''))throw invalid('missing_event_proof_secret');
 return createHmac('sha256',Buffer.from(secret,'base64'))
  .update(JSON.stringify({v:1,tenant:event.tenant,envelope_id:event.envelope_id,user_id:event.user_id,
   document_sha256:event.document_sha256,consent_hash:event.consent_hash,
   signature_hash:event.signature_hash,server_recorded_at:event.server_recorded_at,
   idempotency_key:event.idempotency_key})).digest('hex');
}
export function hashPayload(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export async function recordInhouseSignature(req,body){
 const ready=signingReadiness();
 if(!ready.ready)throw invalid('inhouse_signing_not_configured');
 const signing=parseSigningSubmission(body);
 const user=await userFromRequest(req,'RR_ENABLE_INHOUSE_ESIGN');
 if(user.aal!=='aal2')throw invalid('signer_mfa_required');
 // Identity and assigned signer are resolved exclusively server-side.
 const assignees=await dbQuery('inhouse_signers',{
  select:'envelope_id,user_id,tenant,identity_verified,active,status',
  envelope_id:'eq.'+signing.envelope_id,user_id:'eq.'+user.id,tenant:'eq.'+TENANT,active:'eq.true',limit:'1'
 });
 if(assignees.length!==1||assignees[0].identity_verified!==true||!['INVITED','VIEWED'].includes(assignees[0].status))throw invalid('signer_not_authorized_or_unverified');
 const envelopes=await dbQuery('inhouse_envelopes',{
  select:'id,tenant,status,document_sha256,disclosure_sha256,approved_contract,private_pdf_object_key,artifact_finalizer_ready,expires_at',
  id:'eq.'+signing.envelope_id,tenant:'eq.'+TENANT,limit:'1'
 });
 const envelope=envelopes[0];
 if(!envelope||envelope.status!=='ISSUED'||envelope.approved_contract!==true||!envelope.private_pdf_object_key||
  envelope.artifact_finalizer_ready!==true||envelope.document_sha256!==signing.document_sha256||
  envelope.disclosure_sha256!==signing.consent.disclosure_sha256||
  !(new Date(envelope.expires_at)>new Date()))throw invalid('signed_revision_or_envelope_not_available');
 const recordId=randomUUID(),serverTime=new Date().toISOString();
 const signatureHash=hashPayload(signing.signature),consentHash=hashPayload(signing.consent);
 const sensitive={signature:signing.signature,consent:signing.consent,initials:signing.initials,
  signer_display_name:signing.signer_display_name,waiver_election:signing.waiver_election,
  reviewed_document_codes:signing.reviewed_document_codes};
 const encrypted=encryptRestricted(JSON.stringify(sensitive),{tenant:TENANT,recordId,field:'signing_event'});
 const evidence={tenant:TENANT,envelope_id:signing.envelope_id,user_id:user.id,document_sha256:signing.document_sha256,
  consent_hash:consentHash,signature_hash:signatureHash,server_recorded_at:serverTime,idempotency_key:signing.idempotency_key};
 const proof=eventProof(evidence,process.env.RR_SIGN_EVENT_HMAC_KEY_B64);
 // The DB RPC must lock the envelope/signer rows and atomically verify
 // every server-authored precondition, idempotency and immutable ledger insert.
 const out=await dbQuery('rpc/rr_record_inhouse_signature',{},{
  method:'POST',body:{p_envelope_id:signing.envelope_id,p_signer_user_id:user.id,
   p_tenant:TENANT,p_document_sha256:signing.document_sha256,p_consent_sha256:signing.consent.disclosure_sha256,
   p_idempotency_key:signing.idempotency_key,p_event_id:recordId,
   p_event_at:serverTime,p_event_proof:proof,p_signature_sha256:signatureHash,p_consent_hash:consentHash,
   p_encrypted_payload:encrypted}
 });
 if(!Array.isArray(out)||out.length!==1||!out[0].recorded)throw invalid('signature_recording_not_confirmed');
 return {status:'SIGNED_PENDING_ARTIFACT',event_id:recordId,recorded_at:serverTime,
  completed:false,signed_pdf_url:null,company_copy_url:null,certificate_url:null,
  message:'Signature evidence recorded in the first-party ledger. This is NOT completed until a verified signed PDF, certificate and copies are produced.'};
}
