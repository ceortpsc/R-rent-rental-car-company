import {method,reply,requireJSON,enforceOrigin,failClosed} from '../../lib/http.js';
import {calculate} from '../../lib/pricing.js';
import {quoteExtension,EVIDENCE_GATES,TASK_TRIGGERS,EXTENSION_STATES} from '../../lib/extension-control.js';
export default async function handler(req,res){
 const mode=new URL(req.url,'https://rtpscrentalcars.com').searchParams.get('mode');
 if(mode==='extension'){
  if(!method(req,res,['GET','POST']))return;
  if(req.method==='GET')return reply(res,200,{
   product:'R-RENT_EXTENSION_V1',estimate:quoteExtension(),
   states:EXTENSION_STATES,evidence_gates:EVIDENCE_GATES,triggers:TASK_TRIGGERS,
   collection_ready:false,activation_ready:false,invoice_sent:false,
   customer_data_accessible:false,provider_key_connected:false
  });
  if(!enforceOrigin(req,res))return;
  const b=requireJSON(req,res);if(!b)return;
  if(b.action!=='preview')return failClosed(res,'extension_mutation_not_enabled',
    'Read-only estimates cannot accept agreements or initiate any financial or vehicle-key action.');
  try{return reply(res,200,{estimate:quoteExtension({days:b.days}),
     invoice_created:false,approval_recorded:false,extension_activated:false});}
  catch(e){return reply(res,422,{error:e.message||'invalid_extension_quote'});}
 }
 if(!method(req,res,['POST']))return;
 if(!enforceOrigin(req,res))return;
 const b=requireJSON(req,res);if(!b)return;
 try{reply(res,200,{quote:calculate(b)});}catch(e){reply(res,422,{error:e.message||'invalid_quote'});}
}
