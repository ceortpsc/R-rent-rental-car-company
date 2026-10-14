import {method,reply,requireJSON,enforceOrigin,failClosed} from '../../lib/http.js';
import {quoteExtension,EVIDENCE_GATES,TASK_TRIGGERS,EXTENSION_STATES} from '../../lib/extension-control.js';
// Read-only quote & workflow contract. Mutation remains intentionally locked until
// separate rental merchant, approved legal/insurance terms, verified Supabase ledger
// and Stripe signed-webhook outbox are provisioned.
export default async function handler(req,res){
 if(!method(req,res,['GET','POST']))return;
 if(req.method==='GET'){
  return reply(res,200,{product:'R-RENT_EXTENSION_V1',estimate:quoteExtension(),
   states:EXTENSION_STATES,evidence_gates:EVIDENCE_GATES,
   triggers:TASK_TRIGGERS,collection_ready:false,activation_ready:false,
   invoice_sent:false,customer_data_accessible:false,provider_key_connected:false});
 }
 if(!enforceOrigin(req,res))return;
 const body=requireJSON(req,res);if(!body)return;
 if(body.action!=='preview')return failClosed(res,'extension_mutation_not_enabled',
  'No acceptance, invoice issuance, settlement or vehicle key action is performed by the preview API.');
 if(body.days!==undefined&&(!Number.isSafeInteger(body.days)||body.days<1||body.days>180))
  return reply(res,422,{error:'invalid_extension_days'});
 const estimate=quoteExtension({days:body.days});
 return reply(res,200,{estimate,invoice_created:false,approval_recorded:false,extension_activated:false});
}
