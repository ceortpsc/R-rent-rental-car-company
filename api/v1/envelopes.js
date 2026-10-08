import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from "../../lib/http.js";
import {DOCUMENTS,STATES,parseDraft,fingerprint} from "../../lib/envelopes.js";
import {dbReady,staffFromRequest,dbQuery,TENANT} from "../../lib/identity.js";

// Public registry (no names, addresses, documents, or signatures).
// Privileged DRAFT preparation only when dedicated private DB + MFA are configured.
// External delivery/acceptance is always gated until a secure issuer service exists.
export default async function handler(req,res) {
 if(!method(req,res,["GET","POST"]))return;
 if(req.method==="GET"){
   return reply(res,200,{
     product:"R-Rent Sign",version:"0.3.0",templates:DOCUMENTS,
     envelope_states:STATES,local_signature_canvas:true,
     external_delivery_enabled:false,document_execution_enabled:false,
     identity_upload_enabled:false,
     note:"The public signature pad is a local preview. No signature is collected or stored."
   });
 }
 if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled("RR_ENABLE_ENVELOPES"))return failClosed(res,"envelope_database_not_ready");
 const action=new URL(req.url,"https://rtpscrentalcars.com").searchParams.get("action")||"draft";
 if(action!=="draft")return failClosed(res,"envelope_delivery_locked",
   "Envelopes cannot be issued or executed until secure delivery, verified signer identity, document storage and consent evidence are operational.");
 const data=requireJSON(req,res);if(!data)return;
 try{
   const actor=await staffFromRequest(req,["CORPORATE_OWNER","DIVISION_ADMIN","COMPLIANCE_OFFICER"]);
   const draft=parseDraft(data);
   const hash=fingerprint(draft);
   await dbQuery("envelopes",{},{
     method:"POST",body:{
       id:draft.id,tenant:TENANT,created_by:actor.id,title:draft.title,
       document_codes:draft.documents,recipients_json:draft.recipients,
       expires_in_days:draft.expires_in_days,revision_sha256:hash,status:"DRAFT"
     }
   });
   return reply(res,201,{envelope_id:draft.id,status:"DRAFT",document_fingerprint:hash,delivered:false,signed:false});
 }catch(e){
   if(/^invalid_|^duplicate_/.test(e?.message||""))return reply(res,422,{error:e.message});
   error(res,e);
 }
}
