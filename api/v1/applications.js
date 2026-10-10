import handleSupportCases from '../../lib/support-cases.js';
import {randomUUID} from 'node:crypto';
import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from '../../lib/http.js';
import {calculate} from '../../lib/pricing.js';
import {dbReady,userFromRequest,dbQuery,TENANT} from '../../lib/identity.js';
export default async function handler(req,res){
 if(new URL(req.url,'https://rtpscrentalcars.com').searchParams.get('mode')==='support-cases')return handleSupportCases(req,res);
 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled('RR_ENABLE_APPLICATIONS'))return failClosed(res);
 const b=requireJSON(req,res);if(!b)return;
 try{
   const user=await userFromRequest(req);
   const q=calculate(b);
   const record={id:randomUUID(),tenant:TENANT,user_id:user.id,vehicle_id:q.vehicle_id,pickup_at:b.pickup_at,return_at:b.return_at,days:q.days,base_cents:q.base_rental_cents,state_tax_cents:q.provisional_state_tax_cents,provisional_cents:q.provisional_subtotal_cents,status:'DRAFT',identity_status:'NOT_VERIFIED',insurance_status:'NOT_VERIFIED',agreement_status:'NOT_SIGNED',payment_status:'NOT_PAID'};
   await dbQuery('applications',{}, {method:'POST',body:record});
   reply(res,201,{application_id:record.id,status:'DRAFT',quote_status:'PROVISIONAL_ONLY',next:'Manual verification; do not submit payment or assume a reservation.'});
 }catch(e){if(e?.message?.startsWith('invalid')||e?.message==='rate_unavailable')return reply(res,422,{error:e.message});error(res,e);}
}
