import test from 'node:test';
import assert from 'node:assert/strict';
import documents from '../api/v1/documents.js';
function req(method,url,body){
 return {method,url,headers:{origin:'https://rtpscrentalcars.com',
   'content-type':'application/json'},body};
}
function response(){
 return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},
  end(value){this.data=value;try{this.body=JSON.parse(value);}catch{this.body=null;}}};
}
test('Document Studio catalog is safe and read-only',async()=>{
 const res=response();
 await documents(req('GET','/api/v1/documents?mode=studio'),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.preview_only,true);
 assert.equal(res.body.external_delivery_enabled,false);
 assert.equal(res.body.agreement_execution_enabled,false);
 assert.ok(res.body.formats.includes('docx'));
 assert.ok(res.body.formats.includes('pdf'));
 assert.deepEqual(res.body.templates,['invoice','receipt','extension','agreement','letterhead']);
});
test('Document export does not run without an explicitly connected private backend',async()=>{
 const orig=process.env.RR_ENABLE_DOCUMENT_ENGINE;
 delete process.env.RR_ENABLE_DOCUMENT_ENGINE;
 const res=response();
 await documents(req('POST','/api/v1/documents?mode=generate',{
  kind:'receipt',document_status:'PAID',amount_cents:30199
 }),res);
 assert.equal(res.statusCode,503);
 assert.equal(res.body.error,'private_document_export_unavailable');
 if(orig===undefined)delete process.env.RR_ENABLE_DOCUMENT_ENGINE;
 else process.env.RR_ENABLE_DOCUMENT_ENGINE=orig;
});
test('Unrelated protected document upload remains separately gated',async()=>{
 const res=response();
 await documents(req('POST','/api/v1/documents',{document_type:'license_front'}),res);
 assert.equal(res.statusCode,503);
 assert.equal(res.body.error,'secure_document_vault_unavailable');
});
