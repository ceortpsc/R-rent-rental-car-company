import {enabled} from './http.js';
function e(code){const x=new Error(code);x.code=code;return x;}
export function dbReady(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY);}
export async function userFromRequest(req,featureFlag='RR_ENABLE_APPLICATIONS'){
  if(!dbReady()||!enabled(featureFlag)) throw e('unavailable');
  const token=String(req.headers.authorization||'').match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1];
  if(!token)throw e('auth');
  const endpoint=process.env.SUPABASE_URL.replace(/\/$/,'');
  const r=await fetch(endpoint+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw e('auth');
  const user=await r.json();
  if(!user.id||user.aud!=='authenticated')throw e('auth');
  return {id:user.id,token,aal:readAal(token)};
}
function readAal(token){try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).aal||'aal1';}catch{return 'aal1';}}
export async function staffFromRequest(req,roles) {
  const u=await userFromRequest(req);
  if(u.aal!=='aal2')throw e('forbidden');
  const rows=await dbQuery('staff_members',{select:'role',user_id:'eq.'+u.id,active:'eq.true',limit:'1'});
  if(!rows.length||!roles.includes(rows[0].role))throw e('forbidden');
  return u;
}
export async function dbQuery(table,filters={},options={}) {
  if(!dbReady())throw e('unavailable');
  const allowed=['applications','vehicles','verification_cases','documents','agreements','payments','staff_members','audit_events','webhook_events','envelopes','envelope_events','support_cases','support_case_events'];
  if(!allowed.includes(table))throw e('forbidden');
  const u=new URL(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+table);
  for(const [k,v] of Object.entries(filters))u.searchParams.set(k,v);
  const r=await fetch(u,{method:options.method||'GET',headers:{
    apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type':'application/json',Prefer:options.prefer||'return=representation'
  },body:options.body?JSON.stringify(options.body):undefined,signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw e('database_error');
  const body=await r.text();return body?JSON.parse(body):[];
}
export const TENANT='ross-tax-pro-software-company';
export async function ownedApplication(id,userId){
  if(!/^[a-f\d-]{36}$/i.test(id||''))throw e('forbidden');
  const list=await dbQuery('applications',{select:'id,user_id,vehicle_id,pickup_at,return_at,days,base_cents,state_tax_cents,provisional_cents,status,identity_status,insurance_status,agreement_status,payment_status,approved_by,tenant',id:'eq.'+id,user_id:'eq.'+userId,tenant:'eq.'+TENANT,limit:'1'});
  if(!list.length)throw e('forbidden');return list[0];
}
