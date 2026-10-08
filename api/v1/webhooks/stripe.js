import {method,reply,rawRequest} from '../../../lib/http.js';
import {stripeSignatureValid} from '../../../lib/providers.js';
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;
 try{
  const raw=await rawRequest(req,1024*1024);
  if(!stripeSignatureValid(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET))return reply(res,401,{error:'invalid_webhook_signature'});
  // Never acknowledge a financial event as processed until durable inbox + idempotent ledger exist.
  reply(res,503,{error:'settlement_inbox_not_connected',retryable:true});
 }catch{reply(res,400,{error:'invalid_webhook_payload'});}
}
