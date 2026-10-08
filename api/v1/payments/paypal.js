import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from '../../../lib/http.js';
import {dbReady,userFromRequest,ownedApplication} from '../../../lib/identity.js';
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled('RR_ENABLE_PAYMENTS')||!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)return failClosed(res,'paypal_not_ready');
 const b=requireJSON(req,res);if(!b)return;
 try{const u=await userFromRequest(req);const a=await ownedApplication(b.application_id,u.id);if(a.status!=='APPROVED'||a.identity_status!=='VERIFIED'||a.insurance_status!=='VERIFIED'||a.agreement_status!=='SIGNED')return reply(res,409,{error:'eligibility_or_contract_incomplete'});return failClosed(res,'final_invoice_required');}
 catch(e){error(res,e);}
}
