import {mountInhousePad} from './inhouse-signature-pad.js';
const $=id=>document.getElementById(id);
const pad=mountInhousePad($('inhouse-signature-canvas'),{
 onChange:has=>{$('inhouse-pad-state').textContent=has?'Drawing present (not transmitted)':'No signature drawn';}
});
let secureSession=null,authenticatedToken=null,readiness=false,inFlight=false;
function setStatus(text){$('inhouse-service-status').textContent=text;}
function deny(reason){
 secureSession=null;authenticatedToken=null;
 $('inhouse-final-pdf').hidden=true;$('inhouse-final-pdf').removeAttribute('href');
 $('inhouse-read-pdf').checked=false;$('inhouse-read-pdf').disabled=true;
 $('inhouse-sign-intent').checked=false;$('inhouse-sign-intent').disabled=true;
 $('inhouse-sign-submit').disabled=true;
 if(reason)setStatus(reason);
}
async function tokenFromAuth(){
 const auth=window.RRentAuth;
 if(!auth||typeof auth.getAccessToken!=='function')return null;
 const token=await auth.getAccessToken();
 return typeof token==='string'&&token.length>30?token:null;
}
async function getJson(url,token){
 const response=await fetch(url,{headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},cache:'no-store',credentials:'omit'});
 const data=await response.json().catch(()=>({}));
 return {ok:response.ok,status:response.status,data};
}
async function check(){
 deny('Checking the R-Rent first-party signing service…');
 try{
  const result=await getJson('/api/v1/envelopes?action=inhouse-readiness');
  if(!result.ok||result.data.configured!==true){
   const n=Array.isArray(result.data.missing_gates)?result.data.missing_gates.length:null;
   return deny('In-house capture not activated. '+(n===null?'Required services are unavailable.':n+' verified configuration dependencies remain unresolved.')+' Local signature practice is available.');
  }
  readiness=true;
  const accessToken=await tokenFromAuth();
  if(!accessToken)return deny('The signing API is configured, but no verified authenticated renter session is connected. No signature will be transmitted.');
  const session=await getJson('/api/v1/envelopes?action=inhouse-session',accessToken);
  if(!session.ok||!Array.isArray(session.data.envelopes)||session.data.envelopes.length!==1)
   return deny('No single approved, current, identity-verified signing envelope is assigned to this account.');
  const envelope=session.data.envelopes[0];
  if(!envelope.signer_verified||!envelope.document_url||!/^https:\/\//.test(envelope.document_url)||
   !/^[a-f0-9]{64}$/i.test(envelope.document_sha256||''))return deny('Authenticated document is not verifiably available.');
  secureSession=envelope;authenticatedToken=accessToken;
  const link=$('inhouse-final-pdf');
  link.href=envelope.document_url;link.hidden=false;
  $('inhouse-read-pdf').disabled=false;
  $('inhouse-sign-intent').disabled=false;
  $('inhouse-sign-submit').disabled=false;
  setStatus('A verified signer session and exact approved PDF are available. Review the linked final PDF before making an electronic-signing choice.');
 }catch{deny('R-Rent authentication or signing services are unavailable. No electronic signature has been submitted.');}
}
const modeSelector=()=>document.querySelector('input[name="inhouse-pad-mode"]:checked')?.value||'DRAW';
function setMode(){
 const draw=modeSelector()==='DRAW';
 $('inhouse-pad-draw').hidden=!draw;
 $('signer-signature').placeholder=draw?'Optional typed review sample (not used for drawn signature)':'Type the same signer name to sign';
}
document.querySelectorAll('input[name="inhouse-pad-mode"]').forEach(node=>node.addEventListener('change',setMode));
$('clear-inhouse-pad').addEventListener('click',()=>{pad.clear();$('inhouse-live-result').textContent='Drawing cleared; no signature transmitted.';});
$('inhouse-check').addEventListener('click',check);
$('inhouse-sign-submit').addEventListener('click',async()=>{
 if(inFlight||!readiness||!secureSession||!authenticatedToken)return;
 if(!$('inhouse-read-pdf').checked||!$('inhouse-sign-intent').checked){
  $('inhouse-live-result').textContent='Read the exact approved PDF and affirm explicit signing intent first.';return;
 }
 const review=window.RRentSigningReview?.snapshot?.();
 if(!review?.ready||review.declined){
  $('inhouse-live-result').textContent='All document review, initials, separate waiver choices and valid consent must be completed.';return;
 }
 const signer=$('signer-name').value.trim();
 if(signer.length<2||signer.length>120){$('inhouse-live-result').textContent='Enter your verified signer display name.';return;}
 const mode=modeSelector();
 if(mode==='DRAW'&&!pad.hasSignature()){
  $('inhouse-live-result').textContent='Draw a complete signature or select typed signing.';return;
 }
 const typedName=$('signer-signature').value.trim();
 if(mode==='TYPE'&&typedName.toLocaleLowerCase()!==signer.toLocaleLowerCase()){
  $('inhouse-live-result').textContent='Typed signature must match the signer display name.';return;
 }
 const body={
  envelope_id:secureSession.envelope_id,
  document_sha256:secureSession.document_sha256,
  idempotency_key:crypto.randomUUID(),
  signer_display_name:signer,intent:'SIGN_THIS_DOCUMENT',
  waiver_election:review.waiver==='accept'?'ACCEPT':review.waiver==='decline'?'DECLINE':null,
  initials:review.initials,reviewed_document_codes:review.reviewed_codes,
  consent:{accepted:true,paper_alternative_acknowledged:true,
   withdrawal_notice_acknowledged:true,disclosure_revision:secureSession.disclosure_revision,
   disclosure_sha256:secureSession.disclosure_sha256},
  signature:mode==='DRAW'?{mode:'DRAW',strokes:pad.getStrokes()}:{mode:'TYPE',typed_name:typedName}
 };
 // No retry or background transmission; the server handles uniqueness and durable evidence.
 inFlight=true;$('inhouse-sign-submit').disabled=true;
 $('inhouse-live-result').textContent='Submitting to R-Rent secure signing endpoint…';
 try{
  const response=await fetch('/api/v1/envelopes?action=inhouse-sign',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+authenticatedToken},
   cache:'no-store',credentials:'omit',body:JSON.stringify(body)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
   $('inhouse-live-result').textContent='Signing not recorded ('+response.status+'). No completed signed document exists.';
   return;
  }
  $('inhouse-live-result').textContent='Server evidence recorded ('+(result.status||'pending')+'). Do not interpret this as complete until the signed PDF, audit certificate and delivery receipt are issued.';
  pad.clear();deny('Signature evidence submitted for secure finalization; no signed PDF has yet been certified or delivered.');
 }catch{
  $('inhouse-live-result').textContent='Network or service error. Signing completion not confirmed; contact R-Rent to verify before trying again.';
 }finally{inFlight=false;}
});
setMode();check();
