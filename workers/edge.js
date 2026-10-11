// R-Rent Cloudflare Worker. Public policy/education only; no PII, signatures,
// financial transactions, privileged proxying or third-party AI services.
import {evaluatePublicSupport,publicCapabilities} from '../lib/support-policy.js';
import {publicHelpGuide} from '../lib/rental-help.js';

const KNOWN_ORIGINS=new Set([
 'https://rtpscrentalcars.com',
 'https://www.rtpscrentalcars.com',
 'https://r-rent-rental-cars.vercel.app'
]);
const COMMON_HEADERS=Object.freeze({
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store, max-age=0',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
 'X-Rent-Service':'public-worker'
});
const JSON_MAX_BYTES=2048;
function reply(status,body,origin='',extra={}){
 const headers=new Headers(COMMON_HEADERS);
 headers.set('Allow','GET, HEAD, POST, OPTIONS');
 headers.set('Vary','Origin');
 for(const [key,value] of Object.entries(extra))headers.set(key,value);
 if(origin&&KNOWN_ORIGINS.has(origin)){
  headers.set('Access-Control-Allow-Origin',origin);
  headers.set('Access-Control-Allow-Methods','GET, HEAD, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers','Content-Type');
  headers.set('Access-Control-Max-Age','300');
 }
 return new Response(status===204?null:JSON.stringify(body),{status,headers});
}
function keyPath(raw){
 if(/%2f|%5c|%00/i.test(raw))return '';
 const decoded=decodeURIComponent(raw);
 return decoded.replace(/\/+$/,'')||'/';
}
function safeRequestID(){return crypto.randomUUID();}
export default {
 async fetch(request,env={}){
  const origin=request.headers.get('Origin')||'';
  const requestID=safeRequestID();
  let url,path;
  try{url=new URL(request.url);path=keyPath(url.pathname);}catch{
   return reply(400,{error:'invalid_url',request_id:requestID},origin);
  }
  const normalized=path.startsWith('/api/edge/')?path.slice('/api/edge'.length):path;
  if(request.method==='OPTIONS'){
   if(!origin||!KNOWN_ORIGINS.has(origin))return reply(403,{error:'origin_denied'},origin);
   return reply(204,null,origin);
  }
  const allowed=['GET','HEAD','POST'];
  if(!allowed.includes(request.method))return reply(405,{error:'method_not_allowed',request_id:requestID},origin);
  // No credentials or personal record APIs are implemented here.
  const json=(status,data)=>reply(status,{...data,request_id:requestID},origin);
  if(normalized==='/health'||normalized==='/v1/health'){
   if(request.method==='POST')return json(405,{error:'method_not_allowed'});
   return json(200,{service:'R-Rent public edge',status:'ok',
    environment:env.RR_ENVIRONMENT||'development',public_only:true,
    live_signing:false,payments:false,insurance_verification:false,
    protected_account_proxy:false,provider_ai_connected:false});
  }
  if(normalized==='/v1/support/capabilities'){
   if(request.method==='POST')return json(405,{error:'method_not_allowed'});
   return json(200,{...publicCapabilities(),no_server_conversation_storage:true,source:'versioned_company_policy'});
  }
  if(normalized==='/v1/guide/signing'||normalized==='/v1/guide/returning'){
   if(request.method==='POST')return json(405,{error:'method_not_allowed'});
   const guide=publicHelpGuide(normalized.split('/').at(-1));
   return guide?json(200,{guide}):json(404,{error:'unknown_guide'});
  }
  if(normalized==='/v1/support'){
   if(request.method!=='POST')return json(405,{error:'post_required'});
   if(!origin||!KNOWN_ORIGINS.has(origin))return json(403,{error:'origin_not_allowed'});
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json(415,{error:'json_required'});
   const len=Number(request.headers.get('content-length')||'0');
   if(!Number.isFinite(len)||len>JSON_MAX_BYTES)return json(413,{error:'message_too_large'});
   let raw;
   try{raw=await request.text();}catch{return json(400,{error:'invalid_request'});}
   if(new TextEncoder().encode(raw).length>JSON_MAX_BYTES)return json(413,{error:'message_too_large'});
   let body;
   try{body=JSON.parse(raw);}catch{return json(400,{error:'invalid_json'});}
   if(!body||typeof body!=='object'||Array.isArray(body)||
       Object.keys(body).length!==1||!Object.hasOwn(body,'message'))return json(422,{error:'unsupported_chat_fields'});
   const guidance=evaluatePublicSupport(body.message);
   return json(guidance.ok?200:422,{...guidance,mode:'approved_public_policy',
    ticket_created:false,customer_records_accessed:false,automated:true});
  }
  return json(404,{error:'route_not_found',available:[
   '/v1/health','/v1/support','/v1/support/capabilities',
   '/v1/guide/signing','/v1/guide/returning'
  ]});
 }
};
