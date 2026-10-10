(function(){
'use strict';
const money=cents=>'$'+(cents/100).toFixed(2);
document.addEventListener('submit',async function(ev){
 const f=ev.target;
 if(!f||f.id!=='quote-form')return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const pick=document.getElementById('vehicle').value;
 const start=document.getElementById('start').value;
 const end=document.getElementById('end').value;
 const selected=document.getElementById('insurance-selected').checked;
 const status=document.getElementById('quote-msg');
 const copy=document.getElementById('copyquote');copy.disabled=true;
 const toISO=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString();};
 const pickup=toISO(start),ret=toISO(end);
 if(!pickup||!ret){status.textContent='Choose valid pickup and return dates/times.';return;}
 const fields=['duration','subtotal','tax','insurance-total','total'];
 fields.forEach(id=>document.getElementById(id).textContent='—');
 status.textContent='Calculating server-side preliminary quote…';
 try {
  const response=await fetch('/api/v1/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehicle_id:pick==='trail'?'trailblazer-2026':'bronco-sport-big-bend-2026',pickup_at:pickup,return_at:ret,insurance_selected:selected})});
  const payload=await response.json();if(!response.ok)throw Error((payload.error||'quote_unavailable').replaceAll('_',' '));
  const q=payload.quote;
  document.getElementById('duration').textContent=q.days+' billed day'+(q.days===1?'':'s');
  document.getElementById('subtotal').textContent=money(q.base_rental_cents);
  document.getElementById('tax').textContent=money(q.provisional_state_tax_cents)+' ('+q.state_tax_rate+' tentative)';
  document.getElementById('insurance-total').textContent=q.insurance_selected?money(q.optional_insurance_estimate_cents)+' (unbound)': '$0.00 (not selected)';
  document.getElementById('total').textContent=money(q.provisional_subtotal_cents);
  status.textContent='Preliminary estimate ready. No insurance has been activated, no vehicle reserved, and no payment taken. Final taxes, deposits, and terms require review.';
  const statement='R-Rent estimate (not a booking) — '+q.vehicle_name+'; '+q.days+' days; base '+money(q.base_rental_cents)+'; provisional state tax '+money(q.provisional_state_tax_cents)+'; proposed optional protection '+money(q.optional_insurance_estimate_cents)+' (NOT bound); preliminary total '+money(q.provisional_subtotal_cents)+'. Other local taxes and charges excluded. No payment.';
  copy.disabled=false;
  copy.onclick=()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(statement).then(()=>status.textContent='Preliminary quote copied. No booking or insurance coverage confirmed.').catch(()=>status.textContent=statement);else status.textContent=statement;};
 }catch(e){status.textContent='Estimate unavailable: '+e.message+'. No reservation or payment was created.';}
},true);
})();