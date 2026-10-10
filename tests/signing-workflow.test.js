import test from 'node:test';
import assert from 'node:assert/strict';
import {DOCUMENTS,blankReview,validateDocument,getProgress,validateLocalReview,productionReadiness,SERVER_GATES} from '../signing-rules.js';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('ten separately reviewable documents with explicit consent and waiver election',()=>{
 assert.equal(DOCUMENTS.length,10);
 assert.equal(new Set(DOCUMENTS.map(d=>d.code)).size,10);
 assert.ok(DOCUMENTS.find(d=>d.code==='RR-004').election==='waiver');
 assert.ok(DOCUMENTS.find(d=>d.code==='RR-009').election==='esign');
 assert.equal(validateDocument('RR-004',{reviewed:true,initials:'CR'}).ok,false);
 assert.equal(validateDocument('RR-004',{reviewed:true,initials:'CR',election:'decline'}).ok,true);
 assert.equal(validateDocument('RR-009',{reviewed:true,consent:false}).ok,false);
 assert.equal(validateDocument('RR-009',{reviewed:true,consent:true}).ok,true);
});
test('an unsigned browser review is never a legally completed agreement',()=>{
 const review=blankReview();
 assert.deepEqual(getProgress(review),{completed:0,total:10,percent:0});
 assert.equal(validateLocalReview(review).ok,false);
 for(const d of DOCUMENTS){review.reviewed[d.code]=true;if(d.initials)review.initials[d.code]='CR';}
 review.elections.waiver='decline';review.elections.drivers='none';review.esignConsent=true;
 review.sampleSigner='Example Signer';review.sampleSignature='Example Signer';review.sampleDate='2026-10-10';
 assert.deepEqual(getProgress(review),{completed:10,total:10,percent:100});
 const r=validateLocalReview(review);assert.equal(r.ok,true);assert.equal(r.executed,false);assert.equal(r.certificate,false);
});
test('production evidence gates cannot be satisfied by browser-provided fields',()=>{
 assert.ok(SERVER_GATES.length>=10);
 const mock=Object.fromEntries(SERVER_GATES.map(k=>[k,{verified:true,evidence_id:'id_123',verified_at:'2026-10-10T12:00:00Z'}]));
 assert.equal(productionReadiness(mock,false).ready,false);
 assert.equal(productionReadiness(mock,true).ready,true);
 assert.equal(productionReadiness(mock,true).execution_enabled,false);
});
test('dashboard and guided signing routes protect source files and state',()=>{
 const v=JSON.parse(read('vercel.json'));
 assert.ok(v.rewrites.some(x=>x.source==='/signing'&&x.destination==='/signing.html'));
 assert.ok(v.rewrites.some(x=>x.source==='/operations'&&x.destination==='/operations.html'));
 assert.ok(v.rewrites.some(x=>x.source==='/api/v1/roles'));
 assert.ok(v.rewrites.some(x=>x.source==='/api/v1/operations'));
 const html=read('signing.html'),js=read('signing-workflow.js'),ops=read('operations.html');
 assert.ok(html.includes('RRS-PREVIEW-10'));
 assert.ok(js.includes('NOT executed')||js.includes('no legally')||js.includes('not legally')||js.includes('NOT EXECUTED'));
 assert.ok(ops.includes('PROTECTED RECORDS ARE NOT ACCESSIBLE'));
 assert.ok(html.includes('Print / Save unsigned review as PDF'));
 assert.ok(html.includes('gps')||html.includes('GPS'));
});
