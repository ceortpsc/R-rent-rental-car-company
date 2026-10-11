import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../workers/edge.js';

const env={RR_ENVIRONMENT:'staging',RR_PUBLIC_SITE_URL:'https://rtpscrentalcars.com'};
const url='https://r-rent-edge-staging.example.workers.dev';
const origin='https://rtpscrentalcars.com';
const req=(path,init={})=>worker.fetch(new Request(url+path,init),env,{});
async function body(response){return await response.json();}

test('Wrangler v4 configuration defines isolated staging/production without hijacking Vercel',()=>{
 const raw=readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8');
 const config=JSON.parse(raw);
 assert.equal(config.compatibility_date,'2026-10-10');
 assert.equal(config.main,'./workers/edge.js');
 assert.equal(config.env.staging.name,'r-rent-edge-staging');
 assert.equal(config.env.production.name,'r-rent-edge-production');
 assert.equal(config.env.staging.workers_dev,true);
 assert.ok(!config.routes&&!config.route);
 assert.ok(!config.env.production.routes&&!config.env.production.route);
 assert.ok(!config.account_id);
});
test('public health is reachable but does not claim real payment, signing or identity',async()=>{
 const response=await req('/v1/health');
 assert.equal(response.status,200);
 const value=await body(response);
 assert.equal(value.environment,'staging');
 assert.equal(value.public_only,true);
 assert.equal(value.live_signing,false);
 assert.equal(value.payments,false);
 assert.equal(value.protected_account_proxy,false);
 assert.equal(response.headers.get('Cache-Control'),'no-store, max-age=0');
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
});
test('the two policy guides are complete and safe for customers',async()=>{
 const a=await body(await req('/v1/guide/signing'));
 const b=await body(await req('/api/edge/v1/guide/returning'));
 assert.equal(a.guide.steps.length,8);
 assert.equal(b.guide.steps.length,8);
 assert.equal(a.guide.status,'PUBLIC_REVIEW_ONLY');
 assert.match(a.guide.introduction,/unsigned/i);
 assert.match(b.guide.steps[5].detail,/unsecured|unattended|abandon/i);
});
test('public support returns curated guidance without ticket/record claims',async()=>{
 const response=await req('/v1/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({message:'How do I return a rented vehicle?'})});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 const result=await body(response);
 assert.equal(result.intent,'return');
 assert.equal(result.ticket_created,false);
 assert.equal(result.customer_records_accessed,false);
 assert.equal(result.automated,true);
 assert.ok(result.links.includes('/contact'));
});
test('support endpoint blocks unknown origins, credential fields and sensitive content',async()=>{
 const forbidden=await req('/v1/support',{method:'POST',headers:{Origin:'https://malicious.invalid','Content-Type':'application/json'},body:JSON.stringify({message:'quote'})});
 assert.equal(forbidden.status,403);
 const fields=await req('/v1/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({message:'hello',tenant:'admin'})});
 assert.equal(fields.status,422);
 const personal=await req('/v1/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({message:'My email is sample@example.com'})});
 assert.equal(personal.status,422);
 const result=await body(personal);
 assert.equal(result.status,'sensitive_content_blocked');
 assert.equal(result.ticket_created,false);
});
test('Cloudflare input limits, CORS and method restrictions fail closed',async()=>{
 const missingOrigin=await req('/v1/support',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"message":"signing"}'});
 assert.equal(missingOrigin.status,403);
 const huge=await req('/v1/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({message:'a'.repeat(2200)})});
 assert.equal(huge.status,413);
 const malformed=await req('/v1/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{broken'});
 assert.equal(malformed.status,400);
 const wrongType=await req('/v1/support',{method:'POST',headers:{Origin:origin,'Content-Type':'text/plain'},body:'hello'});
 assert.equal(wrongType.status,415);
 const preflight=await req('/v1/support',{method:'OPTIONS',headers:{Origin:origin}});
 assert.equal(preflight.status,204);
 const blockedPreflight=await req('/v1/support',{method:'OPTIONS',headers:{Origin:'https://wrong.example'}});
 assert.equal(blockedPreflight.status,403);
 const privateRoute=await req('/v1/internal/signature');
 assert.equal(privateRoute.status,404);
 const postHealth=await req('/v1/health',{method:'POST'});
 assert.equal(postHealth.status,405);
});
