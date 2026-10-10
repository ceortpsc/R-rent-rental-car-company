import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
const ALGORITHM="aes-256-gcm";
const IV_BYTES=12,TAG_BYTES=16;
export const RESTRICTED_FIELDS=Object.freeze(["driver_license","license_number","date_of_birth","identity_document","insurance_policy","insurance_declarations","bank_account","signed_contract","signature_image","government_identifier","incident_evidence","envelope_recipients","support_case_description"]);
function isValidContext(ctx){return ctx&&typeof ctx.tenant==="string"&&/^[a-z0-9][a-z0-9_-]{2,100}$/i.test(ctx.tenant)&&typeof ctx.recordId==="string"&&/^[a-zA-Z0-9_-]{6,128}$/.test(ctx.recordId)&&RESTRICTED_FIELDS.includes(ctx.field);}
function requiredKey(keyValue){
 if(typeof keyValue!=="string"||!/^([A-Za-z0-9+/]{43}=|[A-Za-z0-9_-]{43})$/.test(keyValue))throw new Error("encryption_key_configuration_invalid");
 const normalized=keyValue.replace(/-/g,"+").replace(/_/g,"/");
 const bytes=Buffer.from(normalized,"base64");
 if(bytes.length!==32||bytes.toString("base64").replace(/=+$/,"")!==normalized.replace(/=+$/,""))throw new Error("encryption_key_configuration_invalid");
 return bytes;
}
function keyring(){
 const id=process.env.RR_ENCRYPTION_KEY_ID;
 if(!id||!/^v[0-9]{1,6}$/.test(id))throw new Error("encryption_key_id_missing");
 return {id,key:requiredKey(process.env.RR_ENCRYPTION_KEY_B64)};
}
function aad(ctx){return Buffer.from(JSON.stringify(["rr-v1",ctx.tenant,ctx.recordId,ctx.field]),"utf8");}
function assertCtx(ctx){if(!isValidContext(ctx))throw new Error("encryption_context_invalid");}
export function encryptionReady(){
 try{keyring();return true;}catch{return false;}
}
export function encryptRestricted(plaintext,ctx){
 assertCtx(ctx);
 if(typeof plaintext!=="string"||!plaintext.length||Buffer.byteLength(plaintext,"utf8")>1024*1024)throw new Error("encryption_payload_invalid");
 const {id,key}=keyring(),iv=randomBytes(IV_BYTES);
 const cipher=createCipheriv(ALGORITHM,key,iv,{authTagLength:TAG_BYTES});
 cipher.setAAD(aad(ctx));
 const ciphertext=Buffer.concat([cipher.update(plaintext,"utf8"),cipher.final()]);
 return Object.freeze({v:1,alg:"A256GCM",kid:id,iv:iv.toString("base64"),ct:ciphertext.toString("base64"),tag:cipher.getAuthTag().toString("base64")});
}
export function decryptRestricted(record,ctx){
 assertCtx(ctx);
 const {id,key}=keyring();
 if(!record||record.v!==1||record.alg!=="A256GCM"||record.kid!==id)throw new Error("encryption_key_version_mismatch");
 const iv=Buffer.from(record.iv||"","base64"),tag=Buffer.from(record.tag||"","base64"),ct=Buffer.from(record.ct||"","base64");
 if(iv.length!==IV_BYTES||tag.length!==TAG_BYTES||ct.length<1||ct.length>1024*1024)throw new Error("encrypted_record_invalid");
 try{
  const decipher=createDecipheriv(ALGORITHM,key,iv,{authTagLength:TAG_BYTES});
  decipher.setAAD(aad(ctx));decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct),decipher.final()]).toString("utf8");
 }catch{throw new Error("ciphertext_authentication_failed");}
}
export function redacted(value){return value==null?null:"[REDACTED]";}
export function safeAuditMetadata(obj){
 const out={};
 for(const [key,value] of Object.entries(obj||{})){
  if(/license|social|ssn|policy|signature|authorization|secret|token|card|password|dob|birth|email|address|ip|raw|payload|image/i.test(key))out[key]="[REDACTED]";
  else if(value===null||["number","boolean"].includes(typeof value))out[key]=value;
  else if(typeof value==="string")out[key]=value.slice(0,120);
 }
 return out;
}
