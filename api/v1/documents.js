import {encryptionReady} from '../../lib/crypto-vault.js';
import {randomUUID} from 'node:crypto';
import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error,text} from '../../lib/http.js';
import {dbReady,userFromRequest,ownedApplication,dbQuery,staffFromRequest,TENANT} from '../../lib/identity.js';
export default async function handler(req,res){
 const mode=new URL(req.url,'https://rtpscrentalcars.com').searchParams.get('mode');
 if(mode==='studio'){
  if(!method(req,res,['GET']))return;
  return reply(res,200,{
   product:'R-Rent Template-First Document Engine',version:'1.0.0',
   formats:['docx','pdf','html','csv','json','zip'],
   templates:['invoice','receipt','extension','agreement','letterhead'],
   source_of_truth:'Approved company Word masters (not generic replacement templates)',
   preview_only:true,external_delivery_enabled:false,agreement_execution_enabled:false,
   live_export_connected:enabled('RR_ENABLE_DOCUMENT_ENGINE')&&Boolean(process.env.RR_DOCUMENT_ENGINE_ORIGIN&&process.env.RR_DOCUMENT_SERVICE_TOKEN),
   note:'Branded exports require an authenticated staff session and a separately deployed private document service. No payment or signature is verified by this endpoint.'
  });
 }
 if(mode==='generate'){
  if(!method(req,res,['POST']))return;
  if(!enforceOrigin(req,res))return;
  if(!enabled('RR_ENABLE_DOCUMENT_ENGINE')||!process.env.RR_DOCUMENT_ENGINE_ORIGIN||!process.env.RR_DOCUMENT_SERVICE_TOKEN){
   return failClosed(res,'private_document_export_unavailable','The approved template renderer and protected service are not yet connected.');
  }
  let service;
  try{
   service=new URL(process.env.RR_DOCUMENT_ENGINE_ORIGIN);
   if(service.protocol!=='https:'||service.username||service.password||service.search||service.hash||service.pathname!=='/')throw Error('invalid');
  }catch{return failClosed(res,'private_document_export_configuration_invalid');}
  const b=requireJSON(req,res);if(!b)return;
  if(!['invoice','receipt','extension','agreement','letterhead'].includes(b.kind)||
    (b.formats!==undefined&&(!Array.isArray(b.formats)||b.formats.length>6||
    !b.formats.every(x=>['docx','pdf','html','csv','json','zip'].includes(x))))){
    return reply(res,422,{error:'invalid_document_kind_or_format'});
  }
  const serialized=JSON.stringify(b);
  if(Buffer.byteLength(serialized,'utf8')>30000)return reply(res,413,{error:'document_payload_too_large'});
  try{
   await staffFromRequest(req,['CORPORATE_OWNER','DIVISION_ADMIN','BILLING_SPECIALIST','COMPLIANCE_OFFICER','RENTAL_MANAGER']);
   // Always server-side staff auth/MFA, no browser role headers or client-supplied paid status.
   const upstream=new URL('/v1/generate',service);
   const response=await fetch(upstream,{
    method:'POST',headers:{'Content-Type':'application/json',
     'X-RR-Service-Token':process.env.RR_DOCUMENT_SERVICE_TOKEN,
     'Accept':'application/zip'},
    body:serialized,signal:AbortSignal.timeout(25000)
   });
   if(!response.ok){
    return reply(res,response.status===422?422:503,{
     error:response.status===422?'document_validation_failed':'document_export_service_unavailable'
    });
   }
   const size=Number(response.headers.get('content-length')||0);
   if(size>12582912)return reply(res,502,{error:'export_exceeded_maximum_size'});
   const data=Buffer.from(await response.arrayBuffer());
   if(data.length>12582912||data.subarray(0,2).toString()!=='PK')
     return reply(res,502,{error:'invalid_export_package'});
   res.statusCode=200;
   res.setHeader('Content-Type','application/zip');
   res.setHeader('Content-Disposition','attachment; filename="r-rent-branded-documents.zip"');
   res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');
   return res.end(data);
  }catch(e){
   if(['auth','forbidden'].includes(e?.code))return error(res,e);
   return failClosed(res,'document_export_unavailable');
  }
 }

 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled('RR_ENABLE_SECURE_UPLOADS')||!enabled('RR_ENABLE_PRIVATE_VAULT')||!enabled('RR_ENABLE_MALWARE_SCAN')||!encryptionReady())return failClosed(res,'secure_document_vault_unavailable','Sensitive document intake is disabled until encrypted private storage, malware scanning, authenticated RBAC and approved retention are confirmed.');
 const b=requireJSON(req,res);if(!b)return;
 const types=['license_front','license_back','insurance_card','insurance_declarations','vehicle_condition','supporting_document'];
 if(!types.includes(b.document_type)||!text(b.application_id,36)||!['application/pdf','image/jpeg','image/png'].includes(b.content_type)||!Number.isSafeInteger(b.size_bytes)||b.size_bytes<1||b.size_bytes>10485760)return reply(res,422,{error:'invalid_document_metadata'});
 try{
  const user=await userFromRequest(req);
  await ownedApplication(b.application_id,user.id);
  // Security boundary: no self-serve upload URL until malware scan, private storage and data retention are actually configured.
  // Store the intent for audit only; do not return an insecure public upload target.
  const id=randomUUID();
  await dbQuery('documents',{}, {method:'POST',body:{id,tenant:TENANT,application_id:b.application_id,user_id:user.id,document_type:b.document_type,content_type:b.content_type,size_bytes:b.size_bytes,scan_status:'PENDING_UPLOAD',review_status:'PENDING'}});
  reply(res,202,{document_id:id,status:'PENDING_SECURE_STORAGE_PROVIDER',upload_url:null,message:'Your document has not been uploaded. A private signed-upload adapter and malware scanner are required.'});
 }catch(e){error(res,e);}
}
