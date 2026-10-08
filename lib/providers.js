import {createHmac,timingSafeEqual} from 'node:crypto';
export function stripeSignatureValid(raw,header,secret){
 if(!secret||!header||!Buffer.isBuffer(raw))return false;
 const pieces=Object.fromEntries(header.split(',').map(x=>x.split('=',2)));
 const ts=Number(pieces.t);
 if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return false;
 const expected=createHmac('sha256',secret).update(String(ts)+'.').update(raw).digest('hex');
 const ours=Buffer.from(expected,'hex');const theirs=Buffer.from(pieces.v1||'','hex');
 return ours.length===theirs.length&&timingSafeEqual(ours,theirs);
}
export function payPalBase(){return process.env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
export async function payPalToken(){
 if(!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)throw new Error('paypal_not_configured');
 const cred=Buffer.from(process.env.PAYPAL_CLIENT_ID+':'+process.env.PAYPAL_CLIENT_SECRET).toString('base64');
 const r=await fetch(payPalBase()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+cred,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error('paypal_auth_failed');return (await r.json()).access_token;
}
export async function payPalWebhookValid(req,raw){
 if(!process.env.PAYPAL_WEBHOOK_ID)return false;
 const token=await payPalToken();const data={
 auth_algo:req.headers['paypal-auth-algo'],
 cert_url:req.headers['paypal-cert-url'],
 transmission_id:req.headers['paypal-transmission-id'],
 transmission_sig:req.headers['paypal-transmission-sig'],
 transmission_time:req.headers['paypal-transmission-time'],
 webhook_id:process.env.PAYPAL_WEBHOOK_ID,
 webhook_event:JSON.parse(raw.toString('utf8'))
 };
 if(!Object.values(data).every(Boolean))return false;
 const r=await fetch(payPalBase()+'/v1/notifications/verify-webhook-signature',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});
 if(!r.ok)return false;
 return (await r.json()).verification_status==='SUCCESS';
}
export async function stripeCheckout(amountCents,appId,origin){
 const p=new URLSearchParams();
 p.set('mode','payment');p.set('success_url',origin+'/portal?checkout=return');p.set('cancel_url',origin+'/book?checkout=cancel');
 p.set('client_reference_id',appId);p.set('line_items[0][quantity]','1');
 p.set('line_items[0][price_data][currency]','usd');p.set('line_items[0][price_data][unit_amount]',String(amountCents));
 p.set('line_items[0][price_data][product_data][name]','R-Rent vehicle rental');
 p.set('payment_method_types[0]','card');p.set('payment_intent_data[metadata][application_id]',appId);
 const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'rrent-'+appId+'-'+amountCents},body:p.toString(),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('stripe_provider_error');return await r.json();
}
