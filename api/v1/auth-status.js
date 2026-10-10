import {method,reply,enabled} from '../../lib/http.js';
import {dbReady} from '../../lib/identity.js';
export default function handler(req,res){
 if(!method(req,res,['GET']))return;
 reply(res,200,{service:'R-Rent customer identity',
   oauth_signin_publicly_available:false,
   provider_onboarding_configured:dbReady()&&enabled('RR_ENABLE_OAUTH'),
   authenticated_case_api_configured:dbReady()&&enabled('RR_ENABLE_OAUTH')&&enabled('RR_ENABLE_CASES'),
   roles:['RENTER','CUSTOMER_SUPPORT','BILLING_SPECIALIST','DIVISION_ADMIN','CORPORATE_OWNER'],
   required_controls:['OIDC/OAuth2 with PKCE','Trusted verified user token','MFA for staff','Server-side tenant and role checks','Rate limiting','Case audit trail'],
   public_login_url:null,
   note:'This endpoint reports configuration status only. It does not issue credentials, create sessions, or verify identity.'});
}
