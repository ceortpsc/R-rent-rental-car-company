import {method,reply,requireJSON,enforceOrigin} from '../../lib/http.js';
import {calculate} from '../../lib/pricing.js';
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;
 if(!enforceOrigin(req,res))return;
 const b=requireJSON(req,res);if(!b)return;
 try{reply(res,200,{quote:calculate(b)});}catch(e){reply(res,422,{error:e.message||'invalid_quote'});}
}
