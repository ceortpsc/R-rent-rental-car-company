/**
 * R-Rent Cloudflare Access Worker · first-party edge gate · version 1.0
 *
 * Security invariant: no user roles are derived from client headers, query
 * strings, submitted forms or email names. ctx.access is populated only on
 * a Worker invocation authenticated by Cloudflare Access.
 *
 * THIS WORKER DOES NOT PROXY TO VERCEL, CREATE SIGNATURES, OR EXPOSE PII.
 * Staff permissions are additionally checked in the application backend.
 */
const ENVIRONMENTS=new Set(["staging","production"]);
const PUBLIC_SAFE_ROUTES=Object.freeze({
 "/v1/health": "ACCESS_PROTECTED_HEALTH",
 "/v1/permissions": "POLICY_DESCRIPTOR"
});
const RESTRICTED_PATHS=Object.freeze([
 "/admin","/fleet/dispatch","/identity","/insurance",
 "/payments","/refunds","/agreements/issue","/signatures","/storage","/keys"
]);
const HEADERS={
 "content-type":"application/json; charset=utf-8",
 "cache-control":"no-store, private, max-age=0",
 "pragma":"no-cache",
 "x-robots-tag":"noindex, nofollow, noarchive",
 "x-content-type-options":"nosniff",
 "referrer-policy":"no-referrer",
 "x-frame-options":"DENY",
 "content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
};
function respond(status,body,method="GET",extra={}){
 return new Response(method==="HEAD"?null:JSON.stringify(body),{
  status,headers:{...HEADERS,...extra}
 });
}
function configured(env){
 if(!ENVIRONMENTS.has(env?.RR_ENVIRONMENT))return false;
 if(typeof env.CF_ACCESS_AUD!=="string"||!env.CF_ACCESS_AUD.trim()||env.CF_ACCESS_AUD.length>256)return false;
 if(typeof env.RR_STAFF_ALLOWLIST!=="string"||env.RR_STAFF_ALLOWLIST.trim().length<5)return false;
 return env.RR_PRIVATE_ACTIONS_ENABLED==="false";
}
function allowlist(env){
 return new Set(env.RR_STAFF_ALLOWLIST.split(",").map(s=>s.trim().toLowerCase()).filter(s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).slice(0,100));
}
export async function authorizeAccess(ctx,env){
 // No fallback to Cf-Access-Jwt-Assertion as a mere unverified header.
 if(!configured(env))return {ok:false,code:"configuration_unavailable"};
 if(!ctx?.access||typeof ctx.access.getIdentity!=="function")return {ok:false,code:"access_required"};
 if(ctx.access.aud!==env.CF_ACCESS_AUD)return {ok:false,code:"access_audience_mismatch"};
 try{
  const identity=await ctx.access.getIdentity();
  const email=typeof identity?.email==="string"?identity.email.trim().toLowerCase():"";
  const allowed=allowlist(env);
  if(!email||allowed.size===0||!allowed.has(email))return {ok:false,code:"staff_not_authorized"};
  return {ok:true,code:null}; // deliberately do not expose or log email/ID
 }catch{return {ok:false,code:"access_identity_unavailable"};}
}
export function routePolicy(path){
 if(Object.hasOwn(PUBLIC_SAFE_ROUTES,path))return PUBLIC_SAFE_ROUTES[path];
 if(RESTRICTED_PATHS.some(p=>path===p||path.startsWith(p+"/")))return "PRIVATE_ACTION_BLOCKED";
 return "UNKNOWN_ROUTE";
}
export default {
 async fetch(request,env,ctx){
  const method=request.method;
  if(!["GET","HEAD"].includes(method))return respond(405,{error:"method_not_allowed"},method,{allow:"GET, HEAD"});
  let path;
  try{const u=new URL(request.url);path=u.pathname.replace(/\/+$/,"")||"/";}catch{
   return respond(400,{error:"invalid_url"},method);
  }
  const auth=await authorizeAccess(ctx,env);
  if(!auth.ok)return respond(auth.code==="configuration_unavailable"?503:403,{error:auth.code},method);
  const policy=routePolicy(path);
  if(policy==="PRIVATE_ACTION_BLOCKED")return respond(503,{
    status:"LOCKED",reason:"backend_identity_role_approval_and_signed_evidence_required",
    note:"Cloudflare Access sign-in alone never authorizes rental, payment, ID, signing, or administrative actions."
  },method);
  if(policy==="UNKNOWN_ROUTE")return respond(404,{error:"route_not_found"},method);
  if(policy==="ACCESS_PROTECTED_HEALTH")return respond(200,{
    service:"r-rent-protected-edge",
    environment:env.RR_ENVIRONMENT,
    access:"ACCESS_AUTHENTICATED_STAFF_ALLOWLIST",
    customer_record_access:false,
    signing_enabled:false,
    payment_processing_enabled:false,
    policy_version:"1.0"
  },method);
  return respond(200,{
    service:"r-rent-access-policy",
    identity_proof:"Cloudflare Access runtime; audience and exact-email allowlist enforced",
    role_permissions:"INDEPENDENT_VERIFIED_BACKEND_REQUIRED",
    actions_allowed:[],
    frontend_admin_ui_authorized:false,
    note:"This endpoint provides policy metadata only; a staff account and current scoped role are separately required."
  },method);
 }
};
