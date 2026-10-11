import {signingReadiness,recordInhouseSignature} from '../../lib/inhouse-signing.js';
import {encryptRestricted,encryptionReady} from '../../lib/crypto-vault.js';
import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from "../../lib/http.js";
import {DOCUMENTS,STATES,parseDraft,fingerprint} from "../../lib/envelopes.js";
import {dbReady,staffFromRequest,dbQuery,TENANT} from "../../lib/identity.js";

// Public registry (no names, addresses, documents, or signatures).
// Privileged DRAFT preparation only when dedicated private DB + MFA are configured.
// External delivery/acceptance is always gated until a secure issuer service exists.
export default async function handler(req,res) {
 if(!method(req,res,["GET","POST"]))return;
 const action=new URL(req.url,"https://rtpscrentalcars.com").searchParams.get("action")||(req.method==="GET"?"registry":"draft");
 if(req.method==="GET"&&action==="inhouse-readiness"){const state=signingReadiness();return reply(res,200,{engine:state.engine,external_provider_required:false,configured:state.ready,missing_gates:state.missing,signature_capture_live:state.ready,documents_executed:false,note:"Readiness reflects configuration only; a current authenticated signer session and exact approved document must be verified before recording."});}
 if(req.method==="POST"&&action==="inhouse-sign"){
   if(!enforceOrigin(req,res))return;
   const state=signingReadiness();
   if(!state.ready)return failClosed(res,"inhouse_signing_unavailable","The first-party signer identity, encrypted event store, approved document, private PDF renderer and immutable records are not all configured.");
   const b=requireJSON(req,res);if(!b)return;
   try{return reply(res,202,await recordInhouseSignature(req,b));}catch(e){
     if(e?.code)return reply(res,409,{error:"inhouse_signing_denied",message:"Signer, document revision, consent or required evidence could not be verified."});return error(res,e);
   }
 }
 if(req.method==="GET"&&action==="registry"){
   return reply(res,200,{
     product:"R-Rent Sign",version:"0.5.0",templates:DOCUMENTS,
     envelope_states:STATES,local_signature_canvas:true, guided_review_url:"/signing",guided_review_document_count:10,public_review_mode:"BROWSER_LOCAL_UNSIGNED", identity_check_status:"NOT_PERFORMED",gps_recorded:false,signed_pdf_available:false,customer_and_company_copies_delivered:false,
     inhouse_signature_engine:true,inhouse_readiness_url:"/api/v1/envelopes?action=inhouse-readiness",external_delivery_enabled:false,document_execution_enabled:false,
     identity_upload_enabled:false,
     note:"The public signature pad is a local preview. No signature is collected or stored."
   });
 }
 if(req.method==="GET")return reply(res,404,{error:"unknown_action"});
 if(action!=="draft")return failClosed(res,"unsupported_envelope_action","No invitation, signing or completion can be issued by this route without its dedicated authenticated workflow.");
 if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled("RR_ENABLE_ENVELOPES")||!enabled("RR_ENABLE_ENCRYPTED_ENVELOPES")||!encryptionReady())return failClosed(res,"envelope_database_not_ready");
 const data=requireJSON(req,res);if(!data)return;
 try{
   const actor=await staffFromRequest(req,["CORPORATE_OWNER","DIVISION_ADMIN","COMPLIANCE_OFFICER"]);
   const draft=parseDraft(data);
   const hash=fingerprint(draft);
   await dbQuery("envelopes",{},{
     method:"POST",body:{
       id:draft.id,tenant:TENANT,created_by:actor.id,title:draft.title,
       document_codes:draft.documents,recipients_json:encryptRestricted(JSON.stringify(draft.recipients),{tenant:TENANT,recordId:draft.id,field:'envelope_recipients'}),
       expires_in_days:draft.expires_in_days,revision_sha256:hash,status:"DRAFT"
     }
   });
   return reply(res,201,{envelope_id:draft.id,status:"DRAFT",document_fingerprint:hash,delivered:false,signed:false});
 }catch(e){
   if(/^invalid_|^duplicate_/.test(e?.message||""))return reply(res,422,{error:e.message});
   error(res,e);
 }
}
