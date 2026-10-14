(()=>{'use strict';
 const byId=id=>document.getElementById(id),money=c=>'$'+(c/100).toFixed(2);
 let estimate=null,plan=null;
 function display(q){
  estimate=q;const p=q.days+' × ';
  byId('rent-label').textContent='Rental · '+p+'$59.00';
  byId('insurance-label').textContent='Proposed insurance · '+p+'$9.50 (unbound)';
  byId('rent-val').textContent=money(q.rental_cents);
  byId('insurance-val').textContent=money(q.insurance_cents);
  byId('fee-val').textContent=money(q.extension_fee_cents);
  byId('tax-val').textContent=money(q.state_rental_tax_cents)+' ('+q.tax_rate_label+' provisional)';
  byId('deposit-val').textContent=money(q.refundable_deposit_cents);
  byId('total-val').textContent=money(q.total_due_cents);
 }
 function register(payload){
  plan=payload;
  const gates=byId('gates');gates.replaceChildren();
  for(const [label,requirements] of Object.entries(payload.evidence_gates||{})){
   const card=document.createElement('div');card.className='gate';
   const heading=document.createElement('b');heading.textContent=label.replaceAll('_',' ').toUpperCase();
   const details=document.createElement('small');details.textContent=requirements.join(' · ').replaceAll('_',' ');
   const state=document.createElement('em');state.textContent='NOT VERIFIED';
   card.append(heading,details,document.createElement('br'),state);gates.append(card);
  }
  const tasks=byId('triggers');tasks.replaceChildren();
  for(const [trigger,steps] of Object.entries(payload.triggers||{})){
   const li=document.createElement('li');
   const strong=document.createElement('strong');strong.textContent=trigger+' → ';
   const note=document.createElement('span');note.textContent=steps.join(', ').replaceAll('_',' ');
   li.append(strong,note);tasks.append(li);
  }
 }
 async function invoke(path,options){
  const r=await fetch(path,{cache:'no-store',headers:{Accept:'application/json',...(options?.body?{'Content-Type':'application/json'}:{})},...options});
  const d=await r.json();if(!r.ok)throw Error(d.error||'request_failed');return d;
 }
 function validateDates(){
  const a=byId('begin').value,b=byId('finish').value;
  if(a&&b&&Date.parse(b)<=Date.parse(a))throw Error('Return must be later than proposed start.');
  if(Boolean(a)!==Boolean(b))throw Error('Enter both timestamps or leave both empty.');
 }
 async function preview(){
  const days=Number(byId('days').value);
  if(!Number.isSafeInteger(days)||days<1||days>180)throw Error('Choose 1–180 whole days.');
  validateDates();
  const result=await invoke('/api/v1/quote?mode=extension',{method:'POST',body:JSON.stringify({action:'preview',days})});
  display(result.estimate);
  byId('status').textContent='Preview recalculated. No invoice or extension was activated; dates, tax, and insurance remain subject to independent approval.';
 }
 byId('extension-form').addEventListener('submit',async e=>{
  e.preventDefault();byId('status').textContent='Validating proposal…';
  try{await preview();}catch(err){byId('status').textContent='Unable to preview: '+err.message;}
 });
 async function copyText(value,target){
  try{if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
   await navigator.clipboard.writeText(value);target.textContent='Copied for staff review (not an issued invoice).';
  }catch{target.textContent='Clipboard unavailable in this browser.';}
 }
 byId('copy').addEventListener('click',()=>{
  if(!estimate)return;
  const q=estimate;const note='R-RENT PROVISIONAL TRAILBLAZER EXTENSION / '+q.days+' days | Rental '+money(q.rental_cents)+' | Insurance (UNBOUND) '+money(q.insurance_cents)+' | Extension '+money(q.extension_fee_cents)+' | Provisional Texas tax '+money(q.state_rental_tax_cents)+' | Refundable deposit '+money(q.refundable_deposit_cents)+' | TOTAL '+money(q.total_due_cents)+'. $1000 fob replacement is conditional and NOT included. Not a paid invoice or rental activation.';
  copyText(note,byId('status'));
 });
 byId('copy-tasks').addEventListener('click',()=>{
  if(!plan)return;
  const text=Object.entries(plan.triggers||{}).map(([event,tasks])=>event+' => '+tasks.join('; ')).join('\n');
  copyText(text,byId('copy-result'));
 });
 invoke('/api/v1/quote?mode=extension').then(data=>{
  display(data.estimate);register(data);
  byId('status').textContent='Pricing API online · Preview only · Production acceptance, payment, key and release actions locked.';
 }).catch(e=>{byId('status').textContent='Read-only API unavailable: '+e.message+'; transactions remain blocked.';});
})();