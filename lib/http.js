import { randomUUID } from 'node:crypto';

export function reply(res, status, data, extra={}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  for (const [k,v] of Object.entries(extra)) res.setHeader(k,v);
  res.end(JSON.stringify({ ...data, request_id: randomUUID() }));
}
export function method(req,res,allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader('Allow',allowed.join(', '));
    reply(res,405,{error:'method_not_allowed'});return false;
  } return true;
}
export function failClosed(res,code='integration_not_ready',message='This protected operation is not enabled.') {
  reply(res,503,{error:code,message,action:'Contact the rental division; do not submit identity documents or payment details here.'});
}
export function enabled(name) {return process.env[name]==='true';}
export function safeBody(req) {
  let body=req.body;
  if (typeof body==='string') {try{body=JSON.parse(body);}catch{return null;}}
  if (!body||typeof body!=='object'||Array.isArray(body)) return null;
  return body;
}
export function requireJSON(req,res) {
  const t=String(req.headers['content-type']||'');
  if (!t.includes('application/json')){reply(res,415,{error:'json_required'});return null;}
  const b=safeBody(req);
  if (!b){reply(res,400,{error:'invalid_json'});return null;}
  return b;
}
export function getOrigin(req) {
  const o=req.headers.origin;
  return typeof o==='string'?o:'';
}
export function enforceOrigin(req,res) {
  const origin=getOrigin(req);
  const expected=process.env.RR_ALLOWED_ORIGIN||'https://rtpscrentalcars.com';
  if (origin && origin!==expected && origin!=='https://www.rtpscrentalcars.com') {
    reply(res,403,{error:'cross_origin_forbidden'});return false;
  }
  return true;
}
export function text(value,max=100){
  return typeof value==='string'&&value.trim()&&value.length<=max?value.trim():null;
}
export async function rawRequest(req,max=1024*1024){
  const chunks=[];let total=0;
  for await (const chunk of req){total+=chunk.length;if(total>max)throw new Error('payload_too_large');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
export function error(res,e) {
  const code=e?.code==='auth'?'unauthorized':e?.code==='forbidden'?'forbidden':'service_error';
  const status=code==='unauthorized'?401:code==='forbidden'?403:500;
  reply(res,status,{error:code,message:'The request could not be completed.'});
}
