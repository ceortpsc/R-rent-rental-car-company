import {method,reply,enabled} from '../../lib/http.js';
import {dbReady} from '../../lib/identity.js';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 const mode=new URL(req.url,'https://rtpscrentalcars.com').searchParams.get('mode');
 if(mode==='auth-status')return reply(res,200,{service:'R-Rent customer identity',oauth_signin_publicly_available:false,provider_onboarding_configured:dbReady()&&enabled('RR_ENABLE_OAUTH'),authenticated_case_api_configured:dbReady()&&enabled('RR_ENABLE_OAUTH')&&enabled('RR_ENABLE_CASES'),requires_staff_mfa:true,public_login_url:null,note:'Configuration status only. No credentials or sessions are issued.'});
 if(mode==='readiness'){
  const db=dbReady();
  return reply(res,200,{provider_configuration_flags:{
   public_quote:true,auth_database_configured:db,oauth_signin_enabled:false,support_case_api_enabled:db&&enabled('RR_ENABLE_CASES')&&enabled('RR_ENABLE_OAUTH'),applications_enabled:db&&enabled('RR_ENABLE_APPLICATIONS'),
   document_upload_enabled:db&&enabled('RR_ENABLE_SECURE_UPLOADS'),
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
