import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from '../../lib/http.js';
import {dbReady,userFromRequest,ownedApplication} from '../../lib/identity.js';
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 const provider=new URL(req.url,'https://rtpscrentalcars.com').searchParams.get('provider');
 if(!['stripe','paypal'].includes(provider))return reply(res,422,{error:'invalid_payment_provider'});
 const configured=provider==='stripe'?Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET):Boolean(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET&&process.env.PAYPAL_WEBHOOK_ID);
 if(!dbReady()||!enabled('RR_ENABLE_PAYMENTS')||!enabled('RR_INSURANCE_PROGRAM_APPROVED')||!enabled('RR_CONTRACTS_LEGAL_APPROVED')||!enabled('RR_LOCAL_TAX_REVIEW_APPROVED')||!configured)return failClosed(res,provider+'_not_ready');
 const b=requireJSON(req,res);if(!b)return;
 try{
  const u=await userFromRequest(req),a=await ownedApplication(b.application_id,u.id);
  if(a.status!=='APPROVED'||a.identity_status!=='VERIFIED'||a.insurance_status!=='VERIFIED'||a.agreement_status!=='SIGNED'||a.payment_status!=='NOT_PAID')return reply(res,409,{error:'eligibility_or_contract_incomplete'});
  return failClosed(res,'final_invoice_required','No live checkout until an approved final amount and durable settlement journal exist.');
 }catch(e){error(res,e);}
}
