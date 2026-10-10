import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const care=readFileSync(new URL('../care.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('all essential customer routes exist and are integrated',()=>{
 for(const path of ['/about','/contact','/feedback','/reviews','/complaints','/disputes','/refund-policy','/access']){
  assert.ok(care.includes(path),path);
 }
 assert.ok(index.indexOf('/care.js')<index.indexOf('/app.js'));
 assert.match(app,/RRentCare\.render\(p\)/);
});
test('refund disclosures respect consumer rights',()=>{
 for(const word of ['91.057','refund','charge','deposit'])assert.ok(care.includes(word));
 assert.ok(care.includes('dispute'));
});
test('review and case submission do not claim unperformed actions',()=>{
 assert.match(care,/does not file a case automatically/);
 assert.match(care,/No authenticated customer reviews are published yet/);
 assert.match(care,/Do not enter private ID numbers/iu);
});

test('published legal policies are accessible through named SPA routes',()=>{
 const legal=readFileSync(new URL('../legal-policies.js',import.meta.url),'utf8');
 const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(index,/legal-policies\.js/);
 assert.match(app,/RRentLegal\.render\(p\)/);
 assert.match(legal,/RR-LGL-001/);
 assert.match(legal,/RR-LGL-002/);
 assert.match(legal,/91\.057/);
 assert.match(legal,/R-Rent Privacy Request/);
 assert.ok(vercel.redirects.some(r=>r.source==='/terms-of-service'&&r.destination==='/terms'));
 assert.ok(vercel.redirects.some(r=>r.source==='/privacy-policy'&&r.destination==='/privacy'));
 assert.ok(vercel.rewrites.some(r=>r.source.includes('legal-policies')));
});
