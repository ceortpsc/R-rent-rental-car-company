import {method,reply} from '../../lib/http.js';
import {FLEET} from '../../lib/pricing.js';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 reply(res,200,{vehicles:FLEET,availability:'manual_verification_required',public_catalog:true});
}
