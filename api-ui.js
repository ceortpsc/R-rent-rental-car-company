(function(){
'use strict';
function dollars(n){return '$'+(n/100).toFixed(2);}
document.addEventListener('submit',async function(ev){
 const f=ev.target;
 if(!f||f.id!=='quote-form')return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const vehicle=document.getElementById('vehicle').value;
 const pickup=document.getElementById('start').value;
 const end=document.getElementById('end').value;
 const msg=document.getElementById('quote-msg');
 const copy=document.getElementById('copyquote');
 if(copy)copy.disabled=true;
 const id=vehicle==='trail'?'trailblazer-2026':'bronco-sport-big-bend-2026';
 // datetime-local has no zone; RFC3339 with offset is required for server calculation.
 const toISO=v=>{const date=new Date(v);return Number.isNaN(date.getTime())?null:date.toISOString();};
 if(!pickup||!end||!toISO(pickup)||!toISO(end)){msg.textContent='Select valid pickup and return times.';return;}
 msg.textContent='Calculating server-side reference estimate…';
 try{
  const response=await fetch('/api/v1/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehicle_id:id,pickup_at:toISO(pickup),return_at:toISO(end)})});
  const payload=await response.json();
  if(!response.ok)throw new Error((payload.error||'Estimate not available').replaceAll('_',' '));
  const q=payload.quote;
  document.getElementById('duration').textContent=q.days+' billed day'+(q.days===1?'':'s');
  document.getElementById('subtotal').textContent=dollars(q.base_rental_cents);
  document.getElementById('tax').textContent=dollars(q.provisional_state_tax_cents)+' ('+q.state_tax_rate+')';
  document.getElementById('total').textContent=dollars(q.provisional_subtotal_cents);
  msg.textContent='Server estimate ready. Insurance, local taxes and any extras remain unpriced. No vehicle is reserved.';
  if(copy){copy.disabled=false;copy.onclick=function(){const value='R-Rent preliminary '+q.days+'-day rental estimate '+dollars(q.provisional_subtotal_cents)+'. Excludes insurance, local taxes and extras. Not a booking.';if(navigator.clipboard)navigator.clipboard.writeText(value).catch(()=>{msg.textContent=value;});else msg.textContent=value;};}
 }catch(err){
  for(const id of ['duration','subtotal','tax','total'])document.getElementById(id).textContent='—';
  msg.textContent='Estimate unavailable: '+err.message+'. No reservation or payment was made.';
 }
},true);
})();
