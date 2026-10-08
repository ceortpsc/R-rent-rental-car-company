import {method,reply,requireJSON,enforceOrigin,failClosed,error} from '../../lib/http.js';
import {userFromRequest,ownedApplication,dbReady} from '../../lib/identity.js';
// Explainable rules only: AI review NEVER decides fitness to drive, coverage or legal acceptance.
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 if(!dbReady())return failClosed(res,'private_review_unavailable');
 const b=requireJSON(req,res);if(!b)return;
 try{
  const u=await userFromRequest(req);
  const app=await ownedApplication(b.application_id,u.id);
  const issues=[];
  if(app.identity_status!=='VERIFIED')issues.push({code:'IDENTITY_PENDING',severity:'block',recommendation:'Request human-verified driving credentials.'});
  if(app.insurance_status!=='VERIFIED')issues.push({code:'INSURANCE_PENDING',severity:'block',recommendation:'Obtain underwriter/carrier-approved coverage evidence.'});
  if(app.agreement_status!=='SIGNED')issues.push({code:'AGREEMENT_PENDING',severity:'block',recommendation:'Issue legally approved documents for e-sign.'});
  if(app.payment_status!=='VERIFIED')issues.push({code:'PAYMENT_PENDING',severity:'block',recommendation:'Wait for signed provider webhook and reconciliation.'});
  reply(res,200,{application_id:app.id,kind:'EXPLAINABLE_RULES_ONLY',issues,human_review_required:true,automatic_approval:false});
 }catch(e){error(res,e);}
}
