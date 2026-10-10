import {randomUUID} from 'node:crypto';
import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error} from '../../lib/http.js';
import {dbReady,userFromRequest,dbQuery,TENANT} from '../../lib/identity.js';
const TYPES=['FEEDBACK','REVIEW','COMPLAINT','CHARGE_DISPUTE'];
function safeText(x,max,min=1){return typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max?x.trim():null;}
function sensitive(value){return /\b\d{3}-\d{2}-\d{4}\b/.test(value)||/\b(?:\d[\s-]?){13,19}\b/.test(value);}
export default async function handler(req,res){
 if(!method(req,res,['GET','POST']))return;
 if(req.method==='POST'&&!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled('RR_ENABLE_OAUTH')||!enabled('RR_ENABLE_CASES'))
   return failClosed(res,'secure_case_portal_unavailable','Protected customer cases require verified sign-in, approved database and support operations. Public email drafts remain available.');
 try{
  const user=await userFromRequest(req,'RR_ENABLE_OAUTH');
  if(req.method==='GET'){
    const rows=await dbQuery('support_cases',{select:'id,kind,category,reference,status,created_at,updated_at',tenant:'eq.'+TENANT,user_id:'eq.'+user.id,order:'created_at.desc',limit:'30'});
    return reply(res,200,{cases:rows||[]});
  }
  const b=requireJSON(req,res);if(!b)return;
  const kind=typeof b.kind==='string'?b.kind.toUpperCase():'';
  const category=safeText(b.category,80);
  const description=safeText(b.description,3000,15);
  const reference=b.reference?safeText(b.reference,48):null;
  const amount=b.amount_cents===undefined||b.amount_cents===null?null:b.amount_cents;
  const rating=b.rating===undefined||b.rating===null?null:b.rating;
  if(!TYPES.includes(kind)||!category||!description||b.reference&&!reference||
     reference&&!/^[A-Za-z0-9 _-]{1,48}$/.test(reference)||
     amount!==null&&(!Number.isSafeInteger(amount)||amount<0||amount>99999999)||
     rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5)||
     kind!=='REVIEW'&&rating!==null||kind!=='CHARGE_DISPUTE'&&amount!==null||
     sensitive(description)||sensitive(reference||'')){
     return reply(res,422,{error:'invalid_case_fields',message:'Enter non-sensitive details only; do not provide complete payment card, SSN, or identification numbers.'});
  }
  const recent=await dbQuery('support_cases',{select:'id',tenant:'eq.'+TENANT,user_id:'eq.'+user.id,created_at:'gte.'+new Date(Date.now()-60000).toISOString(),limit:'1'});
  if(recent.length)return reply(res,429,{error:'intake_rate_limited',message:'Wait before filing another case.'});
  const id=randomUUID();
  await dbQuery('support_cases',{}, {method:'POST',body:{id,tenant:TENANT,user_id:user.id,kind,category,reference,description,amount_cents:amount,rating,status:'SUBMITTED'}});
  reply(res,201,{case_id:id,status:'SUBMITTED',message:'Case securely recorded; wait for staff acknowledgment. It has not been resolved or approved.'});
 }catch(e){error(res,e);}
}
