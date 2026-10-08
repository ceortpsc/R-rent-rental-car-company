import {method,reply,enabled} from '../../lib/http.js';
import {dbReady} from '../../lib/identity.js';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 const db=dbReady();
 const gates={
 public_quote:true,
 auth_database_configured:db,
 applications_enabled:db&&enabled('RR_ENABLE_APPLICATIONS'),
 document_upload_enabled:db&&enabled('RR_ENABLE_SECURE_UPLOADS'),
 legal_contract_approval:enabled('RR_CONTRACTS_LEGAL_APPROVED'),
 insurance_program_approval:enabled('RR_INSURANCE_PROGRAM_APPROVED'),
 local_tax_review:enabled('RR_LOCAL_TAX_REVIEW_APPROVED'),
 stripe_credentials_present:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET),
 paypal_credentials_present:Boolean(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET&&process.env.PAYPAL_WEBHOOK_ID),
 esign_credentials_present:Boolean(process.env.RR_ESIGN_PROVIDER&&process.env.RR_ESIGN_API_KEY),
 payments_enabled:db&&enabled('RR_ENABLE_PAYMENTS'),
 signing_enabled:db&&enabled('RR_ENABLE_SIGNING'),
 release_enabled:db&&enabled('RR_ENABLE_RELEASE')
 };
 reply(res,200,{provider_configuration_flags:gates,notice:'Flags indicate local configuration only, not provider verification, live settlement, insurance validity or regulatory authorization.',can_release_vehicle:false});
}
