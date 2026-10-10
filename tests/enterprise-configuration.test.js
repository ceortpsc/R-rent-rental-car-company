import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('high risk features remain off until verified provider dependencies',()=>{
 const r=JSON.parse(src('config/feature-registry.json'));
 assert.equal(r.no_auto_enable,true);
 assert.equal(r.features.length,13);
 assert.ok(r.features.every(x=>x.default===false&&x.requires.length>0));
 for(const flag of ['RR_ENABLE_PRIVATE_VAULT','RR_ENABLE_PAYMENTS','RR_ENABLE_SIGNING','RR_ENABLE_RELEASE','RR_ENABLE_RBAC','RR_ENABLE_ENCRYPTED_CASE_STORAGE']){
  assert.ok(r.features.some(x=>x.key===flag),'missing '+flag);
 }
 assert.ok(r.secrets.every(x=>!Object.prototype.hasOwnProperty.call(x,'value')));
});
test('restricted customer comments and envelope recipients are encrypted in proposed backend',()=>{
 const cases=src('lib/support-cases.js'),envelopes=src('api/v1/envelopes.js');
 assert.match(cases,/encryptionReady\(\)/);
 assert.match(cases,/RR_ENABLE_ENCRYPTED_CASE_STORAGE/);
 assert.match(cases,/description_envelope/);
 assert.match(cases,/encryptRestricted\(description/);
 assert.doesNotMatch(cases,/reference,description,amount_cents/);
 assert.match(envelopes,/RR_ENABLE_ENCRYPTED_ENVELOPES/);
 assert.match(envelopes,/recipients_json:encryptRestricted/);
 assert.doesNotMatch(envelopes,/recipients_json:draft\.recipients/);
});
test('protected operations cannot obtain authority by selecting roles in public view',()=>{
 const ops=src('operations.js'),api=src('api/v1/health.js');
 assert.match(ops,/permission preview only/i);
 assert.match(ops,/\/api\/v1\/operations/);
 assert.match(api,/actor\.aal!=='aal2'/);
 assert.match(api,/tenant:'eq\.'\+TENANT/);
 assert.match(api,/RR_ENABLE_RBAC/);
 assert.match(api,/additional_driver/i);
});
test('sensitive migration is author-only and must be reviewed before applying',()=>{
 const a=src('supabase/migrations/20261010_003_enterprise_security.sql');
 const b=src('supabase/migrations/20261010_004_encrypted_case_storage.sql');
 assert.match(a,/NOT APPLIED/);
 assert.match(b,/NOT APPLIED/);
 assert.match(a,/row level security/i);
 assert.match(a,/revoke all on public\.restricted_records/);
 assert.match(b,/description_envelope/);
 assert.match(b,/not valid/i);
});
