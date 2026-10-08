import {method,reply} from '../../lib/http.js';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 reply(res,200,{service:'R-Rent',version:'0.2.0',status:'online',transactional_release:'blocked_pending_provider_evidence',timestamp:new Date().toISOString()});
}
