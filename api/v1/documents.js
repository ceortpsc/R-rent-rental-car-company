import {randomUUID} from 'node:crypto';
import {method,reply,requireJSON,enforceOrigin,failClosed,enabled,error,text} from '../../lib/http.js';
import {dbReady,userFromRequest,ownedApplication,dbQuery,TENANT} from '../../lib/identity.js';
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;if(!enforceOrigin(req,res))return;
 if(!dbReady()||!enabled('RR_ENABLE_SECURE_UPLOADS'))return failClosed(res,'document_upload_unavailable');
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
