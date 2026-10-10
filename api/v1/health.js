import {encryptionReady} from '../../lib/crypto-vault.js';
import {ROLE_DEFINITIONS,ROLE_SCREENS,publicCatalog} from '../../lib/rbac.js';
import {userFromRequest,dbQuery,TENANT} from '../../lib/identity.js';
import {reply as sendReply,failClosed,error as apiError} from '../../lib/http.js';
import {method,reply,enabled} from '../../lib/http.js';
import {dbReady} from '../../lib/identity.js';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 const mode=new URL(req.url,'https://rtpscrentalcars.com').searchParams.get('mode');
 if(mode==='auth-status')return reply(res,200,{service:'R-Rent customer identity',oauth_signin_publicly_available:false,provider_onboarding_configured:dbReady()&&enabled('RR_ENABLE_OAUTH'),authenticated_case_api_configured:dbReady()&&enabled('RR_ENABLE_OAUTH')&&enabled('RR_ENABLE_CASES'),requires_staff_mfa:true,public_login_url:null,note:'Configuration status only. No credentials or sessions are issued.'});

 if(mode==='roles')return sendReply(res,200,{roles:publicCatalog(),mode:'public_permission_metadata_only',live_access_granted:false});
 if(mode==='operations'){
  if(!dbReady()||!enabled('RR_ENABLE_RBAC'))return failClosed(res,'rbac_backend_disabled','Restricted operations are locked until verified identity, dedicated database, tenant roles and audit controls are configured.');
  try{
   const actor=await userFromRequest(req,'RR_ENABLE_RBAC');
   if(actor.aal!=='aal2')return sendReply(res,403,{error:'staff_mfa_required'});
   const rows=await dbQuery('staff_members',{select:'role,tenant,active',tenant:'eq.'+TENANT,user_id:'eq.'+actor.id,active:'eq.true',limit:'1'});
   const row=rows[0];
   if(!row||!ROLE_DEFINITIONS[row.role]||!ROLE_SCREENS[row.role]||['RENTER','ADDITIONAL_DRIVER'].includes(row.role))return sendReply(res,403,{error:'role_not_authorized'});
   return sendReply(res,200,{role:row.role,scope:ROLE_DEFINITIONS[row.role].scope,screens:ROLE_SCREENS[row.role],permissions:ROLE_DEFINITIONS[row.role].permissions,records:[],data_status:'not_loaded',action_status:'gated',note:'No privileged records are returned by the catalog endpoint. Scoped data services require separate audited controls.'});
  }catch(err){return apiError(res,err);}
 }
 if(mode==='readiness'){
  const db=dbReady();
  return reply(res,200,{provider_configuration_flags:{
   public_quote:true,rbac_backend_available:db&&enabled('RR_ENABLE_RBAC'),encryption_key_configured:encryptionReady(),auth_database_configured:db,oauth_signin_enabled:false,support_case_api_enabled:db&&enabled('RR_ENABLE_CASES')&&enabled('RR_ENABLE_OAUTH'),applications_enabled:db&&enabled('RR_ENABLE_APPLICATIONS'),
   document_upload_enabled:db&&encryptionReady()&&enabled('RR_ENABLE_PRIVATE_VAULT')&&enabled('RR_ENABLE_MALWARE_SCAN')&&enabled('RR_ENABLE_SECURE_UPLOADS'),
   legal_contract_approval:enabled('RR_CONTRACTS_LEGAL_APPROVED'),
   insurance_program_approval:enabled('RR_INSURANCE_PROGRAM_APPROVED'),
   local_tax_review:enabled('RR_LOCAL_TAX_REVIEW_APPROVED'),
   stripe_credentials_present:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET),
   paypal_credentials_present:Boolean(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET&&process.env.PAYPAL_WEBHOOK_ID),
   esign_credentials_present:Boolean(process.env.RR_ESIGN_PROVIDER&&process.env.RR_ESIGN_API_KEY),
   payments_enabled:db&&enabled('RR_ENABLE_PAYMENTS'),signing_enabled:db&&enabled('RR_ENABLE_SIGNING'),release_enabled:db&&enabled('RR_ENABLE_RELEASE')
  },note:'Environment flags are not evidence of live provider authorizations.',can_release_vehicle:false});
 }
 return reply(res,200,{service:'R-Rent',version:'0.2.1',status:'online',transactional_release:'blocked_pending_provider_evidence',timestamp:new Date().toISOString()});
}
