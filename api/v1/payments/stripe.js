import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from '../../../lib/http.js';
import {dbReady,userFromRequest,ownedApplication} from '../../../lib/identity.js';
import {stripeCheckout} from '../../../lib/providers.js';
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled('RR_ENABLE_PAYMENTS')||!enabled('RR_INSURANCE_PROGRAM_APPROVED')||!enabled('RR_CONTRACTS_LEGAL_APPROVED')||!enabled('RR_LOCAL_TAX_REVIEW_APPROVED')||!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return failClosed(res,'stripe_not_ready');
 const b=requireJSON(req,res);if(!b)return;
 try{
  const u=await userFromRequest(req);const app=await ownedApplication(b.application_id,u.id);
  if(app.status!=='APPROVED'||app.identity_status!=='VERIFIED'||app.insurance_status!=='VERIFIED'||app.agreement_status!=='SIGNED'||app.payment_status!=='NOT_PAID')return reply(res,409,{error:'eligibility_or_contract_incomplete'});
  // Final local tax, add-ons and insurance must be server-side finalized before checkout activation.
  return failClosed(res,'final_invoice_required','Checkout is intentionally locked until a finalized, versioned amount and settlement ledger are installed.');
 }catch(e){error(res,e);}
}
