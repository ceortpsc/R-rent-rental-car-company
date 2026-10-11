import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAUNCH_MODULES,evaluateLaunch,validateManifest} from '../lib/launch-registry.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('release registry has unique complete dependencies and never auto-approves',()=>{
 assert.ok(validateManifest());
 assert.equal(LAUNCH_MODULES.length,17);
 assert.equal(new Set(LAUNCH_MODULES.map(m=>m.id)).size,LAUNCH_MODULES.length);
 assert.equal(LAUNCH_MODULES.filter(m=>m.phase==='public').length,4);
 for(const mod of LAUNCH_MODULES.filter(m=>m.phase==='restricted')){
  assert.ok(Array.isArray(mod.evidence)&&mod.evidence.length>0,mod.id);
 }
});
test('default launch status is never certified or enabled for restricted actions',()=>{
 const report=evaluateLaunch();
 assert.equal(report.release_status,'NOT_CERTIFIED_FOR_FULL_TRANSACTIONS');
 assert.equal(report.noAutoEnable,true);
 assert.equal(report.restricted_locked,13);
 assert.equal(report.public_code_modules,4);
 assert.ok(report.modules.every(x=>x.verified===false&&x.actions_enabled===false));
 assert.ok(report.modules.filter(x=>x.phase==='restricted').every(x=>x.status.startsWith('LOCKED')));
 assert.ok(report.modules.filter(x=>x.phase==='public').every(x=>x.status==='SOURCE_IMPLEMENTED_RUNTIME_UNVERIFIED'));
});
test('flags alone cannot certify identity, e-sign, payment, insurance, dispatch or disposal',()=>{
 const keys=new Set(LAUNCH_MODULES.flatMap(x=>x.requirements||[]));
 const flags=Object.fromEntries([...keys].map(k=>[k,true]));
 const r=evaluateLaunch({flags});
 for(const id of ['rbac','application','vault','insurance','esign','stripe','paypal','refunds','dispatch','audit','cloudflare','governance','cicd']){
  const mod=r.modules.find(x=>x.id===id);
  assert.ok(mod,'missing '+id);
  assert.equal(mod.actions_enabled,false);
  assert.equal(mod.verified,false);
  assert.equal(mod.status,'LOCKED_EVIDENCE_MISSING');
 }
});
test('client-supplied evidence without trusted server designation cannot certify release',()=>{
 const evidence=Object.fromEntries(LAUNCH_MODULES.flatMap(x=>x.evidence||[]).map(key=>[key,{verified:true,evidence_id:'id-test',verified_at:'2026-10-11T00:00:00Z'}]));
 const r=evaluateLaunch({evidence});
 assert.equal(r.release_status,'NOT_CERTIFIED_FOR_FULL_TRANSACTIONS');
 assert.ok(r.modules.filter(x=>x.phase==='restricted').every(x=>x.verified===false));
});
test('even trusted evidence does not bypass independent final release authority',()=>{
 const flags=Object.fromEntries(LAUNCH_MODULES.flatMap(m=>m.requirements||[]).map(k=>[k,true]));
 const evidence=Object.fromEntries(LAUNCH_MODULES.flatMap(m=>m.evidence||[]).map(k=>[k,{verified:true,evidence_id:'trusted-id',verified_at:'2026-10-11T00:00:00Z'}]));
 const r=evaluateLaunch({flags,evidence,trustedEvidence:true});
 assert.ok(r.modules.filter(m=>m.phase==='restricted').every(m=>m.status==='REQUIRES_INDEPENDENT_RELEASE_APPROVAL'));
 assert.ok(r.modules.every(m=>m.actions_enabled===false));
 assert.equal(r.release_status,'NOT_CERTIFIED_FOR_FULL_TRANSACTIONS');
});
test('dashboard routes and server response keep data public-safe',()=>{
 const v=JSON.parse(read('vercel.json'));
 assert.ok(v.rewrites.some(r=>r.source==='/launch'&&r.destination==='/launch.html'));
 assert.ok(v.rewrites.some(r=>r.source==='/api/v1/launch'&&r.destination==='/api/v1/health?mode=launch'));
 const openapi=JSON.parse(read('openapi.json'));
 assert.ok(openapi.paths['/api/v1/launch']?.get);
 const src=read('api/v1/health.js');
 assert.ok(src.includes("mode==='launch'"));
 assert.ok(src.includes('evaluateLaunch({flags,generatedAt:new Date().toISOString()})'));
 const html=read('launch.html');
 assert.ok(html.includes('INFORMATIONAL READINESS REPORT'));
 assert.ok(html.includes('Export audit JSON'));
 const client=read('launch.js');
 assert.ok(client.includes('NOT_CERTIFIED_FOR_FULL_TRANSACTIONS'));
});
