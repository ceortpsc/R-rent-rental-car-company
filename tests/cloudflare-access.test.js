import test from "node:test";
import assert from "node:assert/strict";
import worker,{authorizeAccess,routePolicy} from "../cloudflare/rrent-edge/src/index.js";
import {readFileSync} from "node:fs";
const config=JSON.parse(readFileSync(new URL("../cloudflare/rrent-edge/wrangler.jsonc",import.meta.url),"utf8"));
const env={RR_ENVIRONMENT:"staging",RR_PRIVATE_ACTIONS_ENABLED:"false",CF_ACCESS_AUD:"aud-for-test-only",RR_STAFF_ALLOWLIST:"owner@example.test,ops@example.test"};
const staffCtx={access:{aud:"aud-for-test-only",getIdentity:async()=>({email:"OWNER@EXAMPLE.TEST"})}};
const call=(path,opts={})=>worker.fetch(new Request("https://staging.example.test"+path,opts),{...env},staffCtx);
test("Wrangler is staging-isolated and production has no custom domains",()=>{
 assert.equal(config.name,"rrent-access-edge");
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
 assert.equal(config.env.staging.workers_dev,true);
 assert.equal(config.env.staging.vars.RR_PRIVATE_ACTIONS_ENABLED,"false");
 assert.equal(config.vars.RR_PRIVATE_ACTIONS_ENABLED,"false");
 assert.equal(config.routes,undefined);
 assert.equal(config.route,undefined);
 assert.ok(config.main.endsWith("/index.js"));
});
test("fails closed when Access identity is missing regardless of spoofed headers",async()=>{
 const request=new Request("https://staging.example.test/v1/health",{headers:{"Cf-Access-Jwt-Assertion":"fake","X-Rent-Admin":"true","X-User-Email":"owner@example.test"}});
 const r=await worker.fetch(request,env,{});
 assert.equal(r.status,403);
 assert.equal((await r.json()).error,"access_required");
});
test("configuration and Access audience exact match must be present",async()=>{
 assert.equal((await worker.fetch(new Request("https://staging.example.test/v1/health"),{...env,CF_ACCESS_AUD:""},staffCtx)).status,503);
 assert.equal((await worker.fetch(new Request("https://staging.example.test/v1/health"),{...env,RR_STAFF_ALLOWLIST:""},staffCtx)).status,503);
 assert.equal((await worker.fetch(new Request("https://staging.example.test/v1/health"),env,{access:{aud:"different",getIdentity:staffCtx.access.getIdentity}})).status,403);
 assert.equal((await worker.fetch(new Request("https://staging.example.test/v1/health"),{...env,RR_PRIVATE_ACTIONS_ENABLED:"true"},staffCtx)).status,503);
});
test("exact staff allowlist, not any account login, grants safe status only",async()=>{
 const outsider={access:{aud:"aud-for-test-only",getIdentity:async()=>({email:"outsider@example.test"})}};
 assert.equal((await worker.fetch(new Request("https://staging.example.test/v1/health"),env,outsider)).status,403);
 const r=await call("/v1/health");assert.equal(r.status,200);
 const payload=await r.json();
 assert.equal(payload.signing_enabled,false);assert.equal(payload.payment_processing_enabled,false);
 assert.equal(payload.customer_record_access,false);
 assert.ok(!JSON.stringify(payload).includes("owner@example.test"));
 assert.equal(r.headers.get("cache-control").includes("no-store"),true);
 assert.equal(r.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
});
test("all privileged paths are locked even when staff is Access-authenticated",async()=>{
 for(const path of ["/admin","/admin/users","/payments","/refunds/1","/signatures","/identity/upload","/insurance","/fleet/dispatch","/agreements/issue","/storage/doc","/keys"]){
  assert.equal(routePolicy(path),"PRIVATE_ACTION_BLOCKED");
  const r=await call(path);
  assert.equal(r.status,503,path);
  assert.equal((await r.json()).status,"LOCKED");
 }
});
test("route/method allowlist refuses unknown, writes and private result leakage",async()=>{
 assert.equal((await call("/random")).status,404);
 assert.equal((await call("/v1/health",{method:"POST"})).status,405);
 const r=await call("/v1/permissions");assert.equal(r.status,200);
 const data=await r.json();assert.deepEqual(data.actions_allowed,[]);
 const head=await call("/v1/health",{method:"HEAD"});
 assert.equal(head.status,200);assert.equal(await head.text(),"");
});
test("authorization uses ctx.access identity, never request-supplied role",async()=>{
 assert.deepEqual(await authorizeAccess(staffCtx,env),{ok:true,code:null});
 assert.equal((await authorizeAccess({access:{aud:"aud-for-test-only",getIdentity:async()=>null}},env)).ok,false);
 assert.equal((await authorizeAccess({access:{aud:"aud-for-test-only",getIdentity:async()=>{throw Error("oops");}}},env)).ok,false);
});
